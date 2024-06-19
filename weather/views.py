from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from .models import Coordinate, Peak, Forecast
from django.contrib.sessions.models import Session
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import requests
from datetime import datetime
from .serializers import ForecastSerializer


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
            {"latitude": i.latitude, "longitude": i.longitude} for i in coordinates
        ]
        return JsonResponse({"coordinates": coordinates})
    return JsonResponse({"error": "Invalid request method"}, status=400)


def add_forecast(request):
    if request.method == "GET":
        lat = request.GET.get("lat")
        lng = request.GET.get("lng")
        api_url_noaa = f"https://api.weather.gov/points/{lat},{lng}"
        headers = {"User-Agent": "hobby weather project"}

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
                    relative_humidity=period["relativeHumidity"]["value"],
                    description=period["detailedForecast"],
                )
                parsed_data.append(new_forecast)
            serializer = ForecastSerializer(parsed_data, many=True)
            return JsonResponse(serializer.data, safe=False)
        except requests.RequestException as e:
            return JsonResponse({"error": str(e)}, status=500)
