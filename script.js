/* ==========================================================
   API configuration
   ========================================================== */
// Put your OpenWeatherMap API key here. Get a free one at
// https://openweathermap.org/api — sign up, then find it under "API keys."
const API_KEY = "f6180c20fb0bc00f9b607137dd48748a";        // 👈 PUT YOUR API KEY HERE, between the quotes

const CURRENT_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

/* ==========================================================
   Selecting elements
   ========================================================== */
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const locateBtn = document.getElementById('locate-btn');

const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error-state');
const errorMessageEl = document.getElementById('error-message');

const weatherCard = document.getElementById('weather-card');
const detailsGrid = document.getElementById('details-grid');
const sunTimes = document.getElementById('sun-times');
const forecastSection = document.getElementById('forecast');
const forecastList = document.getElementById('forecast-list');

const weatherFx = document.getElementById('weather-fx');
const lightningFlash = document.getElementById('lightning-flash');

let thunderInterval = null;

/* ==========================================================
   Event listeners
   ========================================================== */
searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const city = cityInput.value.trim();
  if (city === '') return;
  getWeather(city);
});

locateBtn.addEventListener('click', getUserLocation);

/* ==========================================================
   Geolocation
   ========================================================== */
function getUserLocation() {
  if (!navigator.geolocation) {
    showError("Geolocation isn't supported by your browser.");
    return;
  }

  showLoading();

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      getWeatherByCoords(latitude, longitude);
    },
    () => {
      showError("Location access was denied. Try searching a city instead.");
    }
  );
}

/* ==========================================================
   Fetching weather — by city name
   ========================================================== */
