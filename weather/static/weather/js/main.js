// put it all in DOMContentLoaded eventlistener?

let mapLog = [];

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
    let newEntry = await addNewCoordinate(lat, lng, csrftoken);
    await addFirstForecast(lat, lng, csrftoken);
    addWeatherGrid(newEntry);
  });
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
}

async function addNewCoordinate(lat, lng, csrftoken) {
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
}

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

-> bindWeatherGrids
  -> addWeatherGrid(s)
    -> createGrid
    -> addForecastsToGrid

*/
async function bindWeatherGrids() {
  let children = document.querySelectorAll(".coordinate-row");
  // children.forEach(async child => addWeatherGrid(child));
  // **NOTE: the following 'await' keyword is incredibly important
  // await addWeatherGrid(children[0]);
  for(const child of children) {
    await addWeatherGrid(child);
  }
  // children.forEach(child => await addWeatherGrid(child));
}

async function bindWeatherGrids_Test() {
  let children = document.querySelectorAll(".coordinate-row");
  for(const child of children) {
    await addWeatherGrid_Test(child);
  }
}

/*
TO-DO: overall this function does too much, need to clean it up
*/
async function addWeatherGrid_Test(child) {
  let pk = child.firstElementChild.id;
  let response = await fetch(`/get_forecasts/${pk}/`);
  let data = await response.json();
  let grid = createGrid_Test(pk);

  if (!data.length) {
    console.log("no weather data");
    return;
  }
  
  let initial = data[0];
  let firstDate = initial['date'];
  let isDaytime = initial['is_daytime'];
  let generatedAt = initial['generated_at'];
  let gridPlusLabel = updateGridLabels(firstDate, isDaytime, generatedAt, grid);
  let weatherContent = document.createElement('div');
  weatherContent.classList.add('content');
  weatherContent.appendChild(gridPlusLabel);
  
  // TO-DO: really need to clean up this code, not super clear what it does
  let entry = document.getElementById(pk);
  if(entry) {
    // store progress bar so can remove later <-- NOTE: huh?! what does this comment even mean?
    let progressBar = entry.lastElementChild;
    if (progressBar) {
      entry.removeChild(progressBar);
    }
  }
  let collapsible = child.querySelector(".collapsible");
  collapsible.disabled = false;

  entry.parentElement.appendChild(weatherContent);

  // have to wait until grid is added to the DOM before adding forecasts ...
  // addForecastsToGrid(pk, data);
  data.forEach(f => addForecastToGrid_Test(pk, f));
}

/*
create grid and all the grid properties it entails
create row of grid elements (clickable gps coordinate, expand/collapse button, remove entry)
*/
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
    // store progress bar so can remove later <-- NOTE: huh?! what does this comment even mean?
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

/*
better (more pure + testable) workflow for creating weather grid:
create empty grid
update table of earliest forecast and earliest generated date
update labels of grid
have function that takes forecast (generated date + first date) and returns grid id?
*/

function createGrid_Test(id) {
  let grid = document.createElement('div');
  grid.classList.add('forecast-grid');
  // NOTE: is there a cleaner way to do logic such that don't always rely on various id's and hierarchy of id's?
  grid.id = `forecast-${id}`;
  // if (forecasts.length == 0) {
  //   grid.textContent = 'No forecasts to display';
  //   return grid;
  // }
  // NOTE: why start at one as opposed to zero?
  // javascript indexing (and maybe css) in grids, first element is row 1 and column 1
  for(let row=1; row<9; row++) {
    for(let column=1; column<29; column++) {
      let cell = document.createElement('div');
      // NOTE: why update both style and data attribute?
      cell.style.gridRow = row;
      cell.style.gridColumn = column;
      cell.setAttribute('data-row', row);
      cell.setAttribute('data-col', column);
      grid.appendChild(cell);
    }
  }
  return grid;
}

