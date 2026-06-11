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
from django.views.decorators.csrf import ensure_csrf_cookie
from weather_app.config import CONTACT_EMAIL
from django.contrib.auth.forms import UserCreationForm
from .forms import UserRegistrationForm, UserEditForm
from django.contrib.auth import authenticate, login
from .forms import LoginForm
from django.http import HttpResponse
import pdb


# NOTE: why need this decorator?
@ensure_csrf_cookie
def map_view(request):
    # records = Coordinate.objects.all()
    # coordinates = [
    #     {"latitude": i.latitude, "longitude": i.longitude, "pk": i.pk}
    #     for i in records
    # ]
    coordinates = {}
    # maybe check if user is logged in, if so then pull from that
    # if not then pull from session?
    if request.user.is_authenticated:
        # preserve order?
        coordinates = Coordinate.objects.filter(user=request.user).order_by(
            "date_created"
        )
    else:
        # how pull from session?
        # maybe update the session key in add_coordinate
        coordinates = Coordinate.objects.filter(
            session_key=request.session.session_key
        ).order_by("date_created")

    context = {
        "coordinates": [
            {
                "latitude": c.latitude,
                "longitude": c.longitude,
                "pk": c.pk,
            }
            for c in coordinates
        ],
    }

    return render(request, "weather/map.html", context=context)


def user_login(request):
    if request.method == "POST":
        form = LoginForm(request.POST)
        if form.is_valid():
            cd = form.cleaned_data
            user = authenticate(
                request, username=cd["username"], password=cd["password"]
            )
            if user is not None:
                if user.is_active:
                    # get old session hash before login
                    # find all the coordinates associated with this session id
                    # add coordinate if coordinate not already in user's list
                    session_key = request.session.session_key
                    pdb.set_trace()
                    login(request, user)
                    print("old session key: ")
                    print(session_key)

                    session_coordinates = Coordinate.objects.filter(
                        session_key=session_key
                    )

                    print("session_coordinates: ")
                    print(session_coordinates)

                    pdb.set_trace()
                    for coord in session_coordinates:
                        exists = Coordinate.objects.filter(
                            user__username=user,
                            latitude=coord.latitude,
                            longitude=coord.longitude,
                        )
                        if not exists:
                            pdb.set_trace()
                            coord.user = user
                            coord.session_key = None
                            coord.save(update_fields=["user", "session_key"])

                    return redirect("map")
                else:
                    return HttpResponse("Disabled account")
            else:
                return HttpResponse("Invalid login")
    else:
        form = LoginForm()
    return render(request, "registration/login.html", {"form": form})


@require_POST
def add_coordinate(request):
    try:
        data = json.loads(request.body)
        lat = data.get("latitude")
        lng = data.get("longitude")

        if request.user.is_authenticated:
            # prevent adding duplicate coordinates
            coord, created = Coordinate.objects.get_or_create(
                latitude=lat, longitude=lng, user=request.user
            )
            # say can't add duplicate coordinates? or handle it at the db level?
            # coordinates = Coordinate.objects.filter(user=request.user)
        else:
            session_key = request.session.session_key
            if not session_key:
                request.session.create()
                session_key = request.session.session_key
            coord, created = Coordinate.objects.get_or_create(
                latitude=lat, longitude=lng, session_key=session_key
            )
        if created:
            return JsonResponse(
                {
                    "message": "Coordinate added successfully",
                    "coordinate": {
                        "latitude": coord.latitude,
                        "longitude": coord.longitude,
                        "pk": coord.pk,
                    },
                    "created": created,
                }
            )
        else:
            return JsonResponse(
                {
                    "error:": "Cannot create duplicate coordinate entry",
                },
                status=409,
            )
    except (json.JSONDecodeError, TypeError):
        return JsonResponse({"error": "Invalid JSON data"}, status=400)


@require_POST
def add_forecast(request):
    data = json.loads(request.body)
    lat = data.get("latitude")
    lng = data.get("longitude")
    api_url_noaa = f"https://api.weather.gov/points/{lat},{lng}"
    headers = {"User-Agent": f"WeatherTrackingApp/1.0 ${CONTACT_EMAIL}"}

    try:
        response = requests.get(api_url_noaa, headers=headers)
        data = response.json()
        forecast_url = data["properties"]["forecast"]
        time_zone = data["properties"]["timeZone"]

        # # NOTE: better way to handle checking for various fields in API responses?
        # if "properties" in data:
        #     forecast_url = data["properties"]["forecast"]
        # else:
        #     logging.debug("Missing 'properties' key in the data.")
        #     return JsonResponse({"error": 'Missing "properties" in the response.'})

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
                time_zone=time_zone,
                elevation=elev,
                date=datetime.fromisoformat(period["startTime"]),
                is_daytime=period["isDaytime"],
                temperature=period["temperature"],
                wind_speed=period["windSpeed"],
                wind_direction=period["windDirection"],
                precip_chance=period["probabilityOfPrecipitation"]["value"],
                description=period["detailedForecast"],
                icon_url=period["icon"],
            )
            parsed_data.append(new_forecast)
        serializer = ForecastSerializer(parsed_data, many=True)
        return JsonResponse(
            {
                "message": "Retrieved weather successfully",
                "forecasts": serializer.data,
            }
        )
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
        forecasts = Forecast.objects.filter(coordinate__pk=pk).order_by(
            "generated_at", "date"
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


def register_view(request):
    form = UserCreationForm(request.POST or None)
    if form.is_valid():
        user_obj = form.save()
        return redirect("/login")
    context = {"form": form}
    return render(request, "account/register.html", context)


# from "Django 4 by Example" by Antonio Mele
def register(request):
    if request.method == "POST":
        user_form = UserRegistrationForm(request.POST)
        if user_form.is_valid():
            new_user = user_form.save(commit=False)
            new_user.set_password(user_form.cleaned_data["password"])
            new_user.save()
            return render(request, "account/register_done.html", {"new_user": new_user})
    else:
        user_form = UserRegistrationForm()
    return render(request, "account/register.html", {"user_form": user_form})


@login_required
def edit(request):
    if request.method == "POST":
        user_form = UserEditForm(instance=request.user, data=request.POST)
        if user_form.is_valid():
            user_form.save()
    else:
        user_form = UserEditForm(instance=request.user)
    return render(request, "account/edit.html", {"user_form": user_form})


@login_required
def dashboard(request):
    return render(request, "account/dashboard.html")
