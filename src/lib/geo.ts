// Proximity helpers for "within X miles" marketplace search. Works off the
// lat/lng we already store on listings (city-level coordinates from the location
// picker), so no zip codes or external geocoding are needed.

const EARTH_RADIUS_MI = 3958.8;
const MILES_PER_DEG_LAT = 69; // ~constant

const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance between two points, in miles (Haversine). */
export function haversineMiles(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(s));
}

/**
 * A lat/lng bounding box that fully contains the circle of `miles` around a
 * point. Used as a cheap, index-friendly DB prefilter before computing exact
 * distances on the (small) result set.
 */
export function boundingBox(lat: number, lng: number, miles: number) {
  const dLat = miles / MILES_PER_DEG_LAT;
  const cos = Math.cos(toRad(lat));
  const dLng = miles / (MILES_PER_DEG_LAT * (Math.abs(cos) < 0.01 ? 0.01 : cos));
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

/** Round a distance for display: "0.4 mi", "23 mi". */
export function formatMiles(mi: number): string {
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}
