from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Optional

from app.models import (
    CostSummary,
    ElementRecommendation,
    ExplainabilityReport,
    LocationContext,
    MaterialOption,
    MaterialSpec,
    PricePoint,
    Room2D,
    StructuralAnalysis,
    Wall2D,
    WeatherContext,
)


class MaterialService:
    def __init__(self, db_path: Path):
        self._materials = self._load_materials(db_path)

    @staticmethod
    def _load_materials(db_path: Path) -> dict[str, MaterialSpec]:
        raw = json.loads(db_path.read_text(encoding="utf-8"))
        return {item["key"]: MaterialSpec.model_validate(item) for item in raw}

    def snapshot_prices(
        self,
        location: LocationContext,
        weather: WeatherContext,
    ) -> list[PricePoint]:
        points: list[PricePoint] = []
        for material in self._materials.values():
            state_score = material.availability_regions.get(
                location.state or "", material.availability_regions.get("default", 0.75)
            )
            climate_score = material.climate_fit.get(weather.climate_zone, 0.8)
            geo_factor = 1 + (1 - state_score) * 0.1 + (1 - climate_score) * 0.05
            unit_cost = material.base_unit_cost_inr * geo_factor
            source_type = "imputed"
            source = "local_baseline_adjusted"
            confidence = 0.62 + 0.2 * state_score
            if material.key in {"rcc_m25", "steel_frame_fe500"}:
                source_type = "proxy"
                source = "wpi_proxy_adjusted"
                confidence = 0.75
            points.append(
                PricePoint(
                    material_key=material.key,
                    unit_cost_inr=round(unit_cost, 2),
                    unit=material.unit,
                    source=source,
                    source_type=source_type,
                    confidence=round(min(confidence, 0.95), 2),
                    timestamp=datetime.now(timezone.utc),
                )
            )
        return points

    @staticmethod
    def _element_weights(element_type: str) -> dict[str, float]:
        if element_type in {"load_bearing_wall", "column", "slab"}:
            return {
                "strength": 0.34,
                "durability": 0.23,
                "weather": 0.16,
                "availability": 0.1,
                "cost": 0.12,
                "maintenance": 0.05,
            }
        return {
            "strength": 0.2,
            "durability": 0.2,
            "weather": 0.15,
            "availability": 0.15,
            "cost": 0.2,
            "maintenance": 0.1,
        }

    def _score_material(
        self,
        material: MaterialSpec,
        unit_cost: float,
        weather: WeatherContext,
        location: LocationContext,
        element_type: str,
    ) -> tuple[float, float, float, float, float]:
        weights = self._element_weights(element_type)
        strength = material.strength_score
        durability_score = min(material.durability_years / 80.0, 1.0)
        weather_fit = material.climate_fit.get(weather.climate_zone, 0.75)
        availability = material.availability_regions.get(
            location.state or "", material.availability_regions.get("default", 0.74)
        )
        cost_score = max(0.0, 1 - unit_cost / 9000.0)
        maintenance_score = max(0.0, 1 - material.maintenance_ratio_annual / 0.03)
        tradeoff = (
            weights["strength"] * strength
            + weights["durability"] * durability_score
            + weights["weather"] * weather_fit
            + weights["availability"] * availability
            + weights["cost"] * cost_score
            + weights["maintenance"] * maintenance_score
        )
        return tradeoff, durability_score, weather_fit, availability, maintenance_score

    @staticmethod
    def _wall_quantity_m3(wall: Wall2D, floor_height_m: float = 3.0) -> float:
        return wall.length_m * wall.thickness_m * floor_height_m

    @staticmethod
    def _slab_quantity_m3(
        rooms: Iterable[Room2D], slab_thickness_m: float = 0.15
    ) -> float:
        area = sum(room.area_m2 for room in rooms)
        return area * slab_thickness_m

    def recommend(
        self,
        walls: list[Wall2D],
        rooms: list[Room2D],
        location: LocationContext,
        weather: WeatherContext,
        structural_analysis: Optional[StructuralAnalysis] = None,
    ) -> tuple[list[ElementRecommendation], list[PricePoint], CostSummary]:
        prices = self.snapshot_prices(location, weather)
        price_map = {p.material_key: p for p in prices}
        recommendations: list[ElementRecommendation] = []
        primary_total = 0.0
        alternative_total = 0.0
        maintenance_total = 0.0
        life_weighted_sum = 0.0
        total_quantity = 0.0

        for wall in walls:
            element_type = (
                "load_bearing_wall" if wall.is_load_bearing else "partition_wall"
            )
            quantity = self._wall_quantity_m3(wall)
            total_quantity += quantity
            candidates = [
                material
                for material in self._materials.values()
                if element_type in material.best_use
                or "general_wall" in material.best_use
            ]
            options = self._build_options(
                candidates, quantity, "m3", element_type, location, weather, price_map
            )
            selected = options[0]
            alternative = options[1] if len(options) > 1 else None
            primary_total += selected.total_cost_inr
            maintenance_total += selected.annual_maintenance_inr
            life_weighted_sum += selected.average_life_years * quantity
            if alternative:
                alternative_total += alternative.total_cost_inr
            recommendations.append(
                ElementRecommendation(
                    element_id=wall.id,
                    element_name=f"Wall {wall.id}",
                    element_type=element_type,
                    quantity=round(quantity, 3),
                    unit="m3",
                    options=options[:3],
                    selected_material_key=selected.material_key,
                    alternative_material_key=alternative.material_key
                    if alternative
                    else None,
                )
            )

        slab_qty = self._slab_quantity_m3(rooms)
        slab_candidates = [
            material
            for material in self._materials.values()
            if "slab" in material.best_use or "structural_wall" in material.best_use
        ]
        slab_options = self._build_options(
            slab_candidates, slab_qty, "m3", "slab", location, weather, price_map
        )
        slab_selected = slab_options[0]
        slab_alternative = slab_options[1] if len(slab_options) > 1 else None
        primary_total += slab_selected.total_cost_inr
        maintenance_total += slab_selected.annual_maintenance_inr
        life_weighted_sum += slab_selected.average_life_years * slab_qty
        total_quantity += slab_qty
        if slab_alternative:
            alternative_total += slab_alternative.total_cost_inr
        recommendations.append(
            ElementRecommendation(
                element_id="slab-main",
                element_name="Floor Slab",
                element_type="slab",
                quantity=round(slab_qty, 3),
                unit="m3",
                options=slab_options[:3],
                selected_material_key=slab_selected.material_key,
                alternative_material_key=slab_alternative.material_key
                if slab_alternative
                else None,
            )
        )

        column_count = self._estimate_column_count(walls, structural_analysis)
        if column_count > 0:
            column_qty = column_count * 0.27
            column_candidates = [
                material
                for material in self._materials.values()
                if "column" in material.best_use or "long_span" in material.best_use
            ]
            column_options = self._build_options(
                column_candidates,
                column_qty,
                "m3",
                "column",
                location,
                weather,
                price_map,
            )
            column_selected = column_options[0]
            column_alternative = column_options[1] if len(column_options) > 1 else None
            primary_total += column_selected.total_cost_inr
            maintenance_total += column_selected.annual_maintenance_inr
            life_weighted_sum += column_selected.average_life_years * column_qty
            total_quantity += column_qty
            if column_alternative:
                alternative_total += column_alternative.total_cost_inr
            recommendations.append(
                ElementRecommendation(
                    element_id="column-main",
                    element_name=f"Structural Columns ({column_count})",
                    element_type="column",
                    quantity=round(column_qty, 3),
                    unit="m3",
                    options=column_options[:3],
                    selected_material_key=column_selected.material_key,
                    alternative_material_key=column_alternative.material_key
                    if column_alternative
                    else None,
                )
            )

        avg_life = life_weighted_sum / total_quantity if total_quantity else 0.0
        lifecycle_cost_30 = primary_total + maintenance_total * 30
        summary = CostSummary(
            primary_total_cost_inr=round(primary_total, 2),
            alternative_total_cost_inr=round(
                alternative_total if alternative_total > 0 else primary_total * 1.04, 2
            ),
            annual_maintenance_inr=round(maintenance_total, 2),
            average_life_years=round(avg_life, 1),
            lifecycle_cost_30y_inr=round(lifecycle_cost_30, 2),
            element_count=len(recommendations),
        )
        return recommendations, prices, summary

    @staticmethod
    def recompute_cost_summary(
        recommendations: list[ElementRecommendation],
    ) -> CostSummary:
        primary_total = 0.0
        alternative_total = 0.0
        maintenance_total = 0.0
        weighted_life = 0.0
        total_qty = 0.0

        for rec in recommendations:
            if not rec.options:
                continue
            primary = rec.options[0]
            primary_total += primary.total_cost_inr
            maintenance_total += primary.annual_maintenance_inr
            weighted_life += primary.average_life_years * primary.quantity
            total_qty += primary.quantity
            alt = rec.options[1] if len(rec.options) > 1 else primary
            alternative_total += alt.total_cost_inr

        avg_life = weighted_life / total_qty if total_qty else 0.0
        lifecycle = primary_total + maintenance_total * 30
        return CostSummary(
            primary_total_cost_inr=round(primary_total, 2),
            alternative_total_cost_inr=round(alternative_total, 2),
            annual_maintenance_inr=round(maintenance_total, 2),
            average_life_years=round(avg_life, 1),
            lifecycle_cost_30y_inr=round(lifecycle, 2),
            element_count=len(recommendations),
        )

    @staticmethod
    def _estimate_column_count(
        walls: list[Wall2D], structural_analysis: Optional[StructuralAnalysis]
    ) -> int:
        if structural_analysis and structural_analysis.nodes:
            degree_map: dict[str, int] = {}
            for edge in structural_analysis.edges:
                degree_map[edge.from_node_id] = degree_map.get(edge.from_node_id, 0) + 1
                degree_map[edge.to_node_id] = degree_map.get(edge.to_node_id, 0) + 1
            major = [node for node, degree in degree_map.items() if degree >= 3]
            if major:
                return max(2, len(major))

        point_count: dict[tuple[float, float], int] = {}
        for wall in walls:
            a = (round(wall.start.x, 2), round(wall.start.y, 2))
            b = (round(wall.end.x, 2), round(wall.end.y, 2))
            point_count[a] = point_count.get(a, 0) + 1
            point_count[b] = point_count.get(b, 0) + 1
        junctions = [p for p, c in point_count.items() if c >= 3]
        return max(2, len(junctions)) if walls else 0

    def _build_options(
        self,
        candidates: list[MaterialSpec],
        quantity: float,
        quantity_unit: str,
        element_type: str,
        location: LocationContext,
        weather: WeatherContext,
        price_map: dict[str, PricePoint],
    ) -> list[MaterialOption]:
        options: list[MaterialOption] = []
        for material in candidates:
            price = price_map[material.key]
            tradeoff, durability_score, weather_fit, availability, _ = (
                self._score_material(
                    material,
                    price.unit_cost_inr,
                    weather,
                    location,
                    element_type,
                )
            )
            total_cost = quantity * price.unit_cost_inr
            annual_maintenance = total_cost * material.maintenance_ratio_annual
            rationale = (
                f"{material.name} balances strength ({material.strength_score:.2f}) and durability "
                f"({material.durability_years:.0f}y) for {element_type.replace('_', ' ')} in {weather.climate_zone} climate."
            )
            options.append(
                MaterialOption(
                    material_key=material.key,
                    material_name=material.name,
                    quantity=round(quantity, 3),
                    quantity_unit=quantity_unit,
                    unit_cost_inr=round(price.unit_cost_inr, 2),
                    total_cost_inr=round(total_cost, 2),
                    annual_maintenance_inr=round(annual_maintenance, 2),
                    average_life_years=round(material.durability_years, 1),
                    strength_score=round(material.strength_score, 3),
                    durability_score=round(durability_score, 3),
                    weather_fit_score=round(weather_fit, 3),
                    availability_score=round(availability, 3),
                    tradeoff_score=round(tradeoff, 4),
                    rationale=rationale,
                    color=material.color,
                    price_source_type=price.source_type,
                )
            )
        options.sort(key=lambda option: option.tradeoff_score, reverse=True)
        return options

    def apply_llm_orchestrated_selection(
        self,
        recommendations: list[ElementRecommendation],
        explainability: ExplainabilityReport,
    ) -> tuple[list[ElementRecommendation], str]:
        text = (
            explainability.executive_summary
            + " "
            + " ".join(explainability.tradeoff_notes)
        ).lower()
        if (
            "life" not in text
            and "durability" not in text
            and "maintenance" not in text
        ):
            return recommendations, "score_engine"

        adjusted: list[ElementRecommendation] = []
        switched = False
        for rec in recommendations:
            if len(rec.options) < 2:
                adjusted.append(rec)
                continue
            primary = rec.options[0]
            alternate = rec.options[1]
            primary_lifecycle = (
                primary.total_cost_inr + primary.annual_maintenance_inr * 30
            )
            alt_lifecycle = (
                alternate.total_cost_inr + alternate.annual_maintenance_inr * 30
            )
            if (
                alt_lifecycle < primary_lifecycle * 0.95
                and alternate.strength_score >= primary.strength_score * 0.92
            ):
                rec_clone = rec.model_copy(deep=True)
                rec_clone.options[0], rec_clone.options[1] = (
                    rec_clone.options[1],
                    rec_clone.options[0],
                )
                rec_clone.selected_material_key = rec_clone.options[0].material_key
                rec_clone.alternative_material_key = rec_clone.options[1].material_key
                adjusted.append(rec_clone)
                switched = True
            else:
                adjusted.append(rec)
        return adjusted, "llm_guided_lifecycle" if switched else "score_engine"
