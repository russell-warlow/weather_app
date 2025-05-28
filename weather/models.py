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
    # maybe remove null constraint later?
    date_created = models.DateTimeField(null=True)
    name = models.CharField(max_length=50, null=True)

    def __str__(self):
        return f"{self.latitude: .8f}, {self.longitude: .8f}, Name: {self.name}, User: {self.user}, Session: {self.session_key}"

    class Meta:
        ## need figure out why ordering doesn't work?
        # ordering = ["latitute", "longitude"]
        unique_together = ["user", "session_key", "latitude", "longitude"]


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
    # NOTE: can delete relative_humidity b/c not sure it's supported anymore ...?
    relative_humidity = models.IntegerField(null=True)
    description = models.CharField()
    icon_url = models.URLField(null=True, blank=True)

    class Meta:
        ordering = ["coordinate", "generated_at", "date"]

    def __str__(self):
        return (
            "["
            + f"{self.coordinate.latitude: .5f}"
            + ", "
            + f"{self.coordinate.longitude: .5f}"
            + "], created: "
            + self.generated_at.strftime("%m/%d/%Y, %H:%M:%S")
            + "; for date: "
            + self.date.strftime("%m/%d/%Y %H:%M:%S")
            + "; is daytime: "
            + str(self.is_daytime)
            + "; Temp: "
            + str(self.temperature)
        )
