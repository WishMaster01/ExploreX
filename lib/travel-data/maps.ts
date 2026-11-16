const googleMapsUrl = "https://www.google.com/maps";

/** Center a map on coordinates supplied by itinerary data; this does not verify the location. */
export function googleMapsPlaceSearchUrl(location: string): string {
  return `${googleMapsUrl}/search/?api=1&query=${encodeURIComponent(location)}`;
}

/** Build a directions link from itinerary coordinates. */
export function googleMapsDirectionsUrl(locations: string[]): string | null {
  const points = locations.map((location) => location.trim()).filter(Boolean);
  if (points.length < 2) return null;
  const origin = encodeURIComponent(points[0]);
  const destination = encodeURIComponent(points[points.length - 1]);
  const waypoints = points.slice(1, -1);
  return `${googleMapsUrl}/dir/?api=1&origin=${origin}&destination=${destination}${
    waypoints.length
      ? `&waypoints=${waypoints.map(encodeURIComponent).join("%7C")}`
      : ""
  }`;
}
