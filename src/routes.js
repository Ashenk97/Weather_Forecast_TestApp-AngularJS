import { weatherApp } from "./app.js";

weatherApp.config([
  "$routeProvider",
  "$locationProvider",
  function ($routeProvider, $locationProvider) {
    $locationProvider.hashPrefix("");

    $routeProvider
      .when("/", {
        template: "<home-page></home-page>",
      })
      .when("/forecast", {
        template: "<forecast-page></forecast-page>",
      })
      .when("/forecast/:days", {
        template: "<forecast-page></forecast-page>",
      })
      .otherwise({
        redirectTo: "/",
      });
  },
]);
