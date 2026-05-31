from __future__ import annotations

import requests
from functools import lru_cache
from typing import Optional

from app.core.config import Settings
from app.models import LocationContext, WeatherContext


class WeatherService:
    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings

    @staticmethod
    def estimate_climate_zone(location: LocationContext) -> str:
        lat = location.latitude
        if 8 <= lat < 16:
            return "warm_humid"
        if 16 <= lat < 28:
            return "composite"
        if lat >= 28:
            return "cold"
        return "hot_dry"

    @lru_cache(maxsize=128)
    def _do_fetch_live(self, lat: float, lon: float, api_key: str) -> dict:
        query = f"{lat},{lon}"
        response = requests.get(
            "https://api.weatherapi.com/v1/current.json",
            params={"key": api_key, "q": query, "aqi": "no"},
            timeout=6,
        )
        response.raise_for_status()
        return response.json()

    def fetch_weather(self, location: LocationContext) -> WeatherContext:
        if self.settings and self.settings.weather_api_key:
            live = self._fetch_live_weather(location)
            if live is not None:
                return live

        climate_zone = self.estimate_climate_zone(location)
        defaults = {
            "warm_humid": (31.0, 76.0, 8.0),
            "composite": (30.0, 58.0, 3.0),
            "cold": (19.0, 48.0, 2.0),
            "hot_dry": (34.0, 35.0, 1.0),
        }
        temp, humidity, rain = defaults[climate_zone]
        return WeatherContext(
            latitude=location.latitude,
            longitude=location.longitude,
            city=location.city,
            state=location.state,
            climate_zone=climate_zone,
            temperature_c=temp,
            humidity_pct=humidity,
            precipitation_mm=rain,
            source="imputed",
        )

    def _fetch_live_weather(
        self, location: LocationContext
    ) -> Optional[WeatherContext]:
        if not self.settings or not self.settings.weather_api_key:
            return None
        try:
            # Round to 2 decimal places to increase cache hits for nearby locations (~1.1km precision)
            lat_round = round(location.latitude, 2)
            lon_round = round(location.longitude, 2)
            data = self._do_fetch_live(lat_round, lon_round, self.settings.weather_api_key)
            
            current = data.get("current", {})
            loc = data.get("location", {})
            climate_zone = self.estimate_climate_zone(location)
            return WeatherContext(
                latitude=location.latitude,
                longitude=location.longitude,
                city=location.city or loc.get("name"),
                state=location.state or loc.get("region"),
                climate_zone=climate_zone,
                temperature_c=float(current.get("temp_c", 30.0)),
                humidity_pct=float(current.get("humidity", 55.0)),
                precipitation_mm=float(current.get("precip_mm", 0.0)),
                source="weatherapi",
            )
        except Exception:
            return None
