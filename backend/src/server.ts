import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI, ApiError } from "@google/genai";
import { getTripCatalog, finalizeTrip } from "./agent/index.js";
import type { TripRequest, DayPlan, FlightOption } from "./types.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.status === 429) {
    return "Today's quota reached";
  }
  return err instanceof Error ? err.message : fallback;
}

const ai = new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") });

const duffelApiKey = process.env.DUFFEL_API_KEY ?? null;
if (!duffelApiKey) {
  console.warn(
    "DUFFEL_API_KEY not set -- flight search disabled, itineraries will only cover restaurants/attractions/hotel estimate.",
  );
}

const toolSecrets = {
  foursquareApiKey: requireEnv("FOURSQUARE_API_KEY"),
  duffelApiKey,
};

const app = express();
app.use(cors());
app.use(express.json());

function validateTripRequest(body: any): TripRequest | null {
  const { origin, destination, startDate, days, travelers, budget } = body ?? {};
  if (
    typeof origin !== "string" ||
    !origin.trim() ||
    typeof destination !== "string" ||
    !destination.trim() ||
    typeof startDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    typeof days !== "number" ||
    days < 1 ||
    typeof travelers !== "number" ||
    travelers < 1 ||
    typeof budget !== "number" ||
    budget <= 0
  ) {
    return null;
  }
  return { origin, destination, startDate, days, travelers, budget };
}

function validateFlight(value: unknown): FlightOption | null | undefined {
  if (value === undefined || value === null) return undefined;
  const f = value as Partial<FlightOption>;
  if (
    typeof f.airline !== "string" ||
    typeof f.price !== "number" ||
    typeof f.currency !== "string" ||
    typeof f.departDate !== "string" ||
    typeof f.returnDate !== "string" ||
    typeof f.stops !== "number"
  ) {
    return null;
  }
  return f as FlightOption;
}

function validateDays(value: unknown): DayPlan[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const days: DayPlan[] = [];
  for (const entry of value) {
    const d = entry as Partial<DayPlan>;
    if (
      typeof d.date !== "string" ||
      !Array.isArray(d.activities) ||
      !d.activities.every((a) => typeof a === "string") ||
      (d.breakfast !== undefined && typeof d.breakfast !== "string") ||
      (d.lunch !== undefined && typeof d.lunch !== "string") ||
      (d.dinner !== undefined && typeof d.dinner !== "string")
    ) {
      return null;
    }
    days.push({
      date: d.date,
      breakfast: d.breakfast,
      lunch: d.lunch,
      dinner: d.dinner,
      activities: d.activities,
    });
  }
  return days;
}

app.post("/api/trip/catalog", async (req, res) => {
  const tripRequest = validateTripRequest(req.body);
  if (!tripRequest) {
    res.status(400).json({ error: "Invalid trip request" });
    return;
  }
  try {
    const catalog = await getTripCatalog(tripRequest, toolSecrets, ai);
    res.json(catalog);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: errorMessage(err, "Failed to build trip catalog") });
  }
});

app.post("/api/trip/finalize", async (req, res) => {
  const tripRequest = validateTripRequest(req.body?.request);
  const flight = validateFlight(req.body?.flight);
  const days = validateDays(req.body?.days);
  if (!tripRequest || flight === null || !days) {
    res.status(400).json({ error: "Invalid finalize request" });
    return;
  }
  try {
    const itinerary = await finalizeTrip(tripRequest, flight ?? null, days, ai);
    res.json(itinerary);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: errorMessage(err, "Trip finalization failed") });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`ai-travel-planner backend listening on http://localhost:${port}`);
});
