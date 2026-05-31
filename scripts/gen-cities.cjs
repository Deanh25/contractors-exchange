/*
 * Generates a compact, US-only city/state dataset for the location picker
 * (PRD §10 — accurate, standardized locations to link content by area).
 *
 * Source: the `country-state-city` package (a devDependency). Run with:
 *   node scripts/gen-cities.cjs
 * Output: src/lib/data/us-cities.json (committed; the app reads this, not the package).
 */
const fs = require("fs");
const path = require("path");
const { State, City } = require("country-state-city");

// Real US postal jurisdictions: 50 states + DC + inhabited territories.
// Exclude military codes (AA/AE/AP) and outlying-islands placeholders.
const EXCLUDE = new Set(["AA", "AE", "AP", "UM"]);

const states = State.getStatesOfCountry("US")
  .filter((s) => /^[A-Z]{2}$/.test(s.isoCode) && !EXCLUDE.has(s.isoCode))
  .map((s) => ({ code: s.isoCode, name: s.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

const stateCodes = new Set(states.map((s) => s.code));
const round = (v) => Math.round(parseFloat(v) * 1e5) / 1e5;

const seen = new Set();
const cities = [];
for (const c of City.getCitiesOfCountry("US")) {
  if (!stateCodes.has(c.stateCode)) continue;
  const key = `${c.name}|${c.stateCode}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const lat = round(c.latitude);
  const lng = round(c.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  // [name, stateCode, lat, lng] — array form keeps the file small.
  cities.push([c.name, c.stateCode, lat, lng]);
}
cities.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

const out = { states, cities };
const dir = path.resolve(__dirname, "..", "src", "lib", "data");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, "us-cities.json");
fs.writeFileSync(file, JSON.stringify(out));
console.log(
  `Wrote ${cities.length} cities, ${states.length} states -> ${file} (${(
    fs.statSync(file).size / 1024
  ).toFixed(0)} KB)`,
);
