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

// Stores data we need to remember between functions
const state = {
  tempC:         null,  // current temperature in Celsius //null means not loaded yet
  forecastHighC: [],    // 7 daily high temps (Celsius)
  forecastLowC:  [],    // 7 daily low temps (Celsius)
  lastCity:      '',    // last searched city (for Retry button)
};