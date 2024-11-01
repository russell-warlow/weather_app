from weather.models import Coordinate, Forecast
from celery import shared_task
import requests
from datetime import datetime
from weather_app.config import CONTACT_EMAIL
from urllib.error import HTTPError
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


@shared_task(
    bind=True,
    max_retries=10,
    default_retry_delay=300,
    retry_backoff=True,
    retry_jitter=True,
)
def fetch_weather(self):
    headers = {"User-Agent": f"WeatherTrackingApp/1.0 ${CONTACT_EMAIL}"}
    coordinates = Coordinate.objects.all()
    for c in coordinates:
        try:
            api_url = f"https://api.weather.gov/points/{c.latitude},{c.longitude}"
            response = requests.get(api_url, headers=headers)
            response.raise_for_status()
            data = response.json()

            forecast_url = data["properties"]["forecast"]
            response = requests.get(forecast_url, headers=headers)
            data = response.json()
            response.raise_for_status()
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
                    description=period["detailedForecast"],
                    icon_url=period["icon"],
                )

            # limit_forecast_records(c.pk, 14 * 7)

        except requests.exceptions.HTTPError as exc:
            # somehow record error message in backend?
            logger.error(f"error fetching weather data: {exc}")
            raise self.retry(exc=exc)

        except Exception as exc:
            logger.error(f"an unexpected error occurred: {exc}")
            raise self.retry(exc=exc)
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
