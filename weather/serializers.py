from rest_framework import serializers
from weather.models import Coordinate, Forecast, Peak
from django.contrib.auth.models import User


class UserSerializer(serializers.ModelSerializer):
    # do i need to serialize the weather reports?
    class Meta:
        model = User
        fields = ["id", "username", "email"]


class CoordinateSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Coordinate
        fields = ["id", "user", "latitude", "longitude"]


class ForecastSerializer(serializers.ModelSerializer):
    coordinate = CoordinateSerializer(read_only=True)

    class Meta:
        model = Forecast
        fields = [
            "id",
            "coordinate",
            "generated_at",
            "elevation",
            "date",
            "is_daytime",
            "temperature",
            "wind_speed",
            "wind_direction",
            "precip_chance",
            "relative_humidity",
            "description",
            "icon_url",
        ]


class PeakSerializer(serializers.ModelSerializer):
    class Meta:
        model = Peak
        fields = ["name"]
