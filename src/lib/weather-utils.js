const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function interpret(code, isDay) {
  var day = isDay !== 0;
  var entry = {
    0: {
      label: "Clear sky",
      icon: day ? "sun" : "moon",
      sky: day ? "clear-day" : "clear-night",
    },
    1: {
      label: "Mostly clear",
      icon: day ? "partly-cloudy-day" : "partly-cloudy-night",
      sky: day ? "clear-day" : "clear-night",
    },
    2: {
      label: "Partly cloudy",
      icon: day ? "partly-cloudy-day" : "partly-cloudy-night",
      sky: "cloudy",
    },
    3: { label: "Overcast", icon: "overcast", sky: "overcast" },
    45: { label: "Fog", icon: "fog", sky: "fog" },
    48: { label: "Icy fog", icon: "fog", sky: "fog" },
    51: { label: "Light drizzle", icon: "drizzle", sky: "drizzle" },
    53: { label: "Drizzle", icon: "drizzle", sky: "drizzle" },
    55: { label: "Heavy drizzle", icon: "drizzle", sky: "rain" },
    56: { label: "Freezing drizzle", icon: "drizzle", sky: "drizzle" },
    57: { label: "Heavy freezing drizzle", icon: "drizzle", sky: "rain" },
    61: { label: "Light rain", icon: "rain", sky: "rain" },
    63: { label: "Rain", icon: "rain", sky: "rain" },
    65: { label: "Heavy rain", icon: "rain", sky: "rain" },
    66: { label: "Freezing rain", icon: "rain", sky: "rain" },
    67: { label: "Heavy freezing rain", icon: "rain", sky: "rain" },
    71: { label: "Light snow", icon: "snow", sky: "snow" },
    73: { label: "Snow", icon: "snow", sky: "snow" },
    75: { label: "Heavy snow", icon: "snow", sky: "snow" },
    77: { label: "Snow grains", icon: "snow", sky: "snow" },
    80: { label: "Light showers", icon: "rain", sky: "rain" },
    81: { label: "Showers", icon: "rain", sky: "rain" },
    82: { label: "Heavy showers", icon: "rain", sky: "rain" },
    85: { label: "Snow showers", icon: "snow", sky: "snow" },
    86: { label: "Heavy snow showers", icon: "snow", sky: "snow" },
    95: { label: "Thunderstorm", icon: "storm", sky: "storm" },
    96: { label: "Thunderstorm with hail", icon: "storm", sky: "storm" },
    99: { label: "Severe thunderstorm", icon: "storm", sky: "storm" },
  };

  return (
    entry[code] || {
      label: "Unknown conditions",
      icon: "overcast",
      sky: "overcast",
    }
  );
}

export const weatherUtils = {
  toFahrenheit: function (celsius) {
    return Math.round((Number(celsius) * 9) / 5 + 32);
  },

  toMph: function (kmh) {
    return Math.round(Number(kmh) * 0.621371);
  },

  toInHg: function (hpa) {
    return (Number(hpa) * 0.02953).toFixed(2);
  },

  toMiles: function (km) {
    return (Number(km) * 0.621371).toFixed(1);
  },

  compass: function (degrees) {
    var dirs = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];
    return dirs[Math.round(Number(degrees) / 22.5) % 16];
  },

  uvLabel: function (uv) {
    var value = Number(uv);
    if (value < 3) return "Low";
    if (value < 6) return "Moderate";
    if (value < 8) return "High";
    if (value < 11) return "Very high";
    return "Extreme";
  },

  uvPercent: function (uv) {
    return Math.min(100, Math.round((Number(uv) / 12) * 100));
  },

  aqiInfo: function (usAqi) {
    var value = Number(usAqi);
    if (!isFinite(value)) {
      return { label: "Unavailable", tone: "unknown", value: null };
    }
    if (value <= 50) return { label: "Good", tone: "good", value: value };
    if (value <= 100) return { label: "Moderate", tone: "moderate", value: value };
    if (value <= 150) return { label: "Sensitive", tone: "sensitive", value: value };
    if (value <= 200) return { label: "Unhealthy", tone: "unhealthy", value: value };
    if (value <= 300) return { label: "Very unhealthy", tone: "very-unhealthy", value: value };
    return { label: "Hazardous", tone: "hazardous", value: value };
  },

  clockInZone: function (timeZone) {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone || undefined,
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date());
    } catch (err) {
      return new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date());
    }
  },

  weekday: function (dateStr) {
    var date = new Date(dateStr + "T12:00:00");
    return WEEKDAYS[date.getDay()];
  },

  hourLabel: function (timeStr) {
    var hour = Number(String(timeStr).slice(11, 13));
    var suffix = hour >= 12 ? "PM" : "AM";
    var display = hour % 12;
    if (display === 0) display = 12;
    return display + " " + suffix;
  },

  greeting: function () {
    var hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  },

  sunPosition: function (nowIso, sunriseIso, sunsetIso) {
    var now = new Date(nowIso).getTime();
    var rise = new Date(sunriseIso).getTime();
    var set = new Date(sunsetIso).getTime();
    var progress = 0;
    if (now <= rise) progress = 0;
    else if (now >= set) progress = 1;
    else progress = (now - rise) / (set - rise);

    var radius = 70;
    var angle = Math.PI * (1 - progress);
    return {
      progress: progress,
      cx: 100 + radius * Math.cos(angle),
      cy: 80 - radius * Math.sin(angle),
      sunrise: String(sunriseIso).slice(11, 16),
      sunset: String(sunsetIso).slice(11, 16),
    };
  },

  formatPlace: function (place) {
    if (!place) return "";
    var parts = [place.name];
    if (place.admin1 && place.admin1 !== place.name) {
      parts.push(place.admin1);
    }
    if (place.country) {
      parts.push(place.country);
    }
    return parts.join(", ");
  },

  interpret: interpret,
};
