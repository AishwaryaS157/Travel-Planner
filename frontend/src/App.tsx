import { useState } from "react";
import TripForm from "./pages/TripForm";
import TripBuilder from "./pages/TripBuilder";
import ItineraryResults from "./pages/ItineraryResults";
import { getTripCatalog, finalizeTrip } from "./api/client";
import type { TripRequest, TripCatalog, DayPlan, Itinerary } from "./types";

type Phase = "form" | "building" | "results";

export default function App() {
  const [phase, setPhase] = useState<Phase>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<TripRequest | null>(null);
  const [catalog, setCatalog] = useState<TripCatalog | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);

  async function handleFormSubmit(req: TripRequest) {
    setLoading(true);
    setError(null);
    try {
      const result = await getTripCatalog(req);
      setRequest(req);
      setCatalog(result);
      setPhase("building");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalize(days: DayPlan[]) {
    if (!request || !catalog) return;
    setLoading(true);
    setError(null);
    try {
      const result = await finalizeTrip(request, catalog.flight, days);
      setItinerary(result);
      setPhase("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPhase("form");
    setLoading(false);
    setError(null);
    setRequest(null);
    setCatalog(null);
    setItinerary(null);
  }

  if (phase === "results" && itinerary) {
    return <ItineraryResults itinerary={itinerary} onReset={reset} />;
  }

  if (phase === "building" && request && catalog) {
    return (
      <div className="app app-wide">
        <TripBuilder request={request} catalog={catalog} onFinalize={handleFinalize} loading={loading} />
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="app">
      <TripForm onSubmit={handleFormSubmit} disabled={loading} />
      {loading && (
        <div className="loading">
          <div className="spinner" />
          <p>Finding real restaurants and attractions…</p>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
