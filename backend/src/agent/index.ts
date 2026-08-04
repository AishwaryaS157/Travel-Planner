import { FunctionCallingConfigMode, type GoogleGenAI } from "@google/genai";
import { estimateAttractionDetailsTool, finalizeTripTool } from "./tools.js";
import * as duffel from "../clients/duffel.js";
import * as foursquare from "../clients/foursquare.js";
import type {
  TripRequest,
  TripCatalog,
  AttractionOption,
  DayPlan,
  Itinerary,
  FlightOption,
  HotelOption,
  BudgetBreakdown,
  PlaceResult,
} from "../types.js";

const MODEL = "gemini-2.5-flash";

export interface ToolSecrets {
  foursquareApiKey: string;
  duffelApiKey: string | null;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function computeBudgetBreakdown(
  flight: FlightOption | null,
  hotel: HotelOption | null,
  nights: number,
  foodTotal: number,
  activitiesTotal: number,
  budget: number,
): BudgetBreakdown {
  const flightsTotal = flight ? flight.price : 0;
  const hotelTotal = hotel ? hotel.pricePerNight * nights : 0;
  const grandTotal = flightsTotal + hotelTotal + foodTotal + activitiesTotal;
  return {
    flightsTotal,
    hotelTotal,
    foodTotal,
    activitiesTotal,
    grandTotal,
    budget,
    overBudget: grandTotal > budget,
  };
}

async function annotateAttractions(
  places: PlaceResult[],
  ai: GoogleGenAI,
): Promise<AttractionOption[]> {
  if (places.length === 0) return [];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Estimate visit duration and typical opening hours for exactly these ${places.length} attractions, in this exact order (your response must have exactly ${places.length} entries, one per attraction, in the same order):\n${places
      .map((p, i) => `${i + 1}. ${p.name} (${p.category})`)
      .join("\n")}`,
    config: {
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.ANY,
          allowedFunctionNames: ["estimate_attraction_details"],
        },
      },
      tools: [{ functionDeclarations: [estimateAttractionDetailsTool] }],
    },
  });

  const call = response.functionCalls?.[0];
  const estimates =
    (
      call?.args as
        | { attractions?: { name: string; estimatedDurationMinutes: number; typicalHours: string }[] }
        | undefined
    )?.attractions ?? [];
  if (estimates.length !== places.length) {
    console.warn(
      `estimate_attraction_details returned ${estimates.length} entries for ${places.length} attractions -- falling back to defaults for any mismatch.`,
    );
  }

  return places.map((place, i) => {
    const est = estimates[i];
    return {
      ...place,
      estimatedDurationMinutes: est?.estimatedDurationMinutes ?? 60,
      typicalHours: est?.typicalHours ?? "Hours not available -- check locally",
    };
  });
}

export async function getTripCatalog(
  request: TripRequest,
  ctx: ToolSecrets,
  ai: GoogleGenAI,
): Promise<TripCatalog> {
  const nights = Math.max(1, request.days - 1);
  const returnDate = addDays(request.startDate, nights);

  const [flight, restaurants, rawAttractions] = await Promise.all([
    ctx.duffelApiKey
      ? duffel.searchFlights(
          request.origin,
          request.destination,
          request.startDate,
          returnDate,
          request.travelers,
          ctx.duffelApiKey,
        )
      : Promise.resolve(null),
    foursquare.searchRestaurants(request.destination, ctx.foursquareApiKey),
    foursquare.searchAttractions(request.destination, ctx.foursquareApiKey),
  ]);

  const attractions = await annotateAttractions(rawAttractions, ai);

  return { flight: flight ?? undefined, restaurants, attractions };
}

export async function finalizeTrip(
  request: TripRequest,
  flight: FlightOption | null,
  days: DayPlan[],
  ai: GoogleGenAI,
): Promise<Itinerary> {
  const nights = Math.max(1, request.days - 1);
  const remainingBudget = request.budget - (flight ? flight.price : 0);

  const dayLines = days
    .map(
      (d, i) =>
        `Day ${i + 1} (${d.date}): breakfast=${d.breakfast ?? "none"}, lunch=${d.lunch ?? "none"}, dinner=${d.dinner ?? "none"}, activities=${d.activities.join(", ") || "none"}`,
    )
    .join("\n");

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Trip to ${request.destination} from ${request.origin}, ${request.travelers} traveler(s), ${nights} night(s).
Total budget: $${request.budget} USD. Remaining budget after flights: $${remainingBudget.toFixed(2)} USD (must still cover hotel, food, and activities).

The traveler has already picked their day-by-day plan from real restaurants and attractions:
${dayLines}

Estimate a reasonable hotel and total food/activities cost for this exact plan. If the total comes out over budget, include concrete suggestions.`,
    config: {
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.ANY,
          allowedFunctionNames: ["finalize_trip"],
        },
      },
      tools: [{ functionDeclarations: [finalizeTripTool] }],
    },
  });

  const call = response.functionCalls?.[0];
  const args = (call?.args ?? {}) as {
    hotelName?: string;
    hotelPricePerNight?: number;
    foodTotal?: number;
    activitiesTotal?: number;
    notes?: string;
    suggestions?: string[];
  };

  const hotel: HotelOption | null = args.hotelPricePerNight
    ? { name: args.hotelName ?? "Estimated hotel", pricePerNight: args.hotelPricePerNight, currency: "USD" }
    : null;

  const budgetBreakdown = computeBudgetBreakdown(
    flight,
    hotel,
    nights,
    args.foodTotal ?? 0,
    args.activitiesTotal ?? 0,
    request.budget,
  );

  const itineraryDays = days.map((d) => ({
    date: d.date,
    summary: d.activities.length > 0 ? d.activities.join(", ") : "Free day",
    breakfast: d.breakfast,
    lunch: d.lunch,
    dinner: d.dinner,
    activities: d.activities,
  }));

  return {
    destination: request.destination,
    origin: request.origin,
    startDate: request.startDate,
    days: itineraryDays,
    flight: flight ?? undefined,
    hotel: hotel ?? undefined,
    budgetBreakdown,
    notes: args.notes,
    suggestions: args.suggestions ?? [],
  };
}
