import { describe, it, expect } from "vitest";
import { computeBudgetBreakdown } from "../../src/agent/index.js";

describe("computeBudgetBreakdown", () => {
  it("sums flight, hotel, food, activities and flags under budget", () => {
    const flight = {
      airline: "AA",
      price: 600,
      currency: "USD",
      departDate: "2026-09-01",
      returnDate: "2026-09-05",
      stops: 0,
    };
    const hotel = { name: "Hotel A", pricePerNight: 120, currency: "USD" };

    const breakdown = computeBudgetBreakdown(flight, hotel, 4, 300, 200, 2000);

    expect(breakdown.flightsTotal).toBe(600);
    expect(breakdown.hotelTotal).toBe(480);
    expect(breakdown.foodTotal).toBe(300);
    expect(breakdown.activitiesTotal).toBe(200);
    expect(breakdown.grandTotal).toBe(1580);
    expect(breakdown.overBudget).toBe(false);
  });

  it("flags over budget when grand total exceeds budget", () => {
    const breakdown = computeBudgetBreakdown(null, null, 3, 1000, 1000, 1500);

    expect(breakdown.grandTotal).toBe(2000);
    expect(breakdown.overBudget).toBe(true);
  });

  it("treats missing flight/hotel as zero cost", () => {
    const breakdown = computeBudgetBreakdown(null, null, 5, 100, 50, 500);

    expect(breakdown.flightsTotal).toBe(0);
    expect(breakdown.hotelTotal).toBe(0);
    expect(breakdown.grandTotal).toBe(150);
  });
});