// add css classes to grid + add day labels
function updateGridLabels(date, isDaytime, generatedAt, grid) {
  let firstDate = new Date(date);
  let firstIsDaytime = isDaytime;
  let generatedDate = new Date(generatedAt);
  grid.setAttribute('data-date', firstDate.toISOString());
  grid.setAttribute('data-isdaytime', firstIsDaytime);
  grid.setAttribute('data-generated', generatedDate.toISOString());
  for(let i=0; i<grid.children.length; i++) {
    cell = grid.children[i];
    if (i == 0) {
      cell.classList.add('grid-label');
    }
    // setting grid column lbels
    else if(i < 28) {
      cell.classList.add('grid-label');
      cell.textContent = `${firstDate.toDateString()} ${firstIsDaytime ? 'day' : 'night'}`;
      if(!firstIsDaytime) {
        firstDate.setDate(firstDate.getDate() + 1);
      }
      firstIsDaytime = !firstIsDaytime;
    }
    // setting grid row labels
    else if ((i % 28) == 0) {
      cell.classList.add('grid-label');
      cell.textContent = generatedDate.toDateString();
      generatedDate.setDate(generatedDate.getDate() + 1);
    }
    else {
      cell.classList.add('forecast-cell');
    }
  }
  return grid;
}

/*
just work with UTC time here? or does it make more sense to use local time?
isn't it strange to work with UTC time in rows and PST in columns?

get month + year for each date
create new dates with those months and years
subtract to get the difference

returns number of "days" between gridDate and targetDate
i.e. how many times 12am is crossed

*/
function getRow(gridDate, targetDate) {
  if (gridDate > targetDate) {
    return -1;
  }
  let diff = dayDiff(gridDate, targetDate);
  return diff;
}

function dayDiff(firstDate, secondDate) {
  let date1 = new Date(firstDate);
  let date2 = new Date(secondDate);

  let standard1 = new Date(`${date1.getMonth()+1} ${date1.getDate()}, ${date1.getFullYear()}`);
  let standard2 = new Date(`${date2.getMonth()+1} ${date2.getDate()}, ${date2.getFullYear()}`);
  const msPerDay = (24*60*60*1000);
  return (standard2 - standard1)/msPerDay;
}

/*
have first date, first isDaytime, and when first forecast generated at
given a forecast (date + isDaytime), calculate how many half days between it and the grid's first forecast

maybe just use day diff and then some minor is daytime math?
so if start is day, end is night; then has to be +1?
start is night, end is day; then has to be +1?  


1/1 night, 1/2 day => 1 half day; date diff 1
1/1 night, 1/3 day => 3 half days; date diff 2
1/1 night, 1/4 day => 5 half days; date diff 3

so 2*(dateDiff)-1 is the trick

===========

1/1 day, 1/1 night => 1 half day; date diff: 0
1/1 day, 1/2 night => 3 half day; date diff: 1
1/1 day, 1/3 night => 5 half day; date diff: 2
1/1 day, 1/4 night => 7 half day; date diff: 3

base edge case is a bit different (subtle)



*/

// NOTE: not sure if dates here are handled as strings or actual date objects?
function halfDaysBetween(startDate, startIsDaytime, targetDate, targetIsDaytime) {
  if (startDate > targetDate) {
    return -1;
  }
  let daysBetween = dayDiff(startDate, targetDate);
  if(startIsDaytime && !targetIsDaytime) {
    if(daysBetween === 0) {
      return 1;
    }
    else {
      return 2*daysBetween - 1
    }
  } 
  else if (!startIsDaytime && targetIsDaytime) {
    return 2*daysBetween - 1;
  }
  return daysBetween*2;
}

/*
helper function for doing date arithmetic
*/
function addNDays(date, n) {

}

/*
given a grid and a date + isdaytime, returns row and column id's for date+isdaytime
maybe have to handle off by one error b/c html grid is 1-indexed
*/
function forecastGridCoordinates(grid, date, isDaytime, generated) {
  let gridFirstDate = grid.getAttribute('data-date');
  let gridFirstIsDaytime = grid.getAttribute('data-isdaytime')  === 'true';
  let gridGenerated = grid.getAttribute('data-generated');

  let row = getRow(gridGenerated, generated);
  let column = halfDaysBetween(gridFirstDate, gridFirstIsDaytime, date, isDaytime);

  // include error checking?
  return [row, column];
}

function createForecastCell(row, column, forecastJson) {
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

  let cell = document.createElement('div');
  cell.classList.add('forecast-cell');
  // NOTE: why update both style and data attribute?
  // also maybe this code is duplicate ...?
  cell.style.gridRow = row;
  cell.style.gridColumn = column;
  cell.setAttribute('data-row', row);
  cell.setAttribute('data-col', column);
  
  cell.appendChild(icon);
  cell.appendChild(temp);
  cell.appendChild(wind);
  cell.appendChild(precip);
  cell.style.backgroundColor = "Aquamarine";
  cell.setAttribute('title', forecastJson['description']);
  return cell;
}

