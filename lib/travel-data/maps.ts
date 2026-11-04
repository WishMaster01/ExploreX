const googleMapsUrl = "https://www.google.com/maps";

/** Search Maps by place name. AI coordinates must never be treated as a confirmed pin. */
export function googleMapsPlaceSearchUrl(placeName: string): string {
  return `${googleMapsUrl}/search/?api=1&query=${encodeURIComponent(placeName)}`;
}

/** Build a directions link from names only; the map provider resolves locations. */
export function googleMapsDirectionsUrl(placeNames: string[]): string | null {
  const names = placeNames.map((name) => name.trim()).filter(Boolean);
  if (names.length < 2) return null;
  const origin = encodeURIComponent(names[0]);
  const destination = encodeURIComponent(names[names.length - 1]);
  const waypoints = names.slice(1, -1);
  return `${googleMapsUrl}/dir/?api=1&origin=${origin}&destination=${destination}${
    waypoints.length
      ? `&waypoints=${waypoints.map(encodeURIComponent).join("%7C")}`
      : ""
  }`;
}
