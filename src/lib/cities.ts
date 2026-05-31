import data from "@/lib/data/us-cities.json";

/**
 * US city/state lookup for the location picker (PRD §10). Backed by a bundled
 * dataset (src/lib/data/us-cities.json, regenerated via scripts/gen-cities.cjs)
 * so locations are standardized - same city always resolves to the same
 * state + coordinates - with no external API. Swappable for Google Places later.
 */

export type StateOption = { code: string; name: string };
export type CityResult = { city: string; state: string; lat: number; lng: number };

// Stored compactly as [name, stateCode, lat, lng].
type Row = [string, string, number, number];

const STATES = data.states as StateOption[];
const CITIES = data.cities as Row[];
const STATE_NAMES = new Map(STATES.map((s) => [s.code, s.name]));

export function usStates(): StateOption[] {
  return STATES;
}

export function stateName(code?: string | null): string {
  if (!code) return "";
  return STATE_NAMES.get(code.toUpperCase()) ?? code;
}

export function isValidState(code?: string | null): boolean {
  return !!code && STATE_NAMES.has(code.toUpperCase());
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
