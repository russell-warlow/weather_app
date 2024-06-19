from django.contrib import admin
from .models import Coordinate, Peak, Forecast

# Register your models here.
admin.site.register(Coordinate)
admin.site.register(Peak)
admin.site.register(Forecast)
