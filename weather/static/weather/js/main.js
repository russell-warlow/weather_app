// put it all in DOMContentLoaded eventlistener?

let map = L.map('map', {
  zoomDelta: 0.3
}).setView([37.10291, -118.71933], 13);
// L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map); 
L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' + '<a href="https://opentopomap.org">OpenTopoMap</a> contributors, ' + 'Data available under the <a href="https://opendatacommons.org/licenses/odbl/">ODbL</a>' }).addTo(map);

let popup = L.popup();

function onMapClick(e) {
  popup
    .setLatLng(e.latlng)
    .setContent(createMenu(e.latlng))
    .openOn(map);
}

map.on('click', onMapClick)

function createMenu(latlng) {
  let lat = latlng.lat;
  let lng = latlng.lng;
  return 'Latitude: ' + lat + 
          '<br>Longitude: ' + lng + 
          '<br><button onclick="add(' + lat + ', ' + 
                                              lng + ')">Add to List</button>'
}

async function add(lat, lng) {
  try {
    let response = await addCoordinate(lat, lng);
    let data = await response.json();
    updateCoordinates(data.coordinates);
  } 
  catch(error) {
    console.error('Error: ', error);
  }
  
  try {
    let response = await addForecast(lat, lng);
    console.log(response);
    let data = await response.json();
    console.log('data: ')
    console.log(data);
    displayForecast(data);
  }
  catch(error) {
    console.error('Error fetching weather data: ', error);
  }
}

async function addForecast(lat, lng) {
  const url = `/add_forecast/?lat=${lat}&lng=${lng}`;
  return fetch(url);
}

async function addCoordinate(lat, lng) {
  return fetch('/add_coordinate/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': '{{ csrf_token }}',
    },
    body: JSON.stringify({ latitude: lat, longitude: lng})
  })
}

// can i just append instead of clearing and re-adding all?
function updateCoordinates(coordinates) {
  var list = document.getElementById('coordinate-list');
  list.innerHTML = '';
  coordinates.forEach(coord => {
    let item = document.createElement('div');
    item.textContent = `Lat: ${coord.latitude}, Lng: ${coord.longitude}`;
    list.appendChild(item);
  })
}

function displayForecast(parsedWeather) {
  var forecastsDiv = document.getElementById('forecast-list');
  for(let i=0; i<parsedWeather.length; i++) {
    let forecast = parsedWeather[i];
    let time = forecast['is_daytime'] ? 'day' : 'early AM';
    let date = forecast['date'].split('T')[0];
    let detail = forecast['description'];
    let item = document.createElement('div');
    item.textContent = `${date} ${time}: ${detail}`;
    forecastsDiv.appendChild(item);
  }
}