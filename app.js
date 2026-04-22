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