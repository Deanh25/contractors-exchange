import { searchCities } from "@/lib/cities";

/**
 * City typeahead endpoint for the location picker. GET /api/cities?q=phoe&state=AZ
 * returns up to `limit` standardized { city, state, lat, lng } matches.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const state = searchParams.get("state") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit")) || 12, 25);

  const results = searchCities(q, { state, limit });
  return Response.json({ results });
}
