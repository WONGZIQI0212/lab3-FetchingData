(function (){
  'use strict';

const WMO_CODES = {
  0:  { desc: 'Clear Sky',           icon: '☀️' },
  1:  { desc: 'Mainly Clear',        icon: '🌤️' },
  2:  { desc: 'Partly Cloudy',       icon: '⛅' },
  3:  { desc: 'Overcast',            icon: '☁️' },
  45: { desc: 'Foggy',               icon: '🌫️' },
  48: { desc: 'Rime Fog',            icon: '🌫️' },
  51: { desc: 'Light Drizzle',       icon: '🌦️' },
  61: { desc: 'Slight Rain',         icon: '🌧️' },
  63: { desc: 'Moderate Rain',       icon: '🌧️' },
  65: { desc: 'Heavy Rain',          icon: '🌧️' },
  71: { desc: 'Slight Snow',         icon: '🌨️' },
  80: { desc: 'Rain Showers',        icon: '🌦️' },
  95: { desc: 'Thunderstorm',        icon: '⛈️' },
};

function getWeatherInfo(code) {
  return WMO_CODES[code] || { desc: 'Unknown', icon: '🌡️' };
} //use Unknown as fallback instead of crashing

// Shorthand so we don't type document.getElementById() every time
const getEl = (id) => document.getElementById(id);

// All the HTML elements we need to update (grab all at once)
const els = {
  cityInput:     getEl('cityInput'),
  searchBtn:     getEl('searchBtn'),
  validationMsg: getEl('validationMsg'),
  errorBanner:   getEl('errorBanner'),
  errorMsg:      getEl('errorMsg'),
  retryBtn:      getEl('retryBtn'),
  cityName:      getEl('cityName'),
  weatherDesc:   getEl('weatherDesc'),
  localTime:     getEl('localTime'),
  weatherIcon:   getEl('weatherIcon'),
  temperature:   getEl('temperature'),
  humidity:      getEl('humidity'),
  windspeed:     getEl('windspeed'),
  forecastRow:   getEl('forecastRow'),
};

// jQuery is loaded via CDN in index.html
// alias it to jQ so it doesn't clash with getEl shorthand
const jQ = window.jQuery;

// Stores data we need to remember between functions
const state = {
  tempC:         null,  // current temperature in Celsius //null means not loaded yet
  forecastHighC: [],    // 7 daily high temps (Celsius)
  forecastLowC:  [],    // 7 daily low temps (Celsius)
  lastCity:      '',    // last searched city (for Retry button)
};

// List of element IDs that show skeleton animation while loading
const SKELETON_IDS = [
  'cityName', 'weatherDesc', 'localTime',
  'weatherIcon', 'temperature', 'humidity', 'windspeed',
];

// Adds skeleton shimmer to all placeholders
function showSkeletons() {
  SKELETON_IDS.forEach((id) => getEl(id).classList.add('skeleton'));

  document.querySelectorAll('.fc-day, .fc-icon, .fc-high, .fc-low')
    .forEach((el) => el.classList.add('skeleton'));
}

// Removes skeleton shimmer after data arrives
function removeSkeletons() {
  SKELETON_IDS.forEach((id) => getEl(id).classList.remove('skeleton'));

  document.querySelectorAll('.fc-day, .fc-icon, .fc-high, .fc-low')
    .forEach((el) => el.classList.remove('skeleton'));
}

// Builds 7 empty forecast cards on page load
function buildForecastShells() {
  els.forecastRow.innerHTML = '';

  for (let i = 0; i < 7; i++) {
    els.forecastRow.innerHTML += `
      <div class="forecast-card" id="fc-${i}">
        <span class="fc-day  skeleton">&#8203;</span>
        <span class="fc-icon skeleton">&#8203;</span>
        <span class="fc-high skeleton">&#8203;</span>
        <span class="fc-low  skeleton">&#8203;</span>
      </div>
    `;
  }
}

// FETCH API CHAIN: main task 2 functions to fet weather data

//TURN CITYNAME INTO LAT/LON

async function geocodeCity(cityName) {

  // Build the URL with the city name safely encoded
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;

  // AbortController lets us cancel the request after 10 seconds
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 10000);

  try {
    // Make the request
    const response = await fetch(url, { signal: controller.signal });

    // Cancel the 10s timer — response came in time
    clearTimeout(timeoutId);

    // If server replied with an error (404, 500 etc.), throw it
    if (!response.ok) {
      throw new Error(`Geocoding failed: HTTP ${response.status}`);
    }

    // Convert the response to a JavaScript object
    const data = await response.json();

    // If results array is empty, city was not found
    if (!data.results || data.results.length === 0) {
      showError(`City "${cityName}" not found. Try another name.`);
      return null; // stop here, do NOT throw
    }

    // Pull out what we need from the first result
    const { latitude, longitude, timezone, name, country } = data.results[0];

    return { latitude, longitude, timezone, displayName: `${name}, ${country}` };

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      showError('Request timed out after 10 seconds. Check your internet.');
    } else {
      showError(err.message);
    }

    return null;
  }
}

