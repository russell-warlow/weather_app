from django.contrib import admin
from .models import Coordinate, Peak, Forecast


class CoordinateAdmin(admin.ModelAdmin):
    readonly_fields = ("id",)


class ForecastAdmin(admin.ModelAdmin):
    readonly_fields = ("id",)


# Register your models here.
admin.site.register(Coordinate, CoordinateAdmin)
admin.site.register(Peak)
admin.site.register(Forecast, ForecastAdmin)
