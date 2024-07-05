from weather.models import Coordinate, Forecast
from celery import shared_task
import requests
from datetime import datetime
from weather_app.config import CONTACT_EMAIL


@shared_task
def fetch_weather():
    # NOTE: need to change this later to include email; for now, don't want rejection from API
    headers = {"User-Agent": f"WeatherTrackingApp/1.0 ${CONTACT_EMAIL}"}
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
                    icon_url="https://api.weather.gov" + period["icon"],
                )

            # limit_forecast_records(c.pk, 14 * 7)

        except requests.RequestException as e:
            # somehow record error message in backend?
            pass
        # finally:
        #     fetch_weather.request.delivery_info["broker"].ack(
        #         fetch_weather.request.delivery_info["delivery_tag"]
        #     )


def limit_forecast_records(pk, limit):
    count = (
        Forecast.objects.filter(coordinate__pk=pk)
        .order_by("generated_at")
        .order_by("date")
        .count()
    )
    if count > limit:
        excess = count - limit
        old_forecasts = (
            Forecast.objects.filter(coordinate__pk=pk)
            .order_by("generated_at")
            .order_by("date")[:excess]
        )
        old_forecasts.delete()
