import { weatherApp } from "../app.js";

weatherApp.component("hourlyChart", {
  bindings: {
    hours: "<",
    unit: "<",
    convertTemp: "&",
  },
  template: '<canvas class="chart-canvas" aria-label="Hourly temperature chart"></canvas>',
  controller: [
    "$element",
    function ($element) {
      var vm = this;
      var chart;
      var ChartLib;

      vm.$postLink = function () {
        import("chart.js").then(function (mod) {
          ChartLib = mod.Chart;
          ChartLib.register(
            mod.LineController,
            mod.LineElement,
            mod.PointElement,
            mod.LinearScale,
            mod.CategoryScale,
            mod.Filler,
            mod.Tooltip,
            mod.Legend
          );
          render();
        });
      };

      vm.$onChanges = function () {
        if (ChartLib) render();
      };

      vm.$onDestroy = function () {
        if (chart) chart.destroy();
      };

      function render() {
        if (!ChartLib || !vm.hours || !vm.hours.length) return;
        var canvas = $element[0].querySelector("canvas");
        if (!canvas) return;

        var styles = window.getComputedStyle(document.body);
        var text = styles.getPropertyValue("--text").trim() || "#f7f1e8";
        var soft = styles.getPropertyValue("--text-soft").trim() || "rgba(247,241,232,0.7)";
        var temps = vm.hours.map(function (hour) {
          return vm.convertTemp({ value: hour.temperature });
        });
        var pops = vm.hours.map(function (hour) {
          return hour.precipitation || 0;
        });

        if (chart) chart.destroy();
        chart = new ChartLib(canvas, {
          type: "line",
          data: {
            labels: vm.hours.map(function (hour) {
              return hour.label;
            }),
            datasets: [
              {
                label: "Temperature",
                data: temps,
                yAxisID: "y",
                borderColor: text,
                backgroundColor: "rgba(255,255,255,0.16)",
                fill: true,
                tension: 0.35,
                pointRadius: 2,
                pointHoverRadius: 5,
                borderWidth: 2,
              },
              {
                label: "Rain chance",
                data: pops,
                yAxisID: "y1",
                borderColor: soft,
                backgroundColor: "transparent",
                borderDash: [5, 4],
                tension: 0.3,
                pointRadius: 0,
                borderWidth: 1.5,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
              legend: {
                labels: { color: text, boxWidth: 12, font: { family: "Outfit" } },
              },
              tooltip: {
                callbacks: {
                  label: function (ctx) {
                    if (ctx.dataset.yAxisID === "y1") return ctx.parsed.y + "% rain";
                    return ctx.parsed.y + (vm.unit === "F" ? "°F" : "°C");
                  },
                },
              },
            },
            scales: {
              x: {
                ticks: { color: soft, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
                grid: { display: false },
              },
              y: {
                ticks: { color: soft, callback: function (value) { return value + "°"; } },
                grid: { color: "rgba(255,255,255,0.08)" },
              },
              y1: {
                position: "right",
                min: 0,
                max: 100,
                ticks: { color: soft, callback: function (value) { return value + "%"; } },
                grid: { display: false },
              },
            },
          },
        });
      }
    },
  ],
});
