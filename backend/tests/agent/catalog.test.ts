import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GoogleGenAI } from "@google/genai";
import { getTripCatalog } from "../../src/agent/index.js";
import * as duffel from "../../src/clients/duffel.js";
import * as foursquare from "../../src/clients/foursquare.js";

vi.mock("../../src/clients/duffel.js");
vi.mock("../../src/clients/foursquare.js");

const ctx = { foursquareApiKey: "fsq-key", duffelApiKey: "duffel-key" };

const request = {
  origin: "New York",
  destination: "Tokyo",
  startDate: "2026-09-01",
  days: 3,
  travelers: 1,
  budget: 2000,
};

function fakeGenAI(response: unknown) {
  const create = vi.fn().mockResolvedValue(response);
  return { models: { generateContent: create } } as unknown as GoogleGenAI;
}

function estimateResponse(
  attractions: { name: string; estimatedDurationMinutes: number; typicalHours: string }[],
) {
  return { functionCalls: [{ name: "estimate_attraction_details", args: { attractions } }] };
}

describe("getTripCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(foursquare.searchRestaurants).mockResolvedValue([
      { name: "Sushi Place", category: "Restaurant", address: "123 St" },
    ]);
    vi.mocked(foursquare.searchAttractions).mockResolvedValue([
      { name: "Tower", category: "Landmark", address: "456 Ave" },
    ]);
    vi.mocked(duffel.searchFlights).mockResolvedValue({
      airline: "AA",
      price: 500,
      currency: "USD",
      departDate: "2026-09-01",
      returnDate: "2026-09-03",
      stops: 0,
    });
  });

  it("fetches flights, restaurants, and attractions, annotating attractions with estimates", async () => {
    const ai = fakeGenAI(
      estimateResponse([{ name: "Tower", estimatedDurationMinutes: 90, typicalHours: "9am-5pm" }]),
    );

    const catalog = await getTripCatalog(request, ctx, ai);

    expect(duffel.searchFlights).toHaveBeenCalledWith(
      "New York",
      "Tokyo",
      "2026-09-01",
      "2026-09-03",
      1,
      "duffel-key",
    );
    expect(catalog.flight).toMatchObject({ price: 500 });
    expect(catalog.restaurants).toEqual([{ name: "Sushi Place", category: "Restaurant", address: "123 St" }]);
    expect(catalog.attractions).toEqual([
      {
        name: "Tower",
        category: "Landmark",
        address: "456 Ave",
        estimatedDurationMinutes: 90,
        typicalHours: "9am-5pm",
      },
    ]);
  });

  it("skips flight search when no Duffel key is configured", async () => {
    const ai = fakeGenAI(estimateResponse([]));

    const catalog = await getTripCatalog(request, { ...ctx, duffelApiKey: null }, ai);

    expect(duffel.searchFlights).not.toHaveBeenCalled();
    expect(catalog.flight).toBeUndefined();
  });

  it("falls back to defaults when the model omits an attraction estimate", async () => {
    const ai = fakeGenAI(estimateResponse([]));

    const catalog = await getTripCatalog(request, ctx, ai);

    expect(catalog.attractions[0]).toMatchObject({
      estimatedDurationMinutes: 60,
      typicalHours: "Hours not available -- check locally",
    });
  });
});
