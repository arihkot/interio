from __future__ import annotations

import json
from math import sqrt
from pathlib import Path
from uuid import uuid4

from app.models import (
    ElementRecommendation,
    FloorPlan2D,
    FloorSlab3D,
    InteriorAsset3D,
    Model3D,
    Point3D,
    RoomLabel3D,
    Wall3D,
)


class ModelService:
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def build_models(
        self,
        plan: FloorPlan2D,
        recommendations: list[ElementRecommendation],
        floor_height_m: float = 3.0,
    ) -> tuple[Model3D, Model3D, Model3D, Model3D]:
        rec_map = {rec.element_id: rec for rec in recommendations}

        primary_simple = Model3D(
            id=f"model-{uuid4().hex[:10]}",
            detail_level="simple",
            recommendation_variant="primary",
            walls=self._walls_to_3d(plan, rec_map, floor_height_m, variant="primary"),
            slab=self._slab(plan, rec_map, variant="primary"),
            interiors=[],
            labels=self._room_labels(plan),
        )
        primary_interior = primary_simple.model_copy(
            update={
                "id": f"model-{uuid4().hex[:10]}",
                "detail_level": "interior",
                "interiors": self._interior_assets(plan),
                "labels": self._room_labels(plan),
            }
        )

        alternative_simple = Model3D(
            id=f"model-{uuid4().hex[:10]}",
            detail_level="simple",
            recommendation_variant="alternative",
            walls=self._walls_to_3d(
                plan, rec_map, floor_height_m, variant="alternative"
            ),
            slab=self._slab(plan, rec_map, variant="alternative"),
            interiors=[],
            labels=self._room_labels(plan),
        )
        alternative_interior = alternative_simple.model_copy(
            update={
                "id": f"model-{uuid4().hex[:10]}",
                "detail_level": "interior",
                "interiors": self._interior_assets(plan),
                "labels": self._room_labels(plan),
            }
        )

        return (
            primary_simple,
            primary_interior,
            alternative_simple,
            alternative_interior,
        )

    def export_model_json(self, model: Model3D, suffix: str) -> Path:
        path = self.output_dir / f"{model.id}-{suffix}.json"
        path.write_text(
            json.dumps(model.model_dump(mode="json"), indent=2), encoding="utf-8"
        )
        return path

    def export_model_obj(self, model: Model3D, suffix: str) -> Path:
        path = self.output_dir / f"{model.id}-{suffix}.obj"
        lines: list[str] = ["# Interio OBJ export"]
        vertices: list[tuple[float, float, float]] = []
        faces: list[tuple[int, int, int]] = []

        def add_box(
            x1: float,
            z1: float,
            x2: float,
            z2: float,
            height: float,
            thickness: float,
            base_y: float = 0.0,
        ) -> None:
            dx = x2 - x1
            dz = z2 - z1
            length = sqrt(dx * dx + dz * dz)
            if length < 1e-6:
                return
            ux, uz = dx / length, dz / length
            nx, nz = -uz, ux
            half = thickness * 0.5

            p1 = (x1 + nx * half, base_y, z1 + nz * half)
            p2 = (x1 - nx * half, base_y, z1 - nz * half)
            p3 = (x2 - nx * half, base_y, z2 - nz * half)
            p4 = (x2 + nx * half, base_y, z2 + nz * half)
            p5 = (p1[0], base_y + height, p1[2])
            p6 = (p2[0], base_y + height, p2[2])
            p7 = (p3[0], base_y + height, p3[2])
            p8 = (p4[0], base_y + height, p4[2])

            start = len(vertices) + 1
            vertices.extend([p1, p2, p3, p4, p5, p6, p7, p8])
            quads = [
                (start, start + 1, start + 2, start + 3),
                (start + 4, start + 5, start + 6, start + 7),
                (start, start + 1, start + 5, start + 4),
                (start + 1, start + 2, start + 6, start + 5),
                (start + 2, start + 3, start + 7, start + 6),
                (start + 3, start, start + 4, start + 7),
            ]
            for a, b, c, d in quads:
                faces.append((a, b, c))
                faces.append((a, c, d))

        for wall in model.walls:
            add_box(
                wall.start.x,
                wall.start.z,
                wall.end.x,
                wall.end.z,
                wall.height_m,
                wall.thickness_m,
            )

        if len(model.slab.boundary) >= 3:
            start = len(vertices) + 1
            for point in model.slab.boundary:
                vertices.append((point.x, 0.0, point.z))
            for idx in range(1, len(model.slab.boundary) - 1):
                faces.append((start, start + idx, start + idx + 1))

        for asset in model.interiors:
            add_box(
                asset.position.x - asset.size.x * 0.5,
                asset.position.z - asset.size.z * 0.5,
                asset.position.x + asset.size.x * 0.5,
                asset.position.z + asset.size.z * 0.5,
                asset.size.y,
                max(0.12, min(asset.size.x, asset.size.z)),
            )

        for x, y, z in vertices:
            lines.append(f"v {x:.6f} {y:.6f} {z:.6f}")
        for a, b, c in faces:
            lines.append(f"f {a} {b} {c}")

        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return path

    @staticmethod
    def _walls_to_3d(
        plan: FloorPlan2D,
        rec_map: dict[str, ElementRecommendation],
        floor_height_m: float,
        variant: str,
    ) -> list[Wall3D]:
        walls_3d: list[Wall3D] = []
        for wall in plan.walls:
            rec = rec_map.get(wall.id)
            if rec is None:
                continue
            option = rec.options[0]
            if variant == "alternative" and len(rec.options) > 1:
                option = rec.options[1]
            walls_3d.append(
                Wall3D(
                    id=f"3D-{wall.id}",
                    source_wall_id=wall.id,
                    start=Point3D(x=wall.start.x, y=0.0, z=wall.start.y),
                    end=Point3D(x=wall.end.x, y=0.0, z=wall.end.y),
                    height_m=floor_height_m,
                    thickness_m=wall.thickness_m,
                    material_key=option.material_key,
                    color=option.color,
                )
            )
        return walls_3d

    @staticmethod
    def _slab(
        plan: FloorPlan2D,
        rec_map: dict[str, ElementRecommendation],
        variant: str,
    ) -> FloorSlab3D:
        slab_rec = rec_map.get("slab-main")
        if slab_rec is None:
            color = "#808080"
            material_key = "rcc_m25"
        else:
            option = slab_rec.options[0]
            if variant == "alternative" and len(slab_rec.options) > 1:
                option = slab_rec.options[1]
            color = option.color
            material_key = option.material_key
        boundary = (
            [Point3D(x=p.x, y=0.0, z=p.y) for p in plan.boundary]
            if plan.boundary
            else []
        )
        return FloorSlab3D(
            id="SLAB-1",
            boundary=boundary,
            thickness_m=0.15,
            material_key=material_key,
            color=color,
        )

    @staticmethod
    def _interior_assets(plan: FloorPlan2D) -> list[InteriorAsset3D]:
        assets: list[InteriorAsset3D] = []
        asset_urls = {
            "kitchen_counter": "https://storage.googleapis.com/interio-assets/kitchen-counter.glb",
            "queen_bed": "https://storage.googleapis.com/interio-assets/queen-bed.glb",
            "toilet_and_vanity": "https://storage.googleapis.com/interio-assets/toilet-vanity.glb",
            "console_table": "https://storage.googleapis.com/interio-assets/console-table.glb",
            "sofa_set": "https://storage.googleapis.com/interio-assets/sofa-set.glb",
        }
        for room in plan.rooms:
            lname = room.name.lower()
            asset_type = "sofa_set"
            size = Point3D(x=1.8, y=0.9, z=0.8)
            if "kitchen" in lname:
                asset_type = "kitchen_counter"
                size = Point3D(x=2.2, y=0.9, z=0.7)
            elif "bedroom" in lname:
                asset_type = "queen_bed"
                size = Point3D(x=2.0, y=0.8, z=1.6)
            elif "bath" in lname or "toilet" in lname:
                asset_type = "toilet_and_vanity"
                size = Point3D(x=1.1, y=0.8, z=1.4)
            elif "foyer" in lname:
                asset_type = "console_table"
                size = Point3D(x=1.4, y=0.8, z=0.5)
            assets.append(
                InteriorAsset3D(
                    id=f"asset-{room.id}",
                    room_id=room.id,
                    room_name=room.name,
                    asset_type=asset_type,
                    asset_url=asset_urls.get(asset_type),
                    position=Point3D(x=room.centroid.x, y=0.0, z=room.centroid.y),
                    size=size,
                    rotation_deg=0.0,
                )
            )
        return assets

    @staticmethod
    def _room_labels(plan: FloorPlan2D) -> list[RoomLabel3D]:
        labels: list[RoomLabel3D] = []
        for room in plan.rooms:
            labels.append(
                RoomLabel3D(
                    id=f"label-{room.id}",
                    room_id=room.id,
                    text=room.name,
                    position=Point3D(x=room.centroid.x, y=2.25, z=room.centroid.y),
                    confidence=room.confidence,
                    source=room.name_source,
                )
            )
        return labels
