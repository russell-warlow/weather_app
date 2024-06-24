from django.urls import path
from .views import map_view, add_coordinate, add_forecast, search, delete_coordinate

urlpatterns = [
    path("map/", map_view, name="map"),
    path("add_coordinate/", add_coordinate, name="add_coordinate"),
    path("add_forecast/", add_forecast, name="add_forecast"),
    path("search/", search, name="search"),
    path("delete/<int:pk>/", delete_coordinate, name="delete_coordinate"),
]
