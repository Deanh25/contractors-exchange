import states from "@/lib/data/us-states.json";

/**
 * Client-safe US states list (~1.8 KB). Separate from src/lib/cities.ts so client
 * components (e.g. the location picker) can render the state dropdown WITHOUT
 * pulling the ~760 KB city dataset into the browser bundle.
 */
export type StateOption = { code: string; name: string };

export const US_STATES = states as StateOption[];

const STATE_NAMES = new Map(US_STATES.map((s) => [s.code, s.name]));

export function stateName(code?: string | null): string {
  if (!code) return "";
  return STATE_NAMES.get(code.toUpperCase()) ?? code;
}

export function isValidState(code?: string | null): boolean {
  return !!code && STATE_NAMES.has(code.toUpperCase());
}
