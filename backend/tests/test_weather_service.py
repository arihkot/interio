import pytest
from app.models import LocationContext, WeatherContext
from app.services.weather_service import WeatherService
from app.core.config import Settings

def test_estimate_climate_zone():
    service = WeatherService()
    
    assert service.estimate_climate_zone(LocationContext(latitude=10.0, longitude=76.0)) == "warm_humid"
    assert service.estimate_climate_zone(LocationContext(latitude=20.0, longitude=76.0)) == "composite"
    assert service.estimate_climate_zone(LocationContext(latitude=30.0, longitude=76.0)) == "cold"
    assert service.estimate_climate_zone(LocationContext(latitude=5.0, longitude=76.0)) == "hot_dry"

def test_fetch_weather_fallback():
    # When no API key is provided, it should use fallback defaults based on climate zone
    settings = Settings(weather_api_key="", gemini_api_key="dummy")
    service = WeatherService(settings=settings)
    
    loc = LocationContext(latitude=12.0, longitude=77.0, city="Bengaluru", state="Karnataka")
    weather = service.fetch_weather(loc)
    
    assert weather.climate_zone == "warm_humid"
    assert weather.source == "imputed"
    assert weather.temperature_c == 31.0
    assert weather.humidity_pct == 76.0

def test_fetch_weather_live_mocked(mocker):
    settings = Settings(weather_api_key="mock_key", gemini_api_key="dummy")
    service = WeatherService(settings=settings)
    
    mock_response = {
        "current": {"temp_c": 28.5, "humidity": 60.0, "precip_mm": 5.0},
        "location": {"name": "TestCity", "region": "TestState"}
    }
    mocker.patch.object(service, '_do_fetch_live', return_value=mock_response)
    
    loc = LocationContext(latitude=25.0, longitude=80.0)
    weather = service.fetch_weather(loc)
    
    assert weather.climate_zone == "composite"
    assert weather.source == "weatherapi"
    assert weather.temperature_c == 28.5
    assert weather.humidity_pct == 60.0
    assert weather.city == "TestCity"
    assert weather.state == "TestState"
