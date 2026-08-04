import type { FlightOption } from "../types.js";

const DUFFEL_BASE = "https://api.duffel.com";
const DUFFEL_VERSION = "v2";

function duffelHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Duffel-Version": DUFFEL_VERSION,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function resolveIataCode(query: string, apiKey: string): Promise<string | null> {
  const url = new URL(`${DUFFEL_BASE}/places/suggestions`);
  url.searchParams.set("query", query);
  const res = await fetch(url, { headers: duffelHeaders(apiKey) });
  if (!res.ok) {
    throw new Error(`Duffel places API error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { data?: { iata_code?: string }[] };
  return data.data?.[0]?.iata_code ?? null;
}

export async function searchFlights(
  origin: string,
  destination: string,
  departDate: string,
  returnDate: string,
  travelers: number,
  apiKey: string,
): Promise<FlightOption | null> {
  const [originCode, destCode] = await Promise.all([
    resolveIataCode(origin, apiKey),
    resolveIataCode(destination, apiKey),
  ]);
  if (!originCode || !destCode) return null;

  const res = await fetch(`${DUFFEL_BASE}/air/offer_requests?return_offers=true`, {
    method: "POST",
    headers: duffelHeaders(apiKey),
    body: JSON.stringify({
      data: {
        slices: [
          { origin: originCode, destination: destCode, departure_date: departDate },
          { origin: destCode, destination: originCode, departure_date: returnDate },
        ],
        passengers: Array.from({ length: travelers }, () => ({ type: "adult" })),
        cabin_class: "economy",
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Duffel offer_requests error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    data?: { offers?: any[] };
  };
  const offers = data.data?.offers ?? [];
  if (offers.length === 0) return null;

  const cheapest = offers.reduce((min, o) =>
    parseFloat(o.total_amount) < parseFloat(min.total_amount) ? o : min,
  );
  const outboundSegments = cheapest.slices?.[0]?.segments?.length ?? 1;
  return {
    airline: cheapest.owner?.name ?? "Unknown",
    price: parseFloat(cheapest.total_amount),
    currency: cheapest.total_currency,
    departDate,
    returnDate,
    stops: outboundSegments - 1,
  };
}