function updateForecastCell(id, row, column, forecastJson) {
  // let newCell = createForecastCell(row, column, forecastJson);

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

  let cell = getGridItem(id, row, column);
  if(cell === null) {
    throw new Error(`invalid grid item accessed. id: ${id}, row: ${row}, col: ${column}`);
  }
  cell.innerHTML = '';
  // NOTE: why update both style and data attribute?
  // also maybe this code is duplicate ...?
  // cell.style.gridRow = row;
  // cell.style.gridColumn = column;
  // cell.setAttribute('data-row', row);
  // cell.setAttribute('data-col', column);
  
  cell.appendChild(icon);
  cell.appendChild(temp);
  cell.appendChild(wind);
  cell.appendChild(precip);
  cell.style.backgroundColor = "Aquamarine";
  cell.setAttribute('title', forecastJson['description']);
  return cell;

  oldCell.innerHTML = newCell.getHTML();
}

/*
get grid 
extract info from forecast
get grid coordinates for forecast
update cell
*/
function addForecastToGrid_Test(id, forecast) {
  let grid = document.getElementById(`forecast-${id}`);
  let date = forecast['date'];
  let isDaytime = forecast['is_daytime'];
  let generated = forecast['generated_at'];

  let coordinates = forecastGridCoordinates(grid, date, isDaytime, generated);
  // include error checking here?
  let row = coordinates[0];
  let column = coordinates[1];
  if (row < 0 || row > 8 || column < 0 || column > 28) {
    throw new Error(`invalid grid coordinate. row: ${row}, col: ${column}`);
  }
  updateForecastCell(id, row+2, column+2, forecast);
}