// FETCH WEATHER

async function fetchWeather(lat, lon) {

  // Build URL with all the data fields we want
  const params = new URLSearchParams({
    latitude:        lat,
    longitude:       lon,
    current_weather: true,
    hourly:          'temperature_2m,relativehumidity_2m,windspeed_10m',
    daily:           'temperature_2m_max,temperature_2m_min,weathercode',
    timezone:        'auto',
    forecast_days:   7,
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Weather API failed: HTTP ${response.status}`);
    }

    return await response.json();

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      showError('Request timed out after 10 seconds.');
    } else {
      showError(err.message);
    }

    return null;
  }
}

// FILL THE CARDS WITH DATA

function populateUI(displayName, weatherData) {

  const cw     = weatherData.current_weather; // current conditions
  const daily  = weatherData.daily;           // 7-day arrays
  const hourly = weatherData.hourly;          // hourly arrays

  // Look up the weather code to get text + emoji
  const info = getWeatherInfo(cw.weathercode);

  // Save Celsius values to state (needed later for C/F toggle)
  state.tempC         = cw.temperature;
  state.forecastHighC = [...daily.temperature_2m_max];
  state.forecastLowC  = [...daily.temperature_2m_min];

  // Fill the current weather card
  els.cityName.textContent    = displayName;
  els.weatherIcon.textContent = info.icon;
  els.weatherDesc.textContent = info.desc;
  els.temperature.textContent = `${Math.round(cw.temperature)}°C`;

  // Find which hourly index matches "right now"
  const nowIdx = findClosestHourIndex(hourly.time);
  els.humidity.textContent  = `${hourly.relativehumidity_2m[nowIdx]}%`;
  els.windspeed.textContent = `${hourly.windspeed_10m[nowIdx]} km/h`;

  // Fill the 7 forecast cards
  for (let i = 0; i < 7; i++) {
    const card = document.getElementById(`fc-${i}`);

    const dayName = new Date(daily.time[i])
      .toLocaleDateString('en-US', { weekday: 'short' });

    const fcInfo = getWeatherInfo(daily.weathercode[i]);

    card.querySelector('.fc-day' ).textContent = dayName;
    card.querySelector('.fc-icon').textContent = fcInfo.icon;
    card.querySelector('.fc-high').textContent = `${Math.round(daily.temperature_2m_max[i])}°C`;
    card.querySelector('.fc-low' ).textContent = `${Math.round(daily.temperature_2m_min[i])}°C`;
  }

  // Remove all skeleton shimmer — data is ready!
  removeSkeletons();
}

// Helper: find the hourly index closest to the current time
function findClosestHourIndex(timeArray) {
  const now  = Date.now();
  let best   = 0;
  let diff   = Infinity;

  timeArray.forEach((t, i) => {
    const d = Math.abs(new Date(t).getTime() - now);
    if (d < diff) { diff = d; best = i; }
  });

  return best;
}

// FETCH LOCAL TIME

function fetchLocalTime(timezone) {

  // Build the WorldTimeAPI URL using the timezone string
  // Example: timezone = "Asia/Kuala_Lumpur"
  // URL becomes: https://worldtimeapi.org/api/timezone/Asia/Kuala_Lumpur
  const url = `https://worldtimeapi.org/api/timezone/${timezone}`;

  jQ.getJSON(url)

    .done(function (data) {
      // .done() runs when the request SUCCEEDS

      // data.datetime looks like: "2024-07-01T14:35:22.123+08:00"
      // We convert it to a Date object, then format it nicely
      const dt   = new Date(data.datetime);
      const time = dt.toLocaleTimeString('en-US', {
        hour:   '2-digit',
        minute: '2-digit',
      });

      // Show it in the weather card
      els.localTime.textContent = `🕐 Local time: ${time}`;
    })

    .fail(function () {
      // .fail() runs when the request FAILS
      // (bad internet, timezone not found, API down)

      // Fall back to the browser's own clock
      const time = new Date().toLocaleTimeString('en-US', {
        hour:   '2-digit',
        minute: '2-digit',
      });

      els.localTime.textContent = `🕐 Local time: ${time} (device)`;
    })

    .always(function () {
      // .always() runs whether it succeeded OR failed
      // Required by the lab: log a timestamp to the console
      console.log(`[WeatherNow] WorldTimeAPI call finished at ${new Date().toISOString()}`);
    });

}





// Wire everything together

// Shows the red error banner
function showError(message) {
  els.errorMsg.textContent = message;
  els.errorBanner.classList.remove('hidden');
}

// Hides the red error banner
function hideError() {
  els.errorBanner.classList.add('hidden');
}

// Helper functions

function showValidation(msg) {
  // fills the <p id="validationMsg"> and makes it visible
  els.validationMsg.textContent = msg;
  els.validationMsg.classList.remove('hidden');
}

function hideValidation() {
  // hides it again once user types something valid
  els.validationMsg.classList.add('hidden');
}

// Debounce

function debounce(fn, delay) {
  // timer is remembered between calls because of closure
  let timer;

  return function (...args) {
    // cancel the previous countdown every time this runs
    clearTimeout(timer);

    // start a fresh countdown
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// Wrap handleSearch with a 500ms debounce
const debouncedSearch = debounce(handleSearch, 500);

// The main function — runs when Search is clicked
async function handleSearch() {
  const city = els.cityInput.value.trim();

    // ── VALIDATION  ──
  if (city.length === 0) {
    showValidation('Please enter a city name.');
    return;
  }
  if (city.length < 2) {
    showValidation('City name must be at least 2 characters.');
    return;
  }
  hideValidation(); // clear any old message

  hideError();
  showSkeletons();

  state.lastCity = city;

  // Step A: get coordinates
  const geo = await geocodeCity(city);
  if (!geo) { removeSkeletons(); return; }

  // Step B: get weather using those coordinates
  const weather = await fetchWeather(geo.latitude, geo.longitude);
  if (!weather) { removeSkeletons(); return; }

  // Step C: fill the UI
  populateUI(geo.displayName, weather);

  // fetch local time
fetchLocalTime(geo.timezone);
}

// Runs once when the page first loads
document.addEventListener('DOMContentLoaded', () => {
  buildForecastShells();  // create the 7 skeleton cards

  // Search button click
  els.searchBtn.addEventListener('click', handleSearch);

  // Pressing Enter also triggers search
  els.cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // Debounce
  els.cityInput.addEventListener('input', debouncedSearch);

  // Retry button re-runs last search
  els.retryBtn.addEventListener('click', () => {
    if (state.lastCity) {
      els.cityInput.value = state.lastCity;
      handleSearch();
    }
  });
});

})();