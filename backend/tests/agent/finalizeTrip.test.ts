import { describe, it, expect, vi } from "vitest";
import type { GoogleGenAI } from "@google/genai";
import { finalizeTrip } from "../../src/agent/index.js";

function fakeGenAI(args: Record<string, unknown>) {
  const create = vi.fn().mockResolvedValue({
    functionCalls: [{ name: "finalize_trip", args }],
  });
  return { models: { generateContent: create } } as unknown as GoogleGenAI;
}

const request = {
  origin: "New York",
  destination: "Tokyo",
  startDate: "2026-09-01",
  days: 3,
  travelers: 1,
  budget: 2000,
};

const flight = {
  airline: "AA",
  price: 500,
  currency: "USD",
  departDate: "2026-09-01",
  returnDate: "2026-09-03",
  stops: 0,
};

const days = [
  { date: "2026-09-01", breakfast: "Cafe A", lunch: "Bistro B", dinner: "Restaurant C", activities: ["Museum X"] },
  { date: "2026-09-02", activities: [] },
];

describe("finalizeTrip", () => {
  it("computes the budget breakdown and synthesizes day summaries from the traveler's picks", async () => {
    const ai = fakeGenAI({
      hotelName: "Nice Hotel",
      hotelPricePerNight: 100,
      foodTotal: 200,
      activitiesTotal: 50,
    });

    const itinerary = await finalizeTrip(request, flight, days, ai);

    expect(itinerary.hotel).toMatchObject({ name: "Nice Hotel", pricePerNight: 100 });
    expect(itinerary.budgetBreakdown.flightsTotal).toBe(500);
    expect(itinerary.budgetBreakdown.hotelTotal).toBe(200);
    expect(itinerary.budgetBreakdown.grandTotal).toBe(950);
    expect(itinerary.budgetBreakdown.overBudget).toBe(false);
    expect(itinerary.days[0]).toMatchObject({ summary: "Museum X", breakfast: "Cafe A" });
    expect(itinerary.days[1]).toMatchObject({ summary: "Free day" });
  });

  it("passes through suggestions when the estimate comes out over budget", async () => {
    const ai = fakeGenAI({
      hotelName: "Fancy Hotel",
      hotelPricePerNight: 1000,
      foodTotal: 500,
      activitiesTotal: 500,
      suggestions: ["Shorten the trip", "Increase the budget"],
    });

    const itinerary = await finalizeTrip(request, flight, days, ai);

    expect(itinerary.budgetBreakdown.overBudget).toBe(true);
    expect(itinerary.suggestions).toEqual(["Shorten the trip", "Increase the budget"]);
  });

  it("treats a missing flight as zero cost", async () => {
    const ai = fakeGenAI({ hotelName: "Hotel", hotelPricePerNight: 50, foodTotal: 100, activitiesTotal: 50 });

    const itinerary = await finalizeTrip(request, null, days, ai);

    expect(itinerary.budgetBreakdown.flightsTotal).toBe(0);
  });
});