// NOTE: make function more readable; what exactly does this thing do?
/*
create a grid div element, add some basic attributes
get first forecast
set first forecast attributes on grid
create cells of grid (empty ones + row and column headers)
set attributes for these cells
return the grid

alternative solution:
create empty grid
add row + column labels

have a function for calculating number of half days between two dates
then a function for calculating grid row and column given a start date and target date

better to have a data structure in the background mapping coordinate (or id?) to first forecast and first generated date?
this might be a better solution because can generate a report instead of using maplog everywhere?

jest or mocha or qunit or vitest for javascript testing framework?

*/

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

  mapLog.push(`grid firstGeneratedDate: ${new Date(firstGeneratedDate).toUTCString()}, firstDate: ${new Date(firstDate).toUTCString()}, firstDate isdaytime: ${firstIsDaytime}`);

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
  /*
  why i<8 and j<27?
  i: trying to store a week's worth of weather data (7) and +1 for header so 8
  j: a week's worth is weather data is 14 forecasts (7 days + 7 nights), then each subsequent day need 2 more so 14+(6*2)=26, then +1 for header so 27
  */
  for(let i=0; i<8; i++) {
    for(let j=0; j<27; j++) {
      let element = document.createElement('div');
      if(i == 0 && j == 0) {
        // do nothing?
      }
      // setup column headers
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

        // if first forecast is night time, then new days will be on even columns
        if(!firstIsDaytime) {
          if (j % 2 == 0) {
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
        // else first forecast is day time, so new days will be on odd columns
        else {
          // don't want to re-increment the first date so skip it
          if (j > 1 && j % 2 == 1) {
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
        
        // NOTE: find better way to write this, kind of confusing atm
        // if j is odd, then time of day is same as first forecast's time of day
        if(j % 2 == 1) {
          timeOfDay = firstIsDaytime ? '' : 'night';
        }
        // if j is even, then time of day is opposite of first forecasts's time of day
        else {
          timeOfDay = !firstIsDaytime ? '' : 'night';
        }
        element.textContent = `${currentDate.toDateString()} ${timeOfDay}`;
      }
      // setup row headers
      // calculate day of week name or just use numerical dates?
      else if (i > 0 && j == 0) {
        // should this be firstDate or firstGeneratedDate?
        let nextForecastDate = new Date(firstGeneratedDate);
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
  // NOTE: why not use toUTCTime() ?
  console.log(`generated: ${new Date(forecastJson['generated_at']).toUTCString()}`);
  console.log(`for date: ${new Date(forecastJson['date']).toUTCString()}`);
  console.log(`is daytime: ${forecastJson['is_daytime']}`);
  console.log(`temp: ${forecastJson['temperature']}`);
  console.log(`wind speed: ${forecastJson['wind_speed']}`);
  console.log(`wind direction: ${forecastJson['wind_direction']}`);
} 

/*
how efficiently get icons from server? maybe do some cache?
it's going to be a lot of fetch requests

how map the date to the row + column of the grid?

what's the difference between firstDate and firstGeneratedDate?

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

  goal is trying to count the number of half-days periods
  if both are day or both are night, then it's easy
  if first is day and target is night, then # halfdays +1 ?
  if first is night and target is day, then # halfdays -1 ?

  start date: 1/1 day
  target date: 1/2 night
  target date: 1/1 night

  start date: 1/1 night
  target date: 1/2 day
  target date: 1/3 day

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

  // The getDate() method of Date instances returns the day of the month for this date according to local time.

  /*
  // trying to determine the row ...
  // console.log('=calculating generation days=')
  let daysBetweenForecastGeneration = 0;
  // NOTE: why is this a while loop? why not do date arithmetic?
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

  // trying to determine the column ... 
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
  */
  let daysBetweenForecastGeneration = (targetGeneratedDate.getUTCDate() - firstGeneratedDate.getUTCDate());
  let numDays = (targetDate.getUTCDate() - firstDate.getUTCDate());

  let numHalfdays = numDays * 2;
  // console.log(`first isdaytime: ${firstIsDaytime}, typeof: ${typeof(firstIsDaytime)}`);
  // console.log(`target isdaytime: ${targetIsDaytime}, typeof: ${typeof(targetIsDaytime)}`);

  // if first is day and target is night
  if (firstIsDaytime === true && targetIsDaytime === false) {
    // console.log('plus one');
    numHalfdays = numHalfdays + 1;
  }
  // if first is night and target is day
  else if(firstIsDaytime === false && targetIsDaytime === true) {
    // console.log('subtract one');
    // NOTE: not sure if this logic works? why subtract one?
    numHalfdays = numHalfdays + 1;
  }

  // forecast squares start at [2, 2]
  let row = daysBetweenForecastGeneration + 2;
  let col = numHalfdays + 2;

  mapLog.push(`id: ${id}, created: ${targetGeneratedDate.toUTCString()}, target: ${targetDate.toUTCString()}, daytime: ${targetIsDaytime}, mapped to row: ${row}, col: ${col}`);

  /*
  range of:
  rows: 1-8, 1 (header) + seven days
  columns: 1-27; 1 (header) + 14 days (initial forecast) + 12 (2 * 6) = 27?

  nobody occupies [1, 1]
  headers occupy: [1, (2 ... n)] and [(2 ... n), 1]

  */

  if(row > 8 || row < 1 || col > 27 || col < 1) {
    console.log("#ERROR# received out of range row or col")
    console.log(`id: ${id}, row: ${row}, col: ${col}`);
    console.log('#end error#');
    return;
  }

  if (row < 2 || col < 2) {
    console.log("#ERROR# forecast row or col occupies grid header")
    console.log(`id: ${id}, row: ${row}, col: ${col}`);
    console.log('#end error#');
    return;
  }

  let cell = getGridItem(id, row, col);
  if (cell.style.backgroundColor !== '') {
    console.log('#ERROR# adding forecast to grid: mapping to wrong square');
    console.log(`cell background color: ${cell.style.backgroundColor}`);
    console.log(`id: ${id}, row: ${row}, col: ${col}`);
    displayForecastJson(forecastJson);
    console.log('#end error#');
    return;
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
function setupMapSearchHandler() {
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
  setupMapSearchHandler();
});
// showCoordinates();
// createJustCoordinates().then(bindWeatherGrids);

// bindWeatherGrids();

async function asyncFunction() {
  // await bindWeatherGrids();
  await bindWeatherGrids_Test();
}

// is this trickery for getting maplog to work?
asyncFunction().then(() => {
  console.log("enter async function");
  mapLog.forEach((i) => console.log(i));
});

// let asyncFoo = new Promise((resolve, reject) => {
//   bindWeatherGrids();
// })

// asyncFoo.then(() => {
//   console.log("enter async function");
//   mapLog.forEach((i) => console.log(i));
// })
