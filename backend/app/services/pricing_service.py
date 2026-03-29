from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

import requests

from app.core.config import Settings
from app.models import LocationContext, PricePoint, WeatherContext
from app.services.material_service import MaterialService


class PricingService:
    def __init__(self, settings: Settings, material_service: MaterialService):
        self.settings = settings
        self.material_service = material_service

    def get_pricing_dashboard(
        self,
        location: LocationContext,
        weather: WeatherContext,
    ) -> tuple[list[PricePoint], list[str]]:
        baseline = self.material_service.snapshot_prices(location, weather)
        notes: list[str] = [
            "Prices shown in INR with India-context availability and weather adjustments.",
            "Observed/proxy/imputed tags indicate source confidence for each material.",
        ]
        try:
            world_bank_multiplier, wb_note = self._fetch_world_bank_multiplier()
            baseline = self._apply_multiplier(baseline, world_bank_multiplier)
            notes.append(wb_note)
        except Exception:
            notes.append(
                "World Bank commodity feed unavailable; showing locally adjusted baseline prices."
            )
        return baseline, notes

    def _fetch_world_bank_multiplier(self) -> tuple[float, str]:
        steel_latest = self._fetch_world_bank_latest("CM.MKT.STL.WLD")
        steel_prev = self._fetch_world_bank_previous("CM.MKT.STL.WLD")
        cpi_latest = self._fetch_world_bank_latest("FP.CPI.TOTL")
        cpi_prev = self._fetch_world_bank_previous("FP.CPI.TOTL")

        steel_ratio = 1.0
        cpi_ratio = 1.0
        if steel_latest and steel_prev and steel_prev > 0:
            steel_ratio = steel_latest / steel_prev
        if cpi_latest and cpi_prev and cpi_prev > 0:
            cpi_ratio = cpi_latest / cpi_prev

        blended_ratio = steel_ratio * 0.65 + cpi_ratio * 0.35
        multiplier = max(0.85, min(1.25, blended_ratio))
        return (
            multiplier,
            (
                f"World Bank proxy applied with multiplier {multiplier:.3f} "
                "(steel commodity + India CPI blend)."
            ),
        )

    def _fetch_world_bank_latest(self, indicator: str) -> Optional[float]:
        series = self._fetch_world_bank_series(
            "IND" if indicator == "FP.CPI.TOTL" else "WLD", indicator
        )
        if not series:
            return None
        for point in series:
            value = point.get("value")
            if value is None:
                continue
            try:
                return float(value)
            except Exception:
                continue
        return None

    def _fetch_world_bank_previous(self, indicator: str) -> Optional[float]:
        series = self._fetch_world_bank_series(
            "IND" if indicator == "FP.CPI.TOTL" else "WLD", indicator
        )
        if not series:
            return None
        found = []
        for point in series:
            value = point.get("value")
            if value is None:
                continue
            try:
                found.append(float(value))
            except Exception:
                continue
            if len(found) >= 2:
                break
        if len(found) < 2:
            return None
        return found[1]

    def _fetch_world_bank_series(
        self, country: str, indicator: str
    ) -> list[dict[str, Any]]:
        endpoint = f"{self.settings.world_bank_base_url}/country/{country}/indicator/{indicator}"
        response = requests.get(
            endpoint,
            params={"format": "json", "per_page": 10},
            timeout=self.settings.world_bank_timeout_sec,
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, list) or len(payload) < 2:
            return []
        data = payload[1]
        if not isinstance(data, list):
            return []
        return data

    @staticmethod
    def _apply_multiplier(
        prices: list[PricePoint], multiplier: float
    ) -> list[PricePoint]:
        adjusted: list[PricePoint] = []
        for point in prices:
            if point.material_key in {
                "rcc_m25",
                "steel_frame_fe500",
                "red_brick",
                "precast_panel",
            }:
                adjusted_cost = point.unit_cost_inr * multiplier
                adjusted.append(
                    point.model_copy(
                        update={
                            "unit_cost_inr": round(adjusted_cost, 2),
                            "source": "world_bank_commodity_proxy",
                            "source_type": "proxy",
                            "confidence": max(point.confidence, 0.78),
                            "timestamp": datetime.now(timezone.utc),
                        }
                    )
                )
            else:
                adjusted.append(point)
        return adjusted
