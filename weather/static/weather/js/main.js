// put it all in DOMContentLoaded eventlistener?

const zoomLevel = 13;

let map = L.map('map', {
  zoomDelta: 0.25,
  zoomSnap: 0,
  wheelPxPerZoomLevel: 120,
}).setView([37.10291, -118.71933], zoomLevel);
// L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map); 
L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' + '<a href="https://opentopomap.org">OpenTopoMap</a> contributors, ' + 'Data available under the <a href="https://opendatacommons.org/licenses/odbl/">ODbL</a>' }).addTo(map);

L.control.scale().addTo(map);

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

// should this also be a POST request?
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
    const lat = coord.latitude;
    const lng = coord.longitude;
    const pk = coord.pk;

    let item = document.createElement('div');
    item.id = `${pk}`;
    let button = document.createElement('button');
    button.onclick = (e) => {
      map.setView([lat, lng], zoomLevel);
    };
    button.textContent = `${lat},${lng}`;
    let collapsible = document.createElement('button');
    collapsible.classList.add('collapsible');
    collapsible.textContent = '+';
    let weatherContent = document.createElement('div');
    weatherContent.classList.add('content');
    let remove = document.createElement('button');
    remove.textContent = 'x';
    remove.onclick = (e) => {
      fetch(`/delete/${pk}/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': '{{ csrf_token }}',
        },
      })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          const divToDelete = document.getElementById(`${pk}`);
          divToDelete.remove();
        }
        else {
          alert('Error deleting coordinate');
        }
      })
      
    }
    
    collapsible.appendChild(weatherContent);
    item.appendChild(button)
    item.appendChild(collapsible)
    item.appendChild(remove);
    list.appendChild(item);
  });
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

document.getElementById('search-form').addEventListener('submit', (e) => {
  e.preventDefault(); 
  const query = document.getElementById('search-input').value.trim();
  fetch(`/search/?q=${encodeURIComponent(query)}`)
    .then(response => response.json())
    .then(data => {
      if(data.latitude && data.longitude) {
        map.setView([data.latitude, data.longitude], zoomLevel);
      }
      else {
        alert('Location not found!')
      }
    })
    .catch(error => {
      alert ('An error occurred');
      alert(error);
    })
});