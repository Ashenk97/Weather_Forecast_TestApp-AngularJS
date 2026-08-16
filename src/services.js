import { weatherApp } from "./app.js";
import { weatherUtils } from "./lib/weather-utils.js";

weatherApp.constant("POPULAR_CITIES", [
  {
    name: "New York",
    country: "United States",
    admin1: "New York",
    latitude: 40.7128,
    longitude: -74.006,
    flag: "🇺🇸",
  },
  {
    name: "London",
    country: "United Kingdom",
    admin1: "England",
    latitude: 51.5074,
    longitude: -0.1278,
    flag: "🇬🇧",
  },
  {
    name: "Tokyo",
    country: "Japan",
    admin1: "Tokyo",
    latitude: 35.6762,
    longitude: 139.6503,
    flag: "🇯🇵",
  },
  {
    name: "Paris",
    country: "France",
    admin1: "Île-de-France",
    latitude: 48.8566,
    longitude: 2.3522,
    flag: "🇫🇷",
  },
  {
    name: "Sydney",
    country: "Australia",
    admin1: "New South Wales",
    latitude: -33.8688,
    longitude: 151.2093,
    flag: "🇦🇺",
  },
  {
    name: "Colombo",
    country: "Sri Lanka",
    admin1: "Western Province",
    latitude: 6.9271,
    longitude: 79.8612,
    flag: "🇱🇰",
  },
]);

weatherApp.factory("weatherUtils", function () {
  return weatherUtils;
});

weatherApp.service("storageService", function () {
  this.read = function (key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  };

  this.write = function (key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      // Ignore quota / private-mode failures.
    }
  };
});

weatherApp.service("skyService", function () {
  this.theme = "clear-day";

  this.set = function (theme) {
    this.theme = theme || "clear-day";
  };
});

weatherApp.service("cityService", [
  "storageService",
  "weatherUtils",
  "POPULAR_CITIES",
  function (storageService, weatherUtils, POPULAR_CITIES) {
    var RECENTS_KEY = "skycast.recents";
    var UNIT_KEY = "skycast.unit";

    this.selected = null;
    this.unit = storageService.read(UNIT_KEY, "C");
    this.recents = storageService.read(RECENTS_KEY, []);
    this.popular = POPULAR_CITIES;

    this.setUnit = function (unit) {
      this.unit = unit === "F" ? "F" : "C";
      storageService.write(UNIT_KEY, this.unit);
    };

    this.select = function (place) {
      if (!place) return;
      this.selected = {
        name: place.name,
        country: place.country || "",
        admin1: place.admin1 || "",
        latitude: place.latitude,
        longitude: place.longitude,
        flag: place.flag || "",
        label: weatherUtils.formatPlace(place),
      };
      this.remember(this.selected);
    };

    this.remember = function (place) {
      var next = (this.recents || []).filter(function (item) {
        return item.latitude !== place.latitude || item.longitude !== place.longitude;
      });
      next.unshift(place);
      this.recents = next.slice(0, 6);
      storageService.write(RECENTS_KEY, this.recents);
    };
  },
]);

