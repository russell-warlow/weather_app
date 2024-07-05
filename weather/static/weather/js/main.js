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
  return `Latitude: ${lat} 
          '<br>Longitude: ${lng} 
          '<br><button onclick="add(${lat}, ${lng})">Add to List</button>`;
}

async function add(lat, lng) {
  try {
    let response = await addCoordinate(lat, lng);
    let data = await response.json();

    let response2 = await addForecast(lat, lng);
    let data2 = await response2.json();
    
    if (data2.length != 14) {
      throw Error('issue with API, unable to fetch forecasts')
    }

    updateCoordinates(data.coordinates);
  } 
  catch(error) {
    console.error('Error: ', error);
  }
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

// should this also be a POST request?
async function addForecast(lat, lng) {
  const url = `/add_forecast/?lat=${lat}&lng=${lng}`;
  return fetch(url);
}



// can i just append instead of clearing and re-adding all?
function updateCoordinates(coordinates) {
  var listOfCoordinates = document.getElementById('coordinate-list');
  listOfCoordinates.innerHTML = '';

  coordinates.forEach(async coord => {
    const lat = coord.latitude;
    const lng = coord.longitude;
    const pk = coord.pk;

    let coordinateEntry = document.createElement('div');
    coordinateEntry.id = `${pk}`;
    coordinateEntry.classList.add('coordinate-row');
    let button = document.createElement('button');
    button.onclick = (e) => {
      map.setView([lat, lng], zoomLevel);
      // maybe don't need to assign?
      
      // this looks a bit cleaner, no?
      L.marker([lat,lng]).addTo(map).bindPopup(`${lat}, ${lng}`).setLatLng([lat,lng]).openPopup();

      // let popup = L.popup()
      //   .setLatLng([lat, lng])
      //   .setContent(`${lat}, ${lng}`)
      //   .openOn(map);
    };
    button.textContent = `${lat},${lng}`;
    let collapsible = document.createElement('button');
    collapsible.classList.add('collapsible');
    collapsible.textContent = '+';
    // NOTE: prevent double generation of table when click and unclick?
    // change this to block vs hidden
    collapsible.onclick = (e) => {
      // this.classList.toggle("active");
      var content = document.getElementById(`forecast-${pk}`);
      content.parentElement.style.display = content.parentElement.style.display === "block" ? "none" : "block";
    }
    let remove = document.createElement('button');
    remove.textContent = 'x';
    remove.onclick = (e) => {
      if (confirm("Are you sure you want to delete a coordinate?")) {
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
            // NOTE: are these necessary?
            alert('Error deleting coordinate');
          }
        })
      }
      else {
        // NOTE: are these necessary?
        alert('Coordinate not deleted.');
      }
    }

    /*
    how create a grid for each coordinate?
    need way of identifying the element i'm updating, maybe use primary key?
    how does primary key work if two identical coordinates?
    better to create grid in the background instead of basing it on button click, right ... ?

    create grid here? 
    fire celery task?

    */
    
    let response = await fetch(`/get_forecasts/${pk}/`);
    let data = await response.json();
    let grid = createGrid(pk, data);
    let weatherContent = document.createElement('div');
    weatherContent.classList.add('content');
    weatherContent.appendChild(grid);
    coordinateEntry.appendChild(button)
    coordinateEntry.appendChild(collapsible)
    coordinateEntry.appendChild(remove);
    coordinateEntry.appendChild(weatherContent);
    listOfCoordinates.appendChild(coordinateEntry);
    
    // have to wait until grid is added to the DOM before adding forecasts ...
    addForecastsToGrid(pk, data);
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
        L.marker([data.latitude, data.longitude]).addTo(map)
      }
      else {
        alert('Location not found!')
      }
    })
    .catch(error => {
      alert (`Cannot parse: ${query}`);
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

function createGrid(id, forecasts) {
  let grid = document.createElement('div');
  grid.classList.add('forecast-grid');
  grid.id = `forecast-${id}`;

  if (forecasts.length == 0) {
    grid.textContent = 'No forecasts to display';
    return grid;
  }
  let firstForecast = forecasts[0];
  let firstDate = firstForecast['date'];
  let firstIsDaytime = firstForecast['is_daytime'];
  let firstGeneratedDate = firstForecast['generated_at'];

  console.log(`first generated date: ${firstGeneratedDate.toString()}`);

  grid.setAttribute('data-first-date', firstDate);
  grid.setAttribute('data-first-isdaytime', firstIsDaytime);
  grid.setAttribute('data-first-generated-at', firstGeneratedDate);
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
      grid.appendChild(element);
    }
  }
  return grid;
}

