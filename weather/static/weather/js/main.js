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
  
  // try {
  //   let response = await addForecast(lat, lng);
  //   console.log(response);
  //   let data = await response.json();
  //   console.log('data: ')
  //   console.log(data);
  //   displayForecast(data);
  // }
  // catch(error) {
  //   console.error('Error fetching weather data: ', error);
  // }
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

async function showCoordinates() {
  try {
    let response = await fetch('/get_coordinates/');
    let data = await response.json();
    updateCoordinates(data.coordinates);
  } 
  catch(error) {
    console.error('Error: ', error);
  }
};


// assume given the earliest generated forecast
function createGrid(forecastJson) {
  let wrapper = document.getElementById('forecast-grid');
  wrapper.innerHTML = '';
  let firstDate = forecastJson['date'];
  let firstIsDaytime = forecastJson['is_daytime'];
  let firstGeneratedDate = forecastJson['generated_at'];
  wrapper.setAttribute('data-first-date', firstDate);
  wrapper.setAttribute('data-first-isdaytime', firstIsDaytime);
  wrapper.setAttribute('data-first-generated-at', firstGeneratedDate);
  let currentDate = new Date(firstDate);
  let timeOfDay = '';
  for(let i=0; i<8; i++) {
    for(let j=0; j<35; j++) {
      let element = document.createElement('div');
      if(i == 0 && j == 0) {
        // do nothing?
      }
      else if (i == 0 && j > 0) {
        /*
        date will be ... 
        if first forecast is nighttime, then next forecast will be 
        different day, j=1 is first forecast so j=2 will be different day, 
        so j=(evens) will be new day
        
        else first forecast is daytime, so next day will be two forecasts from now
        j=1 is first forecast, so j=3 will be different day,
        so j=(odds) will be new day
        
        day/night will be ...
        first forecast will be on j=1, so:
        -odds will be same as first forecast
        -events will be opposite as first forecast
        */
        if(!firstIsDaytime) {
          if (j % 2 == 0) {
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
        else {
          if (j > 1 && j % 2 == 1) {
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }

        if(j % 2 == 1) {
          timeOfDay = firstIsDaytime ? '' : 'night';
        }
        else {
          timeOfDay = !firstIsDaytime ? '' : 'night';
        }
        element.textContent = `${currentDate.toDateString()} ${timeOfDay}`;
      }
      // calculate day of week name or just use numerical dates?
      else if (i > 0 && j == 0) {
        let nextForecastDate = new Date(firstDate);
        nextForecastDate.setDate(nextForecastDate.getDate() + i - 1);
        element.textContent = nextForecastDate.toDateString();
      }
      // do nothing
      else {

      }

      // NOTE: def a hack, need to change later
      if (element.textContent === '') {
        element.classList.add('forecast-cell');
      }
      else {
        element.classList.add('grid-label');
      }
      element.style.gridRow = i+1;
      element.style.gridColumn = j+1;
      element.setAttribute('data-row', i+1);
      element.setAttribute('data-col', j+1);
      wrapper.appendChild(element);
    }
  }
}

/*
how efficiently get icons from server? maybe do some cache?
it's going to be a lot of fetch requests

how map the date to the row + column of the grid?
*/
function addForecastToGrid(forecastJson) {
  let wrapper = document.getElementById('forecast-grid');
  let firstDate = new Date(wrapper.getAttribute('data-first-date'));
  let firstIsDaytime = wrapper.getAttribute('data-first-isdaytime') === 'true';
  let firstGeneratedDate = new Date(wrapper.getAttribute('data-first-generated-at'));

  let targetDate = new Date(forecastJson['date']);
  let targetIsDaytime = forecastJson['is_daytime'];

  let targetGeneratedDate = new Date(forecastJson['generated_at']);

  /*
  "generated_at" field to find the row:
  calc difference between firstDate and forecast date?
  determine number of days?

  "date" field to find the column:
  isDaytime trickery

  if both are day or both are night, then it's easy
  if first is night, target is day then -1 ?
  if first is day, target is night then +1 ?

  test case: first and target are the same
  should return [2, 2]


  */

  console.log('===adding new forecast ===');
  let daysBetweenForecastGeneration = 0;
  while(true) {
    console.log('first date, days: ' + firstGeneratedDate.getDate());
    console.log('generated date, date: ' + targetGeneratedDate.getDate());
    if(firstGeneratedDate.getDate() == targetGeneratedDate.getDate()) {
      break;
    }
    else {
      firstGeneratedDate.setDate(firstGeneratedDate.getDate() + 1);
      daysBetweenForecastGeneration = daysBetweenForecastGeneration + 1;
    }
  }
  console.log('daysBetweenForecastGeneration: ' + daysBetweenForecastGeneration);


  let numDays = 0;
  while(true) {
    console.log('first date, days: ' + firstDate.getDate());
    console.log('target date, date: ' + targetDate.getDate());
    if(firstDate.getDate() == targetDate.getDate()) {
      break;
    }
    else {
      firstDate.setDate(firstDate.getDate() + 1);
      numDays = numDays + 1;
    }
  }
  console.log('numDays: ' + numDays);

  let numHalfdays = numDays * 2;
  console.log(`first isdaytime: ${firstIsDaytime}, typeof: ${typeof(firstIsDaytime)}`);
  console.log(`target isdaytime: ${targetIsDaytime}, typeof: ${typeof(targetIsDaytime)}`);

  if (firstIsDaytime === true && targetIsDaytime === false) {
    console.log('plus one');
    numHalfdays = numHalfdays + 1;
  }
  else if(firstIsDaytime === false && targetIsDaytime === true) {
    console.log('subtract one');
    numHalfdays = numHalfdays - 1;
  }

  // forecast squares start at [2, 2]
  let row = daysBetweenForecastGeneration + 2;
  let col = numHalfdays + 2;
  let cell = getGridItem(row, col);
  if (cell.style.backgroundColor !== '') {
    console.log('error adding forecast to grid: mapping to wrong square');
    console.log(`row: ${row}, col: ${col}`);
    console.log(`forecastJson: ${forecastJson}`);
  }

  /*
  generate weather widget, NOTE: break into separate function later

  ideally: 
  show icon, not sure how if not stored on server for very long ... ?
  hover over to get more detailed?

  basic: 
  temp
  wind speed + direction
  chance of precip
  */
  let temp = document.createElement('div');
  let qualifier = forecastJson['is_daytime'] ? 'High' : 'Low';
  temp.textContent = `${qualifier}: ${forecastJson['temperature']}F`;
  let wind = document.createElement('div');
  wind.textContent = `${forecastJson['wind_speed']} ${forecastJson['wind_direction']}`;
  let precip = document.createElement('div');
  console.log(`type of forecastJson[precip_chance]: ${forecastJson['precip_chance']}`);
  let chance = forecastJson['precip_chance'] === null ? 0 : forecastJson['precip_chance'];
  precip.textContent = `Precip: ${chance}%`;
  cell.appendChild(temp);
  cell.appendChild(wind);
  cell.appendChild(precip);
  cell.style.backgroundColor = "Aquamarine";
  cell.setAttribute('title', forecastJson['description']);
  console.log(`adding to row: ${row}, col: ${col}`);
}

function getGridItem(row, col) {
  return document.querySelector(`.forecast-cell[data-row="${row}"][data-col="${col}"]`);
}

function getFirstForecast() {

}

function addLabelsToGrid(forecastJson) {
  let wrapper = document.getElementById('forecast-grid');

}

function addForecastsToGrid(queryset) {
  for(let i=0; i<queryset.length; i++) {
    addForecastToGrid(queryset[i]);
  }
}

function printForecastJson(forecastJson) {
  let element = document.getElementById('forecast-json');
  let jsonStr = JSON.stringify(forecastJson);
  let oldContent = element.textContent;
  element.textContent = oldContent + '\n' + jsonStr;
}


function printUIFriendlyForecast(forecastJson) {
  let forecastDiv = document.getElementById('forecast-json');
  let time = forecastJson['is_daytime'];
  let date = new Date(forecastJson['date']).toLocaleString();
  let genAt = new Date(forecastJson['generated_at']).toLocaleString();
  let oldContent = element.textContent;
  forecastDiv.textContent = oldContent + '\n' + `${date}; daytime? ${time}; created: ${genAt}`;
}

async function showRandomForecast() {
  try {
    let response = await fetch('/get_random_forecast/');
    let data = await response.json();
    printUIFriendlyForecast(data);
    printForecastJson(data);
    createGrid(data);
    addForecastToGrid(data);
  }
  catch(error) {
    console.error('Error: ', error);
  }
};

async function renderSetOfForecasts() {
  try {
    let response = await fetch('/get_set_of_forecasts/');
    let data = await response.json();
    let first = data[0];
    printForecastJson(first);
    createGrid(first);
    console.log(`data length: ${data.length}`);
    addForecastsToGrid(data);
  }
  catch(error) {
    console.error('Error adding set of forecasts to grid: ' + error);
  }
}

/* 
what needs to be done?
create labels 
get dates 
get corresponding day of the week?
create widgets and add forecast data?

if check weather at nighttime, then one fewer forecast for that day
but still same number of total forecasts
either way, can always check forecast sometime in the AM so assure
that we'll get AM then PM every day?

some error-checking for if forecast has already been added to grid?

manually generate data for consecutive days to test grid?
start writing unit tests
*/

showCoordinates();
// showRandomForecast();
renderSetOfForecasts();