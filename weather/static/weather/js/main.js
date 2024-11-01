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

map.on('click', onMapClick)

function onMapClick(mapEvent) {
  let csrftoken = getCookie('csrftoken');
  let lat = mapEvent.latlng.lat;
  let lng = mapEvent.latlng.lng;

  popup
    .setLatLng(mapEvent.latlng)
    .setContent(createMenu(lat, lng, csrftoken))
    .openOn(map);

  document.getElementById('add-coordinate-form').addEventListener('submit', async function(submitEvent) {
    submitEvent.preventDefault();
    let newEntry = await addCoordinateNew(lat, lng, csrftoken);
    await addFirstForecast(lat, lng, csrftoken);
    addWeatherGrid(newEntry);
  });
}

async function doNext(lat, lng, csrftoken) {
  // get most recently added coordinate and bind the weather, make it into a promise so can run asynchronously
  // also pass in the csrf stuff
  // let newEntry = document.getElementById('coordinate-list').lastElementChild;
  let newEntry = await addFirstForecast(lat, lng, csrftoken)
  addWeatherGrid(newEntry);
}

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          // Does this cookie string begin with the name we want?
          if (cookie.substring(0, name.length + 1) === (name + '=')) {
              cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
              break;
          }
      }
  }
  return cookieValue;
}

function createMenu(lat, lng, csrftoken) {
  let formHtml = `
    <form id="add-coordinate-form" method="post">
      <input type="hidden" name="csrfmiddlewaretoken" value="${csrftoken}">
      <div id="latitude">Latitude: ${lat}</div>
      <div id="longitude">Longitude: ${lng}</div>
      <button type="submit">Add Coordinate</button>
    </form>
    `;
  return formHtml;

  // /* old */
  // return `Latitude: ${lat} 
  //         '<br>Longitude: ${lng} 
  //         '<br><button onclick="addCoordinateNew(${lat}, ${lng})">Add to List</button>`;
}

async function addCoordinateNew(lat, lng, csrftoken) {
  var entry;

  const response = await fetch('/add_coordinate/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrftoken,
    },
    body: JSON.stringify({ latitude: lat, longitude: lng})
  });
  if(!response.ok) throw new Error ('failed to add new coordinate');
  let json = await response.json();
  return createEntry(json.coordinate, csrftoken);
  // .then(response => {
  //   console.log('response: ' + response);
  //   return response.json();
  // })
  // .then(data => {
  //   console.log('data: ' + data);
  //   if(data.error) {
  //     console.error(data.error);
  //   } 
  //   else {
  //     console.log(data.message);
  //     if(!data.created) {
  //       // NOTE: change this to show popup dialog instead
  //       console.log("could not add coordinate");
  //     }
  //     entry = createEntry(data.coordinate);
      
  //   }
  // })
  // return entry;
}

// async function add(lat, lng) {
//   try {
//     let response = await addCoordinate(lat, lng);
//     let data = await response.json();

//     let response2 = await addForecast(lat, lng);
//     let data2 = await response2.json();
    
//     // NOTE: kind of a hack, make this cleaner
//     if (data2.length != 14) {
//       throw Error('issue with API, unable to fetch forecasts')
//     }

//     updateCoordinates(data.coordinates);
//   } 
//   catch(error) {
//     console.error('Error: ', error);
//   }
// }

// async function addCoordinate(lat, lng) {
//   return fetch('/add_coordinate/', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'X-CSRFToken': '{{ csrf_token }}',
//     },
//     body: JSON.stringify({ latitude: lat, longitude: lng})
//   })
// }

