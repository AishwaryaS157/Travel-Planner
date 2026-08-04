import type { TripRequest, TripCatalog, DayPlan, FlightOption, Itinerary } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}

export function getTripCatalog(request: TripRequest): Promise<TripCatalog> {
  return postJson("/api/trip/catalog", request);
}

export function finalizeTrip(
  request: TripRequest,
  flight: FlightOption | undefined,
  days: DayPlan[],
): Promise<Itinerary> {
  return postJson("/api/trip/finalize", { request, flight, days });
}
