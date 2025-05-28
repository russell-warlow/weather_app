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
    default_retry_delay=15,
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
            # NOTE: does elevation need to be here?
            elev = data["properties"]["elevation"]["value"]
            forecast_periods = data["properties"]["periods"]
            for period in forecast_periods:
                # create_defaults (used for create operation):
                # coordinate, date, generated_at
                # NOTE: for now, assume that generated_at doesn't change in weather API; might have to change later
                # defaults (used to update the objects):
                # temperature, wind_speed, wind_direction, precip_change, description, icon_url
                startTime = datetime.fromisoformat(period["startTime"])

                # assume that only one forecast is generated per day. stuff generated later in the day are ignored
                if not Forecast.objects.filter(
                    coordinate=c,
                    date=startTime,
                    generated_at__day=generate_time.day,
                    generated_at__month=generate_time.month,
                    generated_at__year=generate_time.year,
                ).exists():
                    Forecast.objects.create(
                        coordinate=c,
                        generated_at=generate_time,
                        elevation=elev,
                        date=startTime,
                        is_daytime=period["isDaytime"],
                        temperature=period["temperature"],
                        wind_speed=period["windSpeed"],
                        wind_direction=period["windDirection"],
                        precip_chance=period["probabilityOfPrecipitation"]["value"],
                        description=period["detailedForecast"],
                        icon_url=period["icon"],
                    )

            delete_old_forecasts(c.pk, c.user, c.session_key)

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


# for each coordinate:
#     get the number of all the forecast records
#     if the number is greater than the limit:
#         order the records according to ascending, then trim the records from the start

"""
get total number of forecasts for a particular coordinate
set limit based on whether the user is logged in or using sessions
delete excess forecasts based on order-by
is there an off by one error somewhere?
"""


def delete_old_forecasts(pk, user, session_key):
    forecasts = Forecast.objects.filter(coordinate__pk=pk)
    number_forecasts = forecasts.count()
    if user:
        limit = 6 * 14
    elif session_key:
        limit = 1 * 14
    if number_forecasts > limit:
        excess = number_forecasts - limit
        # why need flat=True? make it so that not dealing with tuples?
        ordered_forecasts = forecasts.order_by("generated_at", "date").values_list(
            "pk", flat=True
        )
        old_forecasts = ordered_forecasts[:excess]
        Forecast.objects.filter(id__in=old_forecasts).delete()


# def limit_forecast_records(pk, limit):
#     count = (
#         Forecast.objects.filter(coordinate__pk=pk)
#         .order_by("generated_at")
#         .order_by("date")
#         .count()
#     )
#     if count > limit:
#         excess = count - limit
#         old_forecasts = (
#             Forecast.objects.filter(coordinate__pk=pk)
#             .order_by("generated_at")
#             .order_by("date")[:excess]
#         )
#         old_forecasts.delete()