async function addFirstForecast(lat, lng, csrftoken) {
  let response = await fetch(`/add_forecast/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrftoken,
    },
    body: JSON.stringify({ latitude: lat, longitude: lng})
    // why no body here like addCoorinate? might be worth it to make it consistent
  })
  if (!response.ok) throw new Error('failed to add initial forecast');
  let data = await response.json();
  return data;
}

// should this also be a POST request?
// is this even used anymore?
async function addForecast(lat, lng) {
  const url = `/add_forecast/?lat=${lat}&lng=${lng}`;
  return fetch(url);
}

function displayCoordinates(coordinates) {
  var lst = document.getElementById('coordinate-list');
  lst.innerHTML = '';
  coordinates.forEach(coord => lst.appendChild(createEntry(coord)));
}

function createEntry(coord, csrftoken) {
  const lat = coord.latitude;
  const lng = coord.longitude;
  const pk = coord.pk;

  let coordinateEntry = document.createElement('div');
  // coordinateEntry.id = `${pk}`;
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
  button.classList.add('coordinate');
  button.dataset.lat = lat;
  button.dataset.lng = lng;
  let collapsible = document.createElement('button');
  collapsible.classList.add('collapsible');
  collapsible.textContent = '+';
  // NOTE: prevent double generation of table when click and unclick?
  // change this to block vs hidden
  collapsible.onclick = (e) => {
    // this.classList.toggle("active");
    var content = document.getElementById(`forecast-${pk}`);
    let parent = content.parentElement;
    if (parent == null) {
      throw Error('null parent element for weathergrid)');
    }
    parent.style.display = (parent.style.display === "block") ? "none" : "block";
  }
  collapsible.disabled = true;
  let remove = document.createElement('button');
  remove.textContent = 'x';
  remove.classList.add('remove');
  remove.onclick = (e) => {
    if (confirm("Are you sure you want to delete a coordinate?")) {
      fetch(`/delete/${pk}/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrftoken,
        },
      })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          const divToDelete = document.getElementById(`${pk}`);
          divToDelete.parentElement.remove();
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

  // create progress bar
  let progressBar = document.createElement('div');
  progressBar.classList.add('progress-bar');

  let progressContainer = document.createElement('div');
  progressContainer.classList.add('progress-container');
  progressContainer.appendChild(progressBar);

  let coordinateHeader = document.createElement('div');
  coordinateHeader.classList.add('coordinate-header');
  coordinateHeader.id = pk;

  coordinateHeader.appendChild(button)
  coordinateHeader.appendChild(collapsible)
  coordinateHeader.appendChild(remove);
  coordinateHeader.appendChild(progressContainer);

  coordinateEntry.appendChild(coordinateHeader);
  
  startBar(progressBar);

  let list = document.getElementById('coordinate-list');
  list.appendChild(coordinateEntry);
  return coordinateEntry;
}

function startBar(progressBar) {
  var width = 1;
  setInterval(frame, 40);

  function frame() {
    if (width >= 100) {
      width = 0;
    }
    else {
      width++;
      progressBar.style.width = width + "%";
    }
  }
}

function startProgressBars() {
  let bars = document.getElementsByClassName('progress-bar');
  for(let i=0; i<bars.length; i++) {
    startBar(bars[i]);
  }
}

/*
get coordinates
for each coordinate:
  get forecasts
  create grid (need initial forecast)
  find corresponding coordinate row
  add weather content to that row
*/
async function bindWeatherGrids() {
  let children = document.querySelectorAll(".coordinate-row");
  children.forEach(async child => addWeatherGrid(child));
}

async function addWeatherGrid(child) {
  let pk = child.firstElementChild.id;
  let response = await fetch(`/get_forecasts/${pk}/`);
  let data = await response.json();
  let grid = createGrid(pk, data);
  let weatherContent = document.createElement('div');
  weatherContent.classList.add('content');
  weatherContent.appendChild(grid);
  
  let entry = document.getElementById(pk);
  if(entry) {
    // store progress bar so can remove later
    let progressBar = entry.lastElementChild;
    if (progressBar) {
      entry.removeChild(progressBar);
    }
  }
  let collapsible = child.querySelector(".collapsible");
  collapsible.disabled = false;

  entry.parentElement.appendChild(weatherContent);

  // have to wait until grid is added to the DOM before adding forecasts ...
  addForecastsToGrid(pk, data);
}

// can i just append instead of clearing and re-adding all?
// function updateCoordinates(coordinates) {
//   var listOfCoordinates = document.getElementById('coordinate-list');
//   listOfCoordinates.innerHTML = '';