weatherApp.service("weatherService", [
  "$http",
  "$q",
  "weatherUtils",
  function ($http, $q, weatherUtils) {
    var GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
    var REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
    var FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
    var AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
    var forecastCache = {};
    var snapshotCache = {};

    this.searchCities = function (query) {
      if (!query || String(query).trim().length < 2) {
        return $q.resolve([]);
      }

      return $http
        .get(GEOCODE_URL, {
          params: {
            name: String(query).trim(),
            count: 6,
            language: "en",
            format: "json",
          },
        })
        .then(function (response) {
          return response.data.results || [];
        });
    };

    this.reverseGeocode = function (latitude, longitude) {
      return $http
        .get(REVERSE_URL, {
          params: {
            lat: latitude,
            lon: longitude,
            format: "jsonv2",
            addressdetails: 1,
          },
        })
        .then(function (response) {
          var address = (response.data && response.data.address) || {};
          return {
            name:
              address.city ||
              address.town ||
              address.village ||
              address.municipality ||
              address.suburb ||
              "Your location",
            country: address.country || "",
            admin1: address.state || address.region || "",
            latitude: latitude,
            longitude: longitude,
          };
        })
        .catch(function () {
          return {
            name: "Your location",
            country: "",
            admin1: "",
            latitude: latitude,
            longitude: longitude,
          };
        });
    };

    function cacheKeyFor(latitude, longitude) {
      return Number(latitude).toFixed(3) + "," + Number(longitude).toFixed(3);
    }

    this.peekForecast = function (latitude, longitude) {
      return forecastCache[cacheKeyFor(latitude, longitude)] || null;
    };

    this.getSnapshot = function (latitude, longitude) {
      var cacheKey = cacheKeyFor(latitude, longitude);
      if (snapshotCache[cacheKey]) {
        return $q.resolve(snapshotCache[cacheKey]);
      }

      return $http
        .get(FORECAST_URL, {
          params: {
            latitude: latitude,
            longitude: longitude,
            current: "temperature_2m,weather_code,is_day",
            timezone: "auto",
          },
        })
        .then(function (response) {
          var current = response.data.current;
          var snap = {
            temperature: Math.round(current.temperature_2m),
            meta: weatherUtils.interpret(current.weather_code, current.is_day),
          };
          snapshotCache[cacheKey] = snap;
          return snap;
        });
    };

    this.getForecast = function (latitude, longitude) {
      var cacheKey = cacheKeyFor(latitude, longitude);
      if (forecastCache[cacheKey]) {
        return $q.resolve(forecastCache[cacheKey]);
      }

      return $q
        .all({
          weather: $http.get(FORECAST_URL, {
            params: {
              latitude: latitude,
              longitude: longitude,
              current: [
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "is_day",
                "precipitation",
                "weather_code",
                "wind_speed_10m",
                "wind_direction_10m",
                "wind_gusts_10m",
                "pressure_msl",
                "cloud_cover",
                "dew_point_2m",
                "visibility",
              ].join(","),
              hourly: [
                "temperature_2m",
                "precipitation_probability",
                "weather_code",
              ].join(","),
              daily: [
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min",
                "sunrise",
                "sunset",
                "precipitation_sum",
                "precipitation_probability_max",
                "uv_index_max",
                "wind_speed_10m_max",
              ].join(","),
              forecast_days: 7,
              timezone: "auto",
            },
          }),
          air: $http
            .get(AIR_URL, {
              params: {
                latitude: latitude,
                longitude: longitude,
                current: "us_aqi,pm2_5,pm10,european_aqi",
                timezone: "auto",
              },
            })
            .catch(function () {
              return { data: null };
            }),
        })
        .then(function (results) {
          var forecast = normalizeForecast(results.weather.data, results.air.data);
          forecastCache[cacheKey] = forecast;
          return forecast;
        });
    };

    function isDaytime(timeStr, daily) {
      var date = String(timeStr).slice(0, 10);
      var i;
      for (i = 0; i < daily.time.length; i++) {
        if (daily.time[i] === date) {
          return timeStr >= daily.sunrise[i] && timeStr < daily.sunset[i];
        }
      }
      var hour = Number(String(timeStr).slice(11, 13));
      return hour >= 6 && hour < 19;
    }

    function normalizeForecast(data, airData) {
      var currentMeta = weatherUtils.interpret(
        data.current.weather_code,
        data.current.is_day
      );
      var currentTime = data.current.time;
      var hourly = [];
      var daily = [];
      var i;
      var weekMin = Infinity;
      var weekMax = -Infinity;
      var air = (airData && airData.current) || {};
      var visibilityKm = Math.round((Number(data.current.visibility) || 0) / 100) / 10;

      for (i = 0; i < data.hourly.time.length; i++) {
        if (data.hourly.time[i] < currentTime) continue;
        hourly.push({
          time: data.hourly.time[i],
          label: hourly.length === 0 ? "Now" : weatherUtils.hourLabel(data.hourly.time[i]),
          temperature: Math.round(data.hourly.temperature_2m[i]),
          precipitation: data.hourly.precipitation_probability[i],
          weatherCode: data.hourly.weather_code[i],
          meta: weatherUtils.interpret(
            data.hourly.weather_code[i],
            isDaytime(data.hourly.time[i], data.daily)
          ),
        });
        if (hourly.length === 24) break;
      }

      for (i = 0; i < data.daily.time.length; i++) {
        var high = Math.round(data.daily.temperature_2m_max[i]);
        var low = Math.round(data.daily.temperature_2m_min[i]);
        weekMin = Math.min(weekMin, low);
        weekMax = Math.max(weekMax, high);
        daily.push({
          date: data.daily.time[i],
          weekday: i === 0 ? "Today" : weatherUtils.weekday(data.daily.time[i]),
          high: high,
          low: low,
          precipitation: data.daily.precipitation_sum[i],
          precipitationChance: data.daily.precipitation_probability_max[i],
          uv: data.daily.uv_index_max[i],
          wind: Math.round(data.daily.wind_speed_10m_max[i]),
          sunrise: data.daily.sunrise[i],
          sunset: data.daily.sunset[i],
          weatherCode: data.daily.weather_code[i],
          meta: weatherUtils.interpret(data.daily.weather_code[i], 1),
        });
      }

      var span = Math.max(1, weekMax - weekMin);
      daily.forEach(function (day) {
        day.rangeLeft = ((day.low - weekMin) / span) * 100;
        day.rangeWidth = ((day.high - day.low) / span) * 100;
      });

      return {
        timezone: data.timezone,
        sun: weatherUtils.sunPosition(
          currentTime,
          data.daily.sunrise[0],
          data.daily.sunset[0]
        ),
        air: weatherUtils.aqiInfo(air.us_aqi),
        airDetails: {
          pm25: air.pm2_5 != null ? Math.round(air.pm2_5) : null,
          pm10: air.pm10 != null ? Math.round(air.pm10) : null,
        },
        current: {
          time: currentTime,
          temperature: Math.round(data.current.temperature_2m),
          feelsLike: Math.round(data.current.apparent_temperature),
          humidity: data.current.relative_humidity_2m,
          precipitation: data.current.precipitation,
          wind: Math.round(data.current.wind_speed_10m),
          gusts: Math.round(data.current.wind_gusts_10m || data.current.wind_speed_10m),
          windDegrees: Math.round(data.current.wind_direction_10m || 0),
          windDirection: weatherUtils.compass(data.current.wind_direction_10m),
          pressure: Math.round(data.current.pressure_msl),
          cloudCover: Math.round(data.current.cloud_cover || 0),
          dewPoint: Math.round(data.current.dew_point_2m),
          visibilityKm: visibilityKm,
          isDay: data.current.is_day === 1,
          weatherCode: data.current.weather_code,
          meta: currentMeta,
        },
        hourly: hourly,
        daily: daily,
      };
    }
  },
]);
