import data from "@/lib/data/us-cities.json";
import { US_STATES, stateName, isValidState, type StateOption } from "@/lib/us-states";

/**
 * US city lookup for the location picker (PRD §10). Backed by a bundled dataset
 * (src/lib/data/us-cities.json, regenerated via scripts/gen-cities.cjs) so
 * locations are standardized - same city always resolves to the same state +
 * coordinates - with no external API. Server-side only (the dataset is large);
 * the client gets results through GET /api/cities. Swappable for Google Places.
 *
 * State helpers live in src/lib/us-states.ts (client-safe) and are re-exported
 * here so existing server imports keep working.
 */

export type { StateOption };
export { stateName, isValidState };
export type CityResult = { city: string; state: string; lat: number; lng: number };

// Stored compactly as [name, stateCode, lat, lng].
type Row = [string, string, number, number];
const CITIES = data.cities as Row[];

export function usStates(): StateOption[] {
  return US_STATES;
}

/**
 * Search cities by name, optionally constrained to a state. Prefix matches rank
 * above substring matches; results capped at `limit`.
 */
export function searchCities(
  query: string,
  opts: { state?: string; limit?: number } = {},
): CityResult[] {
  const q = query.trim().toLowerCase();
  const limit = opts.limit ?? 12;
  const stateFilter = opts.state?.toUpperCase();
  if (!q && !stateFilter) return [];

  const starts: CityResult[] = [];
  const includes: CityResult[] = [];

  for (const [name, st, lat, lng] of CITIES) {
    if (stateFilter && st !== stateFilter) continue;
    if (q) {
      const lname = name.toLowerCase();
      if (lname.startsWith(q)) starts.push({ city: name, state: st, lat, lng });
      else if (lname.includes(q)) includes.push({ city: name, state: st, lat, lng });
    } else {
      starts.push({ city: name, state: st, lat, lng });
      if (starts.length >= limit) break;
    }
  }

  return [...starts, ...includes].slice(0, limit);
}

/** Resolve an exact "city + state" pair to its canonical record (for validation). */
export function findCity(city: string, state: string): CityResult | null {
  const c = city.trim().toLowerCase();
  const s = state.trim().toUpperCase();
  for (const [name, st, lat, lng] of CITIES) {
    if (st === s && name.toLowerCase() === c) return { city: name, state: st, lat, lng };
  }
  return null;
}