//   // why is this async? b/c have 'await' stuff later?
//   coordinates.forEach(async coord => {
//     const lat = coord.latitude;
//     const lng = coord.longitude;
//     const pk = coord.pk;

//     let coordinateEntry = document.createElement('div');
//     coordinateEntry.id = `${pk}`;
//     coordinateEntry.classList.add('coordinate-row');
//     let button = document.createElement('button');
//     button.onclick = (e) => {
//       map.setView([lat, lng], zoomLevel);
//       // maybe don't need to assign?
      
//       // this looks a bit cleaner, no?
//       L.marker([lat,lng]).addTo(map).bindPopup(`${lat}, ${lng}`).setLatLng([lat,lng]).openPopup();

//       // let popup = L.popup()
//       //   .setLatLng([lat, lng])
//       //   .setContent(`${lat}, ${lng}`)
//       //   .openOn(map);
//     };
//     button.textContent = `${lat},${lng}`;
//     let collapsible = document.createElement('button');
//     collapsible.classList.add('collapsible');
//     collapsible.textContent = '+';
//     // NOTE: prevent double generation of table when click and unclick?
//     // change this to block vs hidden
//     collapsible.onclick = (e) => {
//       // this.classList.toggle("active");
//       var content = document.getElementById(`forecast-${pk}`);
//       content.parentElement.style.display = content.parentElement.style.display === "block" ? "none" : "block";
//     }
//     let remove = document.createElement('button');
//     remove.textContent = 'x';
//     remove.onclick = (e) => {
//       if (confirm("Are you sure you want to delete a coordinate?")) {
//         fetch(`/delete/${pk}/`, {
//           method: 'POST',
//           headers: {
//             'X-CSRFToken': '{{ csrf_token }}',
//           },
//         })
//         .then(response => response.json())
//         .then(data => {
//           if (data.status === 'success') {
//             const divToDelete = document.getElementById(`${pk}`);
//             divToDelete.remove();
//           }
//           else {
//             // NOTE: are these necessary?
//             alert('Error deleting coordinate');
//           }
//         })
//       }
//       else {
//         // NOTE: are these necessary?
//         alert('Coordinate not deleted.');
//       }
//     }

//     /*
//     how create a grid for each coordinate?
//     need way of identifying the element i'm updating, maybe use primary key?
//     how does primary key work if two identical coordinates?
//     better to create grid in the background instead of basing it on button click, right ... ?

//     create grid here? 
//     fire celery task?

//     what is the sequence of operations?

//     for each coordinate ...
//     create buttons
//     attach events to those buttons
//     -click to go to location on map
//     -toggle button for show/hide weather grid
//     -delete coordinate from list

//     generate weather grid

//     */
    
//     let response = await fetch(`/get_forecasts/${pk}/`);
//     let data = await response.json();
//     let grid = createGrid(pk, data);
//     let weatherContent = document.createElement('div');
//     weatherContent.classList.add('content');
//     weatherContent.appendChild(grid);
//     coordinateEntry.appendChild(button)
//     coordinateEntry.appendChild(collapsible)
//     coordinateEntry.appendChild(remove);
//     coordinateEntry.appendChild(weatherContent);
//     listOfCoordinates.appendChild(coordinateEntry);
    
//     // have to wait until grid is added to the DOM before adding forecasts ...
//     addForecastsToGrid(pk, data);
//   });
// }

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

async function createJustCoordinates() {
  try {
    let response = await fetch('/get_coordinates/');
    let data = await response.json();
    displayCoordinates(data.coordinates);
  } 
  catch(error) {
    console.error('Error: ', error);
  }
}