function addForecastsToGrid(id, forecasts) {
  forecasts.forEach(f => {
    addForecastToGrid(id, f);
  })
}

/*
how efficiently get icons from server? maybe do some cache?
it's going to be a lot of fetch requests

how map the date to the row + column of the grid?
*/
function addForecastToGrid(id, forecastJson) {
  let grid = document.getElementById(`forecast-${id}`);
  let firstDate = new Date(grid.getAttribute('data-first-date'));
  let firstIsDaytime = grid.getAttribute('data-first-isdaytime') === 'true';
  let firstGeneratedDate = new Date(grid.getAttribute('data-first-generated-at'));

  let targetDate = new Date(forecastJson['date']);
  let targetIsDaytime = forecastJson['is_daytime'];

  let targetGeneratedDate = new Date(forecastJson['generated_at']);

  console.log(`firstGeneratedDate: ${firstGeneratedDate.toString()}`);
  console.log(`targetGeneratedDate: ${targetGeneratedDate.toString()}`);

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
  let cell = getGridItem(id, row, col);
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
  console.log(`icon url: ${forecastJson['icon_url']}`);

  let icon = document.createElement('img');
  icon.setAttribute('src', forecastJson['icon_url']);
  icon.setAttribute('alt', 'icon');
  let temp = document.createElement('div');
  let qualifier = forecastJson['is_daytime'] ? 'High' : 'Low';
  temp.textContent = `${qualifier}: ${forecastJson['temperature']}F`;
  let wind = document.createElement('div');
  wind.textContent = `${forecastJson['wind_speed'].replace(" to ", "-")} ${forecastJson['wind_direction']}`;
  let precip = document.createElement('div');
  console.log(`type of forecastJson[precip_chance]: ${forecastJson['precip_chance']}`);
  let chance = forecastJson['precip_chance'] === null ? 0 : forecastJson['precip_chance'];
  precip.textContent = `Precip: ${chance}%`;
  cell.innerHTML = '';
  cell.appendChild(icon);
  cell.appendChild(temp);
  cell.appendChild(wind);
  cell.appendChild(precip);
  cell.style.backgroundColor = "Aquamarine";
  cell.setAttribute('title', forecastJson['description']);
  console.log(`adding to row: ${row}, col: ${col}`);
}

function getGridItem(id, row, col) {
  let item = document.querySelector(`#forecast-${id} > [data-row="${row}"][data-col="${col}"]`);
  console.log(`getGridItem return value for id ${id}, row ${row}, col ${col}: ${item}`);
  return item;
}

function printForecastJson(forecastJson) {
  let element = document.getElementById('forecast-json');
  let jsonStr = JSON.stringify(forecastJson);
  let oldContent = element.innerHTML
  element.innerHTML = oldContent + '<br>' + jsonStr;
}

function printUIFriendlyForecast(forecastJson) {
  let forecastDiv = document.getElementById('forecast-json');
  let time = forecastJson['is_daytime'];
  let date = new Date(forecastJson['date']).toLocaleString();
  let genAt = new Date(forecastJson['generated_at']).toLocaleString();
  let oldContent = element.textContent;
  forecastDiv.textContent = oldContent + '\n' + `${date}; daytime? ${time}; created: ${genAt}`;
}

function setupSearchBar() {
  const searchInput = document.getElementById('search-input');
  const optionsContainer = document.getElementById('options-container');

  fetch('/peaks/')
  .then(response => response.json())
  .then(data => {
    data.forEach(item => {
      let option = document.createElement('div');
      option.classList.add('option');
      option.textContent = item['name'];
      optionsContainer.appendChild(option);
    })
  })
  .then(() => {
    const options = Array.from(document.querySelectorAll('.option'));
    searchInput.addEventListener('input', () => {
      const searchText = searchInput.value.trim().toLowerCase();
      optionsContainer.style.display = 'block';
      options.forEach(peak => {
        const peakName = peak.textContent.toLowerCase();
        if (peakName.includes(searchText)) {
          peak.style.display = 'block';
        } else {
          peak.style.display = 'none';
        }
      });
    });

    options.forEach(option => {
      option.addEventListener('click', () => {
        searchInput.value = option.textContent.trim();
        optionsContainer.style.display = 'none';
      })
    });

    document.addEventListener('click', (e) => {
      if (!optionsContainer.contains(e.target) && !searchInput.contains(e.target)) {
        optionsContainer.style.display = 'none';
      }
    });
  });
}

showCoordinates();
setupSearchBar();