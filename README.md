# Skycast · Weather Forecast Test App

A live weather dashboard that still uses **AngularJS 1.8** at the core, with **Vite**, **Chart.js**, **Leaflet**, and **Vitest**.

## Run it

```bash
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

```bash
npm test      # unit tests
npm run build # production bundle in dist/
```

## Project structure

```text
index.html                 Vite entry
public/                    favicon and web manifest
src/
  main.js                  bootstraps AngularJS
  app.js                   module definition
  routes.js
  services.js              city, storage, and weather APIs
  components.js            pages and UI components
  styles.css
  lib/                     shared helpers and tests
  pages/                   home and forecast templates
  components/              weather card and icon templates
  widgets/                 Chart.js and Leaflet components
```

## Stack

| Layer | Choice |
| --- | --- |
| UI / routing | AngularJS 1.8 components + `ngRoute` |
| Tooling | Vite |
| Charts | Chart.js |
| Maps | Leaflet + CARTO tiles |
| Tests | Vitest + jsdom |
| Weather / air | Open-Meteo |
