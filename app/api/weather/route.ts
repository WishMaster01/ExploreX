import { NextResponse } from "next/server";
import { exploreCities } from "@/lib/data/cities";
import { DESTINATIONS } from "@/lib/data/destinations";

function decodeWeatherCode(code: number): string {
  if (code === 0) return "Clear Sky";
  if (code === 1) return "Mainly Clear";
  if (code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 55) return "Light Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain Showers";
  if (code >= 95) return "Thunderstorm";
  return "Mild";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let lat = searchParams.get("lat");
  let lon = searchParams.get("lon");
  const cityQuery = searchParams.get("city");

  if ((!lat || !lon) && cityQuery) {
    const matchedCity = exploreCities.find(
      (c) =>
        c.name.toLowerCase() === cityQuery.toLowerCase() ||
        c.slug === cityQuery.toLowerCase(),
    );
    if (matchedCity?.coordinates) {
      const parts = matchedCity.coordinates.split(",");
      if (parts.length === 2) {
        lat = parseFloat(parts[0]).toString();
        lon = parseFloat(parts[1]).toString();
      }
    } else {
      const dest = DESTINATIONS.find(
        (d) =>
          d.city.toLowerCase() === cityQuery.toLowerCase() ||
          d.label.toLowerCase().includes(cityQuery.toLowerCase()),
      );
      if (dest) {
        lat = dest.latitude.toString();
        lon = dest.longitude.toString();
      }
    }
  }

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Latitude and Longitude or a valid city name are required" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
        lat,
      )}&longitude=${encodeURIComponent(
        lon,
      )}&current=temperature_2m,weather_code&timezone=auto`,
      { next: { revalidate: 1800 } }, // Cache for 30 minutes
    );

    if (!res.ok) {
      throw new Error("Weather provider returned error");
    }

    const data = await res.json();
    const current = data.current;
    const tempC = Math.round(current.temperature_2m);
    const condition = decodeWeatherCode(current.weather_code);

    return NextResponse.json({
      success: true,
      temp: `${tempC}°C`,
      condition,
      rawTemp: tempC,
      timezone: data.timezone,
      source: "Open-Meteo Live API",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to retrieve real-time weather",
      },
      { status: 502 },
    );
  }
}
