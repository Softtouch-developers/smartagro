"""
OpenWeatherMap Integration
Weather forecast service for agricultural planning in Ghana
"""
import logging
import httpx
from typing import Dict, Any, Optional
from datetime import datetime
from functools import lru_cache

from config import settings

logger = logging.getLogger(__name__)

OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"
OPENWEATHER_GEO_URL = "https://api.openweathermap.org/geo/1.0"


async def get_coordinates(location: str) -> Optional[Dict[str, float]]:
    """
    Get latitude/longitude coordinates for a location

    Args:
        location: City name (e.g., "Kumasi, Ghana")

    Returns:
        Dict with lat and lon, or None if not found
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{OPENWEATHER_GEO_URL}/direct",
                params={
                    "q": location,
                    "limit": 1,
                    "appid": settings.OPENWEATHER_API_KEY
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()

            if data:
                return {
                    "lat": data[0]["lat"],
                    "lon": data[0]["lon"],
                    "name": data[0].get("name", location)
                }
            return None

    except Exception as e:
        logger.error(f"Failed to get coordinates for {location}: {e}")
        return None


def get_weather_forecast(location: str, days: int = 3) -> Dict[str, Any]:
    """
    Get weather forecast for a location (synchronous version for agent tools)

    Args:
        location: City/town name (e.g., "Kumasi, Ghana")
        days: Number of days (1-7)

    Returns:
        Weather forecast data
    """
    import asyncio

    # Run async function in sync context
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    return loop.run_until_complete(_get_weather_forecast_async(location, days))


async def _get_weather_forecast_async(location: str, days: int = 3) -> Dict[str, Any]:
    """
    Get weather forecast for a location (async implementation)

    Args:
        location: City/town name (e.g., "Kumasi, Ghana")
        days: Number of days (1-7)

    Returns:
        Weather forecast data formatted for the AI agent
    """
    try:
        # Limit days to valid range
        days = max(1, min(days, 7))

        # Get coordinates first
        coords = await get_coordinates(location)
        if not coords:
            return {
                "error": f"Could not find location: {location}",
                "suggestion": "Try using a major city name like Accra, Kumasi, Tamale, or Takoradi"
            }

        async with httpx.AsyncClient() as client:
            # Use 5-day/3-hour forecast API (free tier)
            response = await client.get(
                f"{OPENWEATHER_BASE_URL}/forecast",
                params={
                    "lat": coords["lat"],
                    "lon": coords["lon"],
                    "appid": settings.OPENWEATHER_API_KEY,
                    "units": "metric"  # Celsius
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()

            # Process forecast data
            forecasts = []
            current_date = None
            daily_data = None

            for item in data.get("list", []):
                dt = datetime.fromtimestamp(item["dt"])
                date_str = dt.strftime("%Y-%m-%d")

                # Limit to requested number of days
                if len(forecasts) >= days:
                    break

                if date_str != current_date:
                    if daily_data:
                        forecasts.append(daily_data)

                    if len(forecasts) >= days:
                        break

                    current_date = date_str
                    daily_data = {
                        "date": date_str,
                        "day_name": dt.strftime("%A"),
                        "temp_min": item["main"]["temp_min"],
                        "temp_max": item["main"]["temp_max"],
                        "humidity": item["main"]["humidity"],
                        "conditions": item["weather"][0]["description"] if item["weather"] else "unknown",
                        "wind_speed_kmh": round(item["wind"]["speed"] * 3.6, 1),  # m/s to km/h
                        "rain_mm": item.get("rain", {}).get("3h", 0),
                        "cloud_cover": item["clouds"]["all"]
                    }
                else:
                    # Update min/max temps
                    if daily_data:
                        daily_data["temp_min"] = min(daily_data["temp_min"], item["main"]["temp_min"])
                        daily_data["temp_max"] = max(daily_data["temp_max"], item["main"]["temp_max"])
                        # Accumulate rain
                        daily_data["rain_mm"] += item.get("rain", {}).get("3h", 0)

            # Add last day if not already added
            if daily_data and len(forecasts) < days:
                forecasts.append(daily_data)

            # Add farming recommendations based on weather
            recommendations = _get_farming_recommendations(forecasts)

            return {
                "location": coords["name"],
                "coordinates": {
                    "lat": coords["lat"],
                    "lon": coords["lon"]
                },
                "forecast_days": len(forecasts),
                "forecasts": forecasts,
                "farming_recommendations": recommendations,
                "units": {
                    "temperature": "Celsius",
                    "wind_speed": "km/h",
                    "rainfall": "mm"
                }
            }

    except httpx.HTTPStatusError as e:
        logger.error(f"Weather API HTTP error: {e}")
        return {"error": f"Weather service error: {e.response.status_code}"}
    except Exception as e:
        logger.error(f"Weather fetch failed for {location}: {e}")
        return {"error": f"Failed to get weather: {str(e)}"}


def _get_farming_recommendations(forecasts: list) -> list:
    """
    Generate farming recommendations based on weather forecast

    Args:
        forecasts: List of daily forecast data

    Returns:
        List of recommendation strings
    """
    recommendations = []

    if not forecasts:
        return recommendations

    # Check for rain in next few days
    total_rain = sum(f.get("rain_mm", 0) for f in forecasts)
    rainy_days = sum(1 for f in forecasts if f.get("rain_mm", 0) > 0)

    if total_rain > 20:
        recommendations.append("Heavy rainfall expected. Delay spraying and fertilizer application.")
        recommendations.append("Check field drainage to prevent waterlogging.")
    elif total_rain > 5:
        recommendations.append("Light to moderate rain expected. Good time for planting if soil is prepared.")
    elif total_rain == 0 and len(forecasts) > 2:
        recommendations.append("No rain expected. Consider irrigation for sensitive crops.")

    # Temperature checks
    max_temps = [f.get("temp_max", 0) for f in forecasts]
    if any(t > 35 for t in max_temps):
        recommendations.append("High temperatures expected. Water crops in early morning or evening.")
        recommendations.append("Consider providing shade for sensitive seedlings.")

    # Wind checks
    max_wind = max(f.get("wind_speed_kmh", 0) for f in forecasts)
    if max_wind > 30:
        recommendations.append("Strong winds expected. Secure nursery structures and young plants.")
        recommendations.append("Avoid spraying as chemicals may drift.")

    # Humidity checks for disease risk
    avg_humidity = sum(f.get("humidity", 0) for f in forecasts) / len(forecasts)
    if avg_humidity > 80:
        recommendations.append("High humidity levels. Monitor crops for fungal diseases.")

    # Favorable conditions
    if 0 < total_rain < 15 and all(25 < t < 33 for t in max_temps):
        recommendations.append("Favorable conditions for most farming activities.")

    return recommendations


# Synchronous wrapper for common Ghana locations
@lru_cache(maxsize=50)
def get_cached_weather(location: str) -> Dict[str, Any]:
    """
    Get cached weather for frequently requested locations
    Cache expires based on LRU policy
    """
    return get_weather_forecast(location, days=3)