// NOTE: make function more readable; what exactly does this thing do?
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

  console.log(`***Creating grid for coordinate id=${id}***`)
  // console.log(`first generated date: ${firstGeneratedDate.toString()}`);
  /* 
  why need both first-date and first-generated-at?
  what is first-date? first date for which have forecast data
  what is first-generated-at? generated at time for first forecast data
  */
  grid.setAttribute('data-first-date', firstDate);
  grid.setAttribute('data-first-isdaytime', firstIsDaytime);
  grid.setAttribute('data-first-generated-at', firstGeneratedDate);
  let currentDate = new Date(firstDate);
  let timeOfDay = '';
  for(let i=0; i<8; i++) {
    for(let j=0; j<27; j++) {
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
        -evens will be opposite as first forecast
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

function displayForecastJson(forecastJson) {
  console.log(`generated: ${new Date(forecastJson['generated_at'])}`);
  console.log(`date: ${new Date(forecastJson['date'])}`);
  console.log(`is daytime: ${forecastJson['is_daytime']}`);
  console.log(`temp: ${forecastJson['temperature']}`);
  console.log(`wind speed: ${forecastJson['wind_speed']}`);
  console.log(`wind direction: ${forecastJson['wind_direction']}`);
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

  /*
  why create new dates? maybe b/c attributes are stored as strings ... ?
  */
  // console.log(`firstGeneratedDate: ${firstGeneratedDate.toString()}`);
  // console.log(`targetGeneratedDate: ${targetGeneratedDate.toString()}`);

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

  range of:
  rows: 1-8, 1 (header) + seven days
  columns: 1-27; 1 (header) + 14 days (initial forecast) + 12 (2 * 6) = 27?

  */

  // console.log('===adding new forecast ===');
  /*
  why need both daysBetweenForecastGeneration and numDays?
  -forecast contains an actual date of forecast and a generated date
  -daysBetweenForecastGeneration: compares forecast generation times,
  this determines the grid row
  -numDays: compares how many days between the initial forecast and the
  target forecast, this helps calculate the grid column
  need to convert grid attributes into Date objects so can handle 
  date math, i.e. adding days to date
  */
  // console.log('=calculating generation days=')
  let daysBetweenForecastGeneration = 0;
  while(true) {
    // console.log('first date, day of month: ' + firstGeneratedDate.getDate());
    // console.log('generated date, day of month: ' + targetGeneratedDate.getDate());
    if(firstGeneratedDate.getDate() == targetGeneratedDate.getDate()) {
      break;
    }
    else {
      firstGeneratedDate.setDate(firstGeneratedDate.getDate() + 1);
      daysBetweenForecastGeneration = daysBetweenForecastGeneration + 1;
    }
  }
  // console.log('daysBetweenForecastGeneration: ' + daysBetweenForecastGeneration);

  // console.log('=calculating num days=')
  let numDays = 0;
  while(true) {
    // console.log('first date, day of month: ' + firstDate.getDate());
    // console.log('target date, day of month: ' + targetDate.getDate());
    if(firstDate.getDate() == targetDate.getDate()) {
      break;
    }
    else {
      firstDate.setDate(firstDate.getDate() + 1);
      numDays = numDays + 1;
    }
  }
  // console.log('numDays: ' + numDays);

  let numHalfdays = numDays * 2;
  // console.log(`first isdaytime: ${firstIsDaytime}, typeof: ${typeof(firstIsDaytime)}`);
  // console.log(`target isdaytime: ${targetIsDaytime}, typeof: ${typeof(targetIsDaytime)}`);

  if (firstIsDaytime === true && targetIsDaytime === false) {
    // console.log('plus one');
    numHalfdays = numHalfdays + 1;
  }
  else if(firstIsDaytime === false && targetIsDaytime === true) {
    // console.log('subtract one');
    numHalfdays = numHalfdays - 1;
  }

  // forecast squares start at [2, 2]
  let row = daysBetweenForecastGeneration + 2;
  let col = numHalfdays + 2;

  /*
  range of:
  rows: 1-8, 1 (header) + seven days
  columns: 1-27; 1 (header) + 14 days (initial forecast) + 12 (2 * 6) = 27?
  */

  if(row > 8 || col > 27) {
    return;
  }
  let cell = getGridItem(id, row, col);
  if (cell.style.backgroundColor !== '') {
    console.log('#ERROR# adding forecast to grid: mapping to wrong square');
    console.log(`cell background color: ${cell.style.backgroundColor}`);
    console.log(`id: ${id}, row: ${row}, col: ${col}`);
    displayForecastJson(forecastJson);
    console.log('#end error#');
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
  // console.log(`icon url: ${forecastJson['icon_url']}`);

  let icon = document.createElement('img');
  icon.setAttribute('src', forecastJson['icon_url']);
  icon.setAttribute('alt', 'icon');
  let temp = document.createElement('div');
  let qualifier = forecastJson['is_daytime'] ? 'High' : 'Low';
  temp.textContent = `${qualifier}: ${forecastJson['temperature']}F`;
  let wind = document.createElement('div');
  wind.textContent = `${forecastJson['wind_speed'].replace(" to ", "-")} ${forecastJson['wind_direction']}`;
  let precip = document.createElement('div');
  // console.log(`type of forecastJson[precip_chance]: ${forecastJson['precip_chance']}`);
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
  console.log('~~following forecast added~~');
  displayForecastJson(forecastJson);
  console.log('==end adding forecast==');
}

function getGridItem(id, row, col) {
  let item = document.querySelector(`#forecast-${id} > [data-row="${row}"][data-col="${col}"]`);
  // console.log(`getGridItem return value for id ${id}, row ${row}, col ${col}: ${item}`);
  return item;
}

// NOTE: move this into template ...?
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

// NOTE: maybe change so it adds all event handlers for a coordinate row at once given a certan id, maybe pk?
function setupEventHandlers() {
  let expandAll = document.getElementById('expand');
  expandAll.addEventListener('click', (e) => {
    let rows = document.querySelectorAll(".coordinate-row");
    rows.forEach(row => {
      let grid = row.querySelector(".content");
      grid.style.display = "block";
    });
  });
  
  let collapseAll = document.getElementById('collapse');
  collapseAll.addEventListener('click', (e) => {
    let rows = document.querySelectorAll(".coordinate-row");
    rows.forEach(row => {
      let grid = row.querySelector(".content");
      grid.style.display = "none";
    });
  });

  let mapViews = document.querySelectorAll('.coordinate');
  mapViews.forEach((button) => button.addEventListener('click', (e) => {
    let lat = button.getAttribute('data-lat');
    let lng = button.getAttribute('data-lng');
    map.setView([lat, lng], zoomLevel);
    // maybe don't need to assign?
    
    // this looks a bit cleaner, no?
    L.marker([lat,lng]).addTo(map).bindPopup(`${lat}, ${lng}`).setLatLng([lat,lng]).openPopup();

    // let popup = L.popup()
    //   .setLatLng([lat, lng])
    //   .setContent(`${lat}, ${lng}`)
    //   .openOn(map);
  }));

  collapsibles = document.querySelectorAll(".collapsible");
  collapsibles.forEach((button) => button.addEventListener('click', (e) => {
    // this.classList.toggle("active");

    // NOTE: add better error-checking, encode id in each element?
    let pk = button.parentElement.id;
    var content = document.getElementById(`forecast-${pk}`);
    content.parentElement.style.display = content.parentElement.style.display === "block" ? "none" : "block";
  }));

  let csrftoken = getCookie('csrftoken');
  removeButtons = document.querySelectorAll(".remove");
  removeButtons.forEach((button) => button.addEventListener('click', (e) => {
    let pk = button.parentElement.id;
    if (confirm("Are you sure you want to delete a coordinate?")) {
      fetch(`/delete/${pk}/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrftoken,
        },
      })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          const divToDelete = document.getElementById(pk);
          // NOTE: change this back to deleting coordinate-row later
          divToDelete.parentElement.remove();
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
  }));
}

// NOTE: make name better
function changeSearchView() {
  // separate into a different function?
  document.getElementById('search-form').addEventListener('submit', (e) => {
    // NOTE: why prevent default?
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
}

// NOTE: only add event handlers after DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
  setupEventHandlers();
  startProgressBars();
  setupSearchBar();
  changeSearchView();
});
// showCoordinates();
// createJustCoordinates().then(bindWeatherGrids);
bindWeatherGrids();