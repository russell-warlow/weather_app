from weather.models import Coordinate, Forecast
from celery import shared_task
import requests
from datetime import datetime


@shared_task
def fetch_weather():
    headers = {"User-Agent": "hobby weather project"}
    coordinates = Coordinate.objects.all()
    for c in coordinates:
        try:
            api_url = f"https://api.weather.gov/points/{c.latitude},{c.longitude}"
            response = requests.get(api_url, headers=headers)
            data = response.json()

            forecast_url = data["properties"]["forecast"]
            response = requests.get(forecast_url, headers=headers)
            data = response.json()

            generate_time = datetime.fromisoformat(data["properties"]["generatedAt"])
            elev = data["properties"]["elevation"]["value"]
            forecast_periods = data["properties"]["periods"]
            for period in forecast_periods:
                Forecast.objects.create(
                    coordinate=c,
                    generated_at=generate_time,
                    elevation=elev,
                    date=datetime.fromisoformat(period["startTime"]),
                    is_daytime=period["isDaytime"],
                    temperature=period["temperature"],
                    wind_speed=period["windSpeed"],
                    wind_direction=period["windDirection"],
                    precip_chance=period["probabilityOfPrecipitation"]["value"],
                    # relative_humidity=period["relativeHumidity"]["value"],
                    description=period["detailedForecast"],
                )
        except requests.RequestException as e:
            # somehow record error message in backend?
            pass
