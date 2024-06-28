from django.urls import path
from .views import (
    map_view,
    add_coordinate,
    add_forecast,
    search,
    delete_coordinate,
    get_coordinates,
    get_random_forecast,
    get_set_of_forecasts,
)

urlpatterns = [
    path("map/", map_view, name="map"),
    path("add_coordinate/", add_coordinate, name="add_coordinate"),
    path("add_forecast/", add_forecast, name="add_forecast"),
    path("search/", search, name="search"),
    path("delete/<int:pk>/", delete_coordinate, name="delete_coordinate"),
    path("get_coordinates/", get_coordinates, name="get_coordinates"),
    path("get_random_forecast/", get_random_forecast, name="get_random_forecast"),
    path("get_set_of_forecasts/", get_set_of_forecasts, name="get_set_of_forecasts"),
]