async function getWeather(city) {
  showLoading();

  try {
    const currentRes = await fetch(
      `${CURRENT_WEATHER_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
    );

    if (!currentRes.ok) {
      throw new Error(currentRes.status === 404 ? "City not found. Check the spelling and try again." : "Something went wrong fetching the weather.");
    }

    const currentData = await currentRes.json();

    const forecastRes = await fetch(
      `${FORECAST_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
    );
    const forecastData = await forecastRes.json();

    displayWeather(currentData);
    displayForecast(forecastData);
  } catch (error) {
    showError(error.message);
  }
}

/* ==========================================================
   Fetching weather — by coordinates (used by Geolocation)
   ========================================================== */
async function getWeatherByCoords(lat, lon) {
  try {
    const currentRes = await fetch(
      `${CURRENT_WEATHER_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );

    if (!currentRes.ok) {
      throw new Error("Couldn't fetch weather for your location.");
    }

    const currentData = await currentRes.json();

    const forecastRes = await fetch(
      `${FORECAST_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );
    const forecastData = await forecastRes.json();

    displayWeather(currentData);
    displayForecast(forecastData);
  } catch (error) {
    showError(error.message);
  }
}

/* ==========================================================
   Displaying current weather
   ========================================================== */
function displayWeather(data) {
  const weather = data.weather[0];
  const isDay = getIsDay(data.sys.sunrise, data.sys.sunset, data.dt);

  document.getElementById('city-name').textContent = `${data.name}, ${data.sys.country}`;
  document.getElementById('date-time').textContent = formatDateTime(data.dt, data.timezone);
  document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
  document.getElementById('weather-icon').alt = weather.description;

  document.getElementById('temperature').textContent = Math.round(data.main.temp);
  document.getElementById('description').textContent = weather.description;
  document.getElementById('feels-like').textContent = `Feels like ${Math.round(data.main.feels_like)}°`;

  document.getElementById('humidity-value').textContent = `${data.main.humidity}%`;
  document.getElementById('wind-value').textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
  document.getElementById('pressure-value').textContent = `${data.main.pressure} hPa`;
  document.getElementById('visibility-value').textContent = `${(data.visibility / 1000).toFixed(1)} km`;

  document.getElementById('sunrise-value').textContent = formatTime(data.sys.sunrise, data.timezone);
  document.getElementById('sunset-value').textContent = formatTime(data.sys.sunset, data.timezone);

  updateWeatherBackground(weather.id, isDay);

  showResults();
}

/* ==========================================================
   Displaying the 5-day forecast
   ========================================================== */
function displayForecast(data) {
  const dailyEntries = data.list.filter((entry) => entry.dt_txt.includes('12:00:00'));

  forecastList.innerHTML = '';

  dailyEntries.forEach((entry) => {
    const dayName = new Date(entry.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' });
    const icon = entry.weather[0].icon;
    const temp = Math.round(entry.main.temp);

    const dayEl = document.createElement('div');
    dayEl.className = 'forecast-day';
    dayEl.innerHTML = `
      <span class="day-name">${dayName}</span>
      <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${entry.weather[0].description}" />
      <span class="day-temp">${temp}°</span>
    `;

    forecastList.appendChild(dayEl);
  });
}

/* ==========================================================
   Day / night detection
   ========================================================== */
function getIsDay(sunrise, sunset, currentTime) {
  return currentTime > sunrise && currentTime < sunset;
}

/* ==========================================================
   Mapping the API's condition code to our CSS classes
   ========================================================== */
function getWeatherClass(conditionId) {
  if (conditionId >= 200 && conditionId <= 232) return 'weather-thunderstorm';
  if (conditionId >= 300 && conditionId <= 321) return 'weather-drizzle';
  if (conditionId >= 500 && conditionId <= 531) return 'weather-rain';
  if (conditionId >= 600 && conditionId <= 622) return 'weather-snow';
  if (conditionId >= 701 && conditionId <= 781) return 'weather-mist';
  if (conditionId === 800) return 'weather-clear';
  if (conditionId >= 801 && conditionId <= 804) return 'weather-clouds';
  return 'weather-clear';
}

/* ==========================================================
   Updating the background (the core dynamic feature)
   ========================================================== */
function updateWeatherBackground(conditionId, isDay) {
  const weatherClass = getWeatherClass(conditionId);

  document.body.className = '';
  document.body.classList.add(weatherClass);
  document.body.classList.add(isDay ? 'is-day' : 'is-night');

  clearWeatherFx();

  if (weatherClass === 'weather-rain' || weatherClass === 'weather-drizzle') {
    createRain(weatherClass === 'weather-drizzle' ? 40 : 80);
  }

  if (weatherClass === 'weather-thunderstorm') {
    createRain(90);
    startLightning();
  }

  if (weatherClass === 'weather-snow') {
    createSnow(60);
  }

  if (weatherClass === 'weather-mist') {
    createFog();
  }

  if (!isDay) {
    createStars(70);
  }
}

/* ==========================================================
   Particle generators
   ========================================================== */
function clearWeatherFx() {
  weatherFx.innerHTML = '';
  if (thunderInterval) {
    clearInterval(thunderInterval);
    thunderInterval = null;
  }
}

function createRain(count) {
  for (let i = 0; i < count; i++) {
    const drop = document.createElement('div');
    drop.className = 'raindrop';
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.animationDuration = `${0.5 + Math.random() * 0.5}s`;
    drop.style.animationDelay = `${Math.random() * 2}s`;
    weatherFx.appendChild(drop);
  }
}

function createSnow(count) {
  for (let i = 0; i < count; i++) {
    const flake = document.createElement('div');
    flake.className = 'snowflake';
    const size = 3 + Math.random() * 4;
    flake.style.width = `${size}px`;
    flake.style.height = `${size}px`;
    flake.style.left = `${Math.random() * 100}%`;
    flake.style.animationDuration = `${4 + Math.random() * 4}s`;
    flake.style.animationDelay = `${Math.random() * 5}s`;
    weatherFx.appendChild(flake);
  }
}

function createStars(count) {
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = 1 + Math.random() * 2;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 60}%`;
    star.style.animationDuration = `${2 + Math.random() * 3}s`;
    star.style.animationDelay = `${Math.random() * 3}s`;
    weatherFx.appendChild(star);
  }
}

function createFog() {
  for (let i = 0; i < 4; i++) {
    const layer = document.createElement('div');
    layer.className = 'fog-layer';
    layer.style.top = `${15 + i * 20}%`;
    layer.style.animationDuration = `${20 + i * 6}s`;
    weatherFx.appendChild(layer);
  }
}

function startLightning() {
  thunderInterval = setInterval(() => {
    lightningFlash.classList.add('flash');
    setTimeout(() => lightningFlash.classList.remove('flash'), 400);
  }, 5000 + Math.random() * 5000);
}

/* ==========================================================
   Formatting helpers
   ========================================================== */
function formatTime(unixSeconds, timezoneOffsetSeconds) {
  const date = new Date((unixSeconds + timezoneOffsetSeconds) * 1000);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

function formatDateTime(unixSeconds, timezoneOffsetSeconds) {
  const date = new Date((unixSeconds + timezoneOffsetSeconds) * 1000);
  return date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC'
  });
}

/* ==========================================================
   UI state helpers
   ========================================================== */
function showLoading() {
  loadingEl.classList.add('visible');
  errorEl.classList.remove('visible');
  weatherCard.classList.remove('visible');
  detailsGrid.classList.remove('visible');
  sunTimes.classList.remove('visible');
  forecastSection.classList.remove('visible');
}

function showResults() {
  loadingEl.classList.remove('visible');
  errorEl.classList.remove('visible');
  weatherCard.classList.add('visible');
  detailsGrid.classList.add('visible');
  sunTimes.classList.add('visible');
  forecastSection.classList.add('visible');
}

function showError(message) {
  loadingEl.classList.remove('visible');
  weatherCard.classList.remove('visible');
  detailsGrid.classList.remove('visible');
  sunTimes.classList.remove('visible');
  forecastSection.classList.remove('visible');

  errorMessageEl.textContent = message;
  errorEl.classList.add('visible');
}

/* ==========================================================
   Initial load — show a default city so the page isn't empty
   ========================================================== */
getWeather('London');