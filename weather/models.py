from django.db import models
from django.contrib.auth.models import User


class Coordinate(models.Model):
    # user can be 'null' if haven't logged in, i.e. using sessions
    user = models.ForeignKey(
        User,
        related_name="coordinates",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    session_key = models.CharField(max_length=40, null=True, blank=True)
    latitude = models.FloatField()
    longitude = models.FloatField()

    def __str__(self):
        return f"{self.latitude: .8f}, {self.longitude: .8f}, User: {self.user}, Session: {self.session_key}"

    class Meta:
        ## need figure out why ordering doesn't work?
        # ordering = ["latitute", "longitude"]
        unique_together = ["user", "latitude", "longitude"]


class Peak(models.Model):
    name = models.CharField(max_length=50)
    latitude = models.FloatField()
    longitude = models.FloatField()

    def __str__(self):
        return self.name


class Forecast(models.Model):
    coordinate = models.ForeignKey(
        Coordinate, related_name="forecasts", on_delete=models.CASCADE, null=True
    )
    generated_at = models.DateTimeField()
    elevation = models.IntegerField()
    date = models.DateTimeField()
    is_daytime = models.BooleanField()
    temperature = models.IntegerField()
    wind_speed = models.CharField(max_length=20)
    wind_direction = models.CharField(max_length=5)
    precip_chance = models.IntegerField(null=True)
    relative_humidity = models.IntegerField(null=True)
    description = models.CharField()

    class Meta:
        ordering = ["coordinate", "date"]

    def __str__(self):
        return (
            f"{self.coordinate.latitude: .2f}"
            + ","
            + f"{self.coordinate.longitude: .2f}"
            + "; "
            + self.date.strftime("%m/%d/%Y, %H:%M:%S")
            + ("day" if self.is_daytime else "night")
            + ", generated: "
            + self.generated_at.strftime("%m/%d/%Y, %H:%M:%S")
        )
