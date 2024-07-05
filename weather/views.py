from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from .models import Coordinate, Peak, Forecast
from django.contrib.sessions.models import Session
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import requests
from datetime import datetime
from .serializers import ForecastSerializer, PeakSerializer
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.http import require_POST
import random
from weather_app.config import CONTACT_EMAIL


def map_view(request):
    return render(request, "weather/map.html")


# might need to remove this decorator in production
@csrf_exempt
def add_coordinate(request):
    if request.method == "POST":
        data = json.loads(request.body)
        lat = data.get("latitude")
        lng = data.get("longitude")

        if request.user.is_authenticated:
            coord, created = Coordinate.objects.get_or_create(
                latitude=lat, longitude=lng, user=request.user
            )
            # say can't add duplicate coordinates? or handle it at the db level?
            coordinates = Coordinate.objects.filter(user=request.user)
        else:
            session_key = request.session.session_key
            if not session_key:
                request.session.create()
                session_key = request.session.session_key
            coord, created = Coordinate.objects.get_or_create(
                latitude=lat, longitude=lng, session_key=session_key
            )
            coordinates = Coordinate.objects.filter(session_key=session_key)

        # maybe separate into two different endpoints, so one for adding and one for getting?
        # doing too many things on this endpoint, POST request that also returns stuff?
        coordinates = [
            {"latitude": i.latitude, "longitude": i.longitude, "pk": i.pk}
            for i in coordinates
        ]
        return JsonResponse({"coordinates": coordinates})
    return JsonResponse({"error": "Invalid request method"}, status=400)


def get_coordinates(request):
    pass
    # if request.method == "POST":
    #     data = json.loads(request.body)
    #     lat = data.get("latitude")
    #     lng = data.get("longitude")

    #     if request.user.is_authenticated:
    #         coord, created = Coordinate.objects.get_or_create(
    #             latitude=lat, longitude=lng, user=request.user
    #         )
    #         # say can't add duplicate coordinates? or handle it at the db level?
    #         coordinates = Coordinate.objects.filter(user=request.user)
    #     else:
    #         session_key = request.session.session_key
    #         if not session_key:
    #             request.session.create()
    #             session_key = request.session.session_key
    #         coord, created = Coordinate.objects.get_or_create(
    #             latitude=lat, longitude=lng, session_key=session_key
    #         )
    #         coordinates = Coordinate.objects.filter(session_key=session_key)

    #     # maybe separate into two different endpoints, so one for adding and one for getting?
    #     # doing too many things on this endpoint, POST request that also returns stuff?
    #     coordinates = [
    #         {"latitude": i.latitude, "longitude": i.longitude, "pk": i.pk}
    #         for i in coordinates
    #     ]
    #     return JsonResponse({"coordinates": coordinates})
    # return JsonResponse({"error": "Invalid request method"}, status=400)


def add_forecast(request):
    if request.method == "GET":
        lat = request.GET.get("lat")
        lng = request.GET.get("lng")
        api_url_noaa = f"https://api.weather.gov/points/{lat},{lng}"
        headers = {"User-Agent": f"WeatherTrackingApp/1.0 ${CONTACT_EMAIL}"}

        try:
            response = requests.get(api_url_noaa, headers=headers)
            data = response.json()

            forecast_url = data["properties"]["forecast"]
            response = requests.get(forecast_url, headers=headers)
            data = response.json()

            generate_time = datetime.fromisoformat(data["properties"]["generatedAt"])
            elev = data["properties"]["elevation"]["value"]
            forecast_periods = data["properties"]["periods"]
            parsed_data = []
            for period in forecast_periods:
                new_forecast = Forecast.objects.create(
                    coordinate=Coordinate.objects.get(latitude=lat, longitude=lng),
                    generated_at=generate_time,
                    elevation=elev,
                    date=datetime.fromisoformat(period["startTime"]),
                    is_daytime=period["isDaytime"],
                    temperature=period["temperature"],
                    wind_speed=period["windSpeed"],
                    wind_direction=period["windDirection"],
                    precip_chance=period["probabilityOfPrecipitation"]["value"],
                    # relative_humidity=period["relativeHumidity"]["value"],
                    description=period["detailedForecast"],
                    icon_url="https://api.weather.gov" + period["icon"],
                )
                parsed_data.append(new_forecast)
            serializer = ForecastSerializer(parsed_data, many=True)
            return JsonResponse(serializer.data, safe=False)
        except requests.RequestException as e:
            return JsonResponse({"error": str(e)}, status=500)


"""
try peak name, if search is characters
if search is mostly numbers

add fuzzy search?
maybe make autocomplete form, try to match characters
prevent sql injection?
"""


def search(request):
    query = request.GET.get("q").strip()

    if len(query):
        firstCharacter = query[0]
        if firstCharacter.isalpha():
            peak = Peak.objects.get(name=query)
            if peak:
                return JsonResponse(
                    {"latitude": peak.latitude, "longitude": peak.longitude}
                )
            else:
                return JsonResponse({"error": "cannot parse search string"}, status=400)
        else:
            # entered a number, mainly check if the two are valid lat + lng?
            pass
    return JsonResponse({"error": "cannot parse search string"}, status=400)


@require_POST
@csrf_exempt
def delete_coordinate(request, pk):
    try:
        coordinate = Coordinate.objects.get(pk=pk)
    except Coordinate.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    coordinate.delete()
    return JsonResponse({"status": "success"})
    # else:
    #     return JsonResponse({"status": "error"}, status=403)


# return http 204 no content response?
def get_forecasts(request, pk):
    try:
        # maybe can rely on pre-defined ordering of forecasts, so don't need order_by in queryset?
        forecasts = (
            Forecast.objects.filter(coordinate__pk=pk)
            .order_by("generated_at")
            .order_by("date")
        )
        serializer = ForecastSerializer(forecasts, many=True)
        return JsonResponse(serializer.data, safe=False)
    except Forecast.DoesNotExist:
        return


# add error-handling
def get_coordinates(request):
    records = Coordinate.objects.all()
    coordinates = [
        {"latitude": i.latitude, "longitude": i.longitude, "pk": i.pk} for i in records
    ]
    return JsonResponse({"coordinates": coordinates})


def get_peaks(request):
    peaks = Peak.objects.all()
    serializer = PeakSerializer(peaks, many=True)
    return JsonResponse(serializer.data, safe=False)
