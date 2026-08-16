import { weatherApp } from "../app.js";

weatherApp.component("weatherMap", {
  bindings: {
    lat: "<",
    lon: "<",
    label: "@",
  },
  template: '<div class="map-canvas" data-testid="weather-map"></div>',
  controller: [
    "$element",
    "$timeout",
    function ($element, $timeout) {
      var vm = this;
      var map;
      var marker;

      vm.$postLink = function () {
        Promise.all([import("leaflet/dist/leaflet.css"), import("leaflet")]).then(function (results) {
          var L = results[1].default || results[1];
          var el = $element[0].querySelector(".map-canvas");
          map = L.map(el, {
            zoomControl: true,
            attributionControl: true,
            scrollWheelZoom: false,
          }).setView([vm.lat, vm.lon], 9);

          L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
            attribution: "&copy; OpenStreetMap &copy; CARTO",
            maxZoom: 18,
          }).addTo(map);

          marker = L.circleMarker([vm.lat, vm.lon], {
            radius: 11,
            color: "#163044",
            fillColor: "#f4c16e",
            fillOpacity: 0.95,
            weight: 2,
          }).addTo(map);

          if (vm.label) marker.bindPopup(vm.label);
          $timeout(function () {
            map.invalidateSize();
          }, 180);
        });
      };

      vm.$onChanges = function () {
        if (!map || vm.lat == null || vm.lon == null) return;
        map.flyTo([vm.lat, vm.lon], 9, { duration: 0.8 });
        marker.setLatLng([vm.lat, vm.lon]);
      };

      vm.$onDestroy = function () {
        if (map) map.remove();
      };
    },
  ],
});
