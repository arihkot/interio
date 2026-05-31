from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
from functools import lru_cache

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
                "World Bank feed unavailable; showing locally adjusted baseline prices."
            )
        return baseline, notes

    def _fetch_world_bank_multiplier(self) -> tuple[float, str]:
        cpi_ratio = self._ratio_from_index(country="IND", indicator="FP.CPI.TOTL")
        gdp_deflator_ratio = self._ratio_from_percent(
            country="IND", indicator="NY.GDP.DEFL.KD.ZG"
        )
        industry_growth_ratio = self._ratio_from_percent(
            country="IND", indicator="NV.IND.TOTL.KD.ZG"
        )

        weighted: list[tuple[float, float]] = []
        if cpi_ratio is not None:
            weighted.append((cpi_ratio, 0.45))
        if gdp_deflator_ratio is not None:
            weighted.append((gdp_deflator_ratio, 0.35))
        if industry_growth_ratio is not None:
            weighted.append((industry_growth_ratio, 0.20))

        if not weighted:
            raise ValueError("No usable World Bank indicators returned")

        total_weight = sum(weight for _, weight in weighted)
        blended_ratio = sum(value * weight for value, weight in weighted) / total_weight
        multiplier = max(0.85, min(1.25, blended_ratio))
        return (
            multiplier,
            (
                f"World Bank proxy applied with multiplier {multiplier:.3f} "
                "(India CPI + GDP deflator + industry growth blend)."
            ),
        )

    def _ratio_from_index(self, country: str, indicator: str) -> Optional[float]:
        series = self._do_fetch_world_bank_series(country, indicator, self.settings.world_bank_base_url, self.settings.world_bank_timeout_sec)
        if not series:
            return None
        found: list[float] = []
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
        latest, previous = found[0], found[1]
        if previous == 0:
            return None
        return latest / previous

    def _ratio_from_percent(self, country: str, indicator: str) -> Optional[float]:
        series = self._do_fetch_world_bank_series(country, indicator, self.settings.world_bank_base_url, self.settings.world_bank_timeout_sec)
        if not series:
            return None
        for point in series:
            value = point.get("value")
            if value is None:
                continue
            try:
                pct = float(value)
            except Exception:
                continue
            return max(0.75, min(1.35, 1.0 + pct / 100.0))
        return None

    @lru_cache(maxsize=32)
    def _do_fetch_world_bank_series(
        self, country: str, indicator: str, base_url: str, timeout: int
    ) -> tuple[dict[str, Any], ...]:
        # Return tuple of dicts to ensure hashability and prevent mutability issues, though requests.json() returns list.
        endpoint = f"{base_url}/country/{country}/indicator/{indicator}"
        response = requests.get(
            endpoint,
            params={"format": "json", "per_page": 10},
            timeout=timeout,
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, list) or len(payload) < 2:
            return tuple()
        data = payload[1]
        if not isinstance(data, list):
            return tuple()
        return tuple(data)

    def _fetch_world_bank_series(
        self, country: str, indicator: str
    ) -> list[dict[str, Any]]:
        # For backwards compatibility if called elsewhere
        return list(self._do_fetch_world_bank_series(country, indicator, self.settings.world_bank_base_url, self.settings.world_bank_timeout_sec))

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
                            "source": "world_bank_macro_proxy",
                            "source_type": "proxy",
                            "confidence": max(point.confidence, 0.78),
                            "timestamp": datetime.now(timezone.utc),
                        }
                    )
                )
            else:
                adjusted.append(point)
        return adjusted
