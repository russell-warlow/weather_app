from django.test import TestCase
from weather.tasks import fetch_weather_logic
from weather.models import Coordinate, Forecast

"""
what needs testing?
fetch 14 coordinates at a time
delete old coordinates?
"""
A = {"lat": 37.12254886259509, "lng": -118.71225357055665}
B = {"lat": 37.309261301204636, "lng": -118.7655645592856}
C = {"lat": 37.03010282215286, "lng": -118.72924804687501}

"""
what test?

do we generate fourteen forecasts for each coordinate in the database?

unique:
do we generate duplicate forecasts if we run periodic task twice?
do we delete old forecasts?


questions:
what put in setUp vs test function?
when is teardown ran?

"""


class FetchForecasts(TestCase):

    # NOTE: can't seem to test by passing around primary keys; basically having trouble getting celery to use django test db
    def test_fetch_forecast_one_coordinate(self):
        foo = Coordinate.objects.create(latitude=A["lat"], longitude=A["lng"])
        fetch_weather_logic(foo.id)
        self.assertEqual(
            Forecast.objects.filter(
                coordinate__latitude=A["lat"],
                coordinate__longitude=A["lng"],
            ).count(),
            14,
        )

    def test_fetch_forecast_two_coordinates(self):
        foo = Coordinate.objects.create(latitude=A["lat"], longitude=A["lng"])
        bar = Coordinate.objects.create(latitude=B["lat"], longitude=B["lng"])
        fetch_weather_logic(foo.id)
        fetch_weather_logic(bar.id)
        self.assertEqual(
            Forecast.objects.filter(
                coordinate__latitude=A["lat"],
                coordinate__longitude=A["lng"],
            ).count(),
            14,
        )
        self.assertEqual(
            Forecast.objects.filter(
                coordinate__latitude=B["lat"],
                coordinate__longitude=B["lng"],
            ).count(),
            14,
        )

    def test_prevent_duplicate_forecasts(self):
        foo = Coordinate.objects.create(latitude=A["lat"], longitude=A["lng"])
        fetch_weather_logic(foo.id)
        fetch_weather_logic(foo.id)
        self.assertEqual(
            Forecast.objects.filter(
                coordinate__latitude=A["lat"],
                coordinate__longitude=A["lng"],
            ).count(),
            14,
        )
