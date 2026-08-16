import { describe, expect, it } from "vitest";
import { weatherUtils } from "./weather-utils.js";

describe("weatherUtils", function () {
  it("converts Celsius to Fahrenheit", function () {
    expect(weatherUtils.toFahrenheit(0)).toBe(32);
    expect(weatherUtils.toFahrenheit(25)).toBe(77);
  });

  it("converts km/h to mph", function () {
    expect(weatherUtils.toMph(10)).toBe(6);
  });

  it("maps compass degrees to a named direction", function () {
    expect(weatherUtils.compass(0)).toBe("N");
    expect(weatherUtils.compass(90)).toBe("E");
  });

  it("labels UV index ranges", function () {
    expect(weatherUtils.uvLabel(1.2)).toBe("Low");
    expect(weatherUtils.uvLabel(5)).toBe("Moderate");
    expect(weatherUtils.uvLabel(12)).toBe("Extreme");
  });

  it("classifies US AQI bands", function () {
    expect(weatherUtils.aqiInfo(22).label).toBe("Good");
    expect(weatherUtils.aqiInfo(80).tone).toBe("moderate");
    expect(weatherUtils.aqiInfo(320).label).toBe("Hazardous");
  });

  it("places the sun along the daylight arc", function () {
    var sun = weatherUtils.sunPosition(
      "2026-08-16T12:00",
      "2026-08-16T06:00",
      "2026-08-16T18:00"
    );
    expect(sun.progress).toBeCloseTo(0.5, 2);
    expect(sun.sunrise).toBe("06:00");
  });

  it("formats a place label without repeating the city name", function () {
    expect(
      weatherUtils.formatPlace({
        name: "Tokyo",
        admin1: "Tokyo",
        country: "Japan",
      })
    ).toBe("Tokyo, Japan");
  });

  it("interprets WMO weather codes into UI metadata", function () {
    expect(weatherUtils.interpret(0, 1).icon).toBe("sun");
    expect(weatherUtils.interpret(0, 0).sky).toBe("clear-night");
    expect(weatherUtils.interpret(95, 1).label).toBe("Thunderstorm");
  });
});
