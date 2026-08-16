import { weatherApp } from "./app.js";
import homeTemplate from "./pages/home.html?raw";
import forecastTemplate from "./pages/forecast.html?raw";
import weatherIconTemplate from "./components/weather-icon.html?raw";
import weatherCardTemplate from "./components/weather-card.html?raw";
import "./widgets/hourly-chart.js";
import "./widgets/weather-map.js";

weatherApp.controller("AppController", [
  "cityService",
  "skyService",
  function (cityService, skyService) {
    var vm = this;
    vm.city = cityService;
    vm.sky = skyService;

    vm.setUnit = function (unit) {
      cityService.setUnit(unit);
    };
  },
]);

weatherApp.component("homePage", {
  template: homeTemplate,
  controller: [
    "$location",
    "$timeout",
    "$q",
    "cityService",
    "weatherService",
    "skyService",
    "weatherUtils",
    function ($location, $timeout, $q, cityService, weatherService, skyService, weatherUtils) {
      var vm = this;
      var debounce;

      vm.query = "";
      vm.suggestions = [];
      vm.searching = false;
      vm.locating = false;
      vm.error = "";
      vm.recents = [];
      vm.popular = cityService.popular;
      vm.world = cityService.popular.slice();
      vm.greeting = weatherUtils.greeting();

      vm.$onInit = function () {
        skyService.set("clear-day");
        vm.recents = cityService.recents;
        if (cityService.selected) {
          vm.query = cityService.selected.name;
        }
        loadWorld();
      };

      vm.$onDestroy = function () {
        $timeout.cancel(debounce);
      };

      vm.displayTemp = function (celsius) {
        if (celsius === null || celsius === undefined) return "–";
        return cityService.unit === "F" ? weatherUtils.toFahrenheit(celsius) : celsius;
      };

      vm.onQueryChange = function () {
        vm.error = "";
        $timeout.cancel(debounce);
        if (!vm.query || vm.query.trim().length < 2) {
          vm.suggestions = [];
          vm.searching = false;
          return;
        }

        vm.searching = true;
        debounce = $timeout(function () {
          weatherService
            .searchCities(vm.query)
            .then(function (results) {
              vm.suggestions = results;
            })
            .catch(function () {
              vm.suggestions = [];
              vm.error = "City search is unavailable right now. Try again in a moment.";
            })
            .finally(function () {
              vm.searching = false;
            });
        }, 280);
      };

      vm.chooseSuggestion = function (place) {
        cityService.select(place);
        $location.path("/forecast/5");
      };

      vm.submitSearch = function () {
        var query = (vm.query || "").trim();
        vm.error = "";

        if (!query) {
          vm.error = "Enter a city name to see the forecast.";
          return;
        }

        if (vm.suggestions.length) {
          vm.chooseSuggestion(vm.suggestions[0]);
          return;
        }

        vm.searching = true;
        weatherService
          .searchCities(query)
          .then(function (results) {
            if (!results.length) {
              vm.error = "No matching city found. Try a different spelling.";
              return;
            }
            vm.chooseSuggestion(results[0]);
          })
          .catch(function () {
            vm.error = "Could not look up that city. Check your connection and try again.";
          })
          .finally(function () {
            vm.searching = false;
          });
      };

      vm.useMyLocation = function () {
        if (!navigator.geolocation) {
          vm.error = "This browser does not support location lookup.";
          return;
        }

        vm.locating = true;
        vm.error = "";
        navigator.geolocation.getCurrentPosition(
          function (position) {
            weatherService
              .reverseGeocode(position.coords.latitude, position.coords.longitude)
              .then(function (place) {
                cityService.select(place);
                $location.path("/forecast/5");
              })
              .catch(function () {
                vm.error = "Found your coordinates, but could not name the place.";
              })
              .finally(function () {
                vm.locating = false;
              });
          },
          function () {
            $timeout(function () {
              vm.locating = false;
              vm.error = "Location permission was denied. Search for a city instead.";
            });
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
        );
      };

      function loadWorld() {
        $q.all(
          cityService.popular.map(function (place) {
            return weatherService
              .getSnapshot(place.latitude, place.longitude)
              .then(function (snap) {
                return Object.assign({}, place, snap);
              })
              .catch(function () {
                return place;
              });
          })
        ).then(function (rows) {
          vm.world = rows;
        });
      }
    },
  ],
});

weatherApp.component("forecastPage", {
  template: forecastTemplate,
  controller: [
    "$location",
    "$routeParams",
    "$interval",
    "cityService",
    "weatherService",
    "skyService",
    "weatherUtils",
    function (
      $location,
      $routeParams,
      $interval,
      cityService,
      weatherService,
      skyService,
      weatherUtils
    ) {
      var vm = this;
      var allowedDays = { 2: true, 5: true, 7: true };
      var clockTimer;

      vm.city = cityService.selected;
      vm.cityService = cityService;
      vm.days = allowedDays[$routeParams.days] ? String($routeParams.days) : "5";
      vm.loading = true;
      vm.error = "";
      vm.forecast = null;
      vm.daily = [];
      vm.clock = "";

      vm.$onInit = function () {
        if (!cityService.selected) {
          $location.path("/");
          return;
        }
        loadForecast();
      };

      vm.$onDestroy = function () {
        if (clockTimer) $interval.cancel(clockTimer);
      };

      vm.displayTemp = function (celsius) {
        if (celsius === null || celsius === undefined) return "–";
        return cityService.unit === "F" ? weatherUtils.toFahrenheit(celsius) : celsius;
      };

      vm.displayWind = function (kmh) {
        if (kmh === null || kmh === undefined) return "–";
        return cityService.unit === "F" ? weatherUtils.toMph(kmh) : kmh;
      };

      vm.displayPressure = function (hpa) {
        if (hpa === null || hpa === undefined) return "–";
        return cityService.unit === "F" ? weatherUtils.toInHg(hpa) : hpa;
      };

      vm.displayVisibility = function (km) {
        if (km === null || km === undefined) return "–";
        return cityService.unit === "F" ? weatherUtils.toMiles(km) : km;
      };

      vm.windUnit = function () {
        return cityService.unit === "F" ? "mph" : "km/h";
      };

      vm.tempUnit = function () {
        return cityService.unit === "F" ? "°F" : "°C";
      };

      vm.pressureUnit = function () {
        return cityService.unit === "F" ? "inHg" : "hPa";
      };

      vm.visibilityUnit = function () {
        return cityService.unit === "F" ? "mi" : "km";
      };

      vm.uvLabel = weatherUtils.uvLabel;
      vm.uvPercent = weatherUtils.uvPercent;

      vm.retry = function () {
        loadForecast();
      };

      function tickClock(timeZone) {
        vm.clock = weatherUtils.clockInZone(timeZone);
      }

      function applyForecast(forecast) {
        vm.forecast = forecast;
        vm.daily = forecast.daily.slice(0, Number(vm.days));
        skyService.set(forecast.current.meta.sky);
        tickClock(forecast.timezone);
        if (clockTimer) $interval.cancel(clockTimer);
        clockTimer = $interval(function () {
          tickClock(forecast.timezone);
        }, 30000);
      }

      function loadForecast() {
        var selected = cityService.selected;
        var cached = weatherService.peekForecast(selected.latitude, selected.longitude);

        if (cached) {
          applyForecast(cached);
          vm.loading = false;
          vm.error = "";
          return;
        }

        vm.loading = true;
        vm.error = "";
        weatherService
          .getForecast(selected.latitude, selected.longitude)
          .then(function (forecast) {
            applyForecast(forecast);
          })
          .catch(function () {
            vm.error = "The forecast service is unavailable. Please try again.";
            skyService.set("overcast");
          })
          .finally(function () {
            vm.loading = false;
          });
      }
    },
  ],
});

weatherApp.component("weatherIcon", {
  bindings: {
    type: "<",
    size: "@",
  },
  template: weatherIconTemplate,
});

weatherApp.component("weatherCard", {
  bindings: {
    day: "<",
    unit: "<",
    convertTemp: "&",
  },
  template: weatherCardTemplate,
});
