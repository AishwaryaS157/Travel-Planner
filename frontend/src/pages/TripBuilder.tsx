import { useState } from "react";
import type { TripRequest, TripCatalog, DayPlan } from "../types";

interface Props {
  request: TripRequest;
  catalog: TripCatalog;
  onFinalize: (days: DayPlan[]) => void;
  loading: boolean;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function buildInitialDays(request: TripRequest): DayPlan[] {
  return Array.from({ length: request.days }, (_, i) => ({
    date: addDays(request.startDate, i),
    activities: [],
  }));
}

export default function TripBuilder({ request, catalog, onFinalize, loading }: Props) {
  const [days, setDays] = useState<DayPlan[]>(() => buildInitialDays(request));
  const [otherEnabled, setOtherEnabled] = useState<boolean[]>(() => days.map(() => false));
  const [otherText, setOtherText] = useState<string[]>(() => days.map(() => ""));

  function updateMeal(dayIndex: number, meal: "breakfast" | "lunch" | "dinner", value: string) {
    setDays((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, [meal]: value || undefined } : d)),
    );
  }

  function toggleActivity(dayIndex: number, name: string) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d;
        const activities = d.activities.includes(name)
          ? d.activities.filter((a) => a !== name)
          : [...d.activities, name];
        return { ...d, activities };
      }),
    );
  }

  function toggleOther(dayIndex: number) {
    const enabling = !otherEnabled[dayIndex];
    setOtherEnabled((prev) => prev.map((v, i) => (i === dayIndex ? enabling : v)));

    if (!enabling) {
      const trimmed = otherText[dayIndex].trim();
      setOtherText((prev) => prev.map((v, i) => (i === dayIndex ? "" : v)));
      if (trimmed) {
        setDays((prev) =>
          prev.map((d, i) =>
            i === dayIndex ? { ...d, activities: d.activities.filter((a) => a !== trimmed) } : d,
          ),
        );
      }
    }
  }

  function updateOtherText(dayIndex: number, value: string) {
    const prevTrimmed = otherText[dayIndex].trim();
    setOtherText((prev) => prev.map((v, i) => (i === dayIndex ? value : v)));
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d;
        let activities = d.activities;
        if (prevTrimmed) activities = activities.filter((a) => a !== prevTrimmed);
        const trimmed = value.trim();
        if (trimmed) activities = [...activities, trimmed];
        return { ...d, activities };
      }),
    );
  }

  return (
    <div className="builder">
      <h1>
        {request.origin} → {request.destination}
      </h1>
      <p className="subtitle">
        Real restaurants and attractions from {request.destination}. Build your own day-by-day plan below.
      </p>

      {catalog.flight ? (
        <div className="card">
          <h3>Flight</h3>
          <p>
            {catalog.flight.airline} · {catalog.flight.stops === 0 ? "Nonstop" : `${catalog.flight.stops} stop(s)`}
          </p>
          <p className="price">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: catalog.flight.currency }).format(
              catalog.flight.price,
            )}
          </p>
        </div>
      ) : (
        <p className="notes">No flights found — flight cost won't be included in the budget.</p>
      )}

      <section className="catalog-section">
        <h2>Attractions ({catalog.attractions.length})</h2>
        <p className="muted">Duration and hours are AI estimates, not live data.</p>
        <div className="catalog-list">
          {catalog.attractions.map((a) => (
            <div className="catalog-item" key={a.name}>
              <div className="catalog-item-name">{a.name}</div>
              <div className="catalog-item-meta">{a.category}</div>
              <div className="catalog-item-meta">
                ~{Math.round(a.estimatedDurationMinutes / 30) * 30} min · {a.typicalHours}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="catalog-section">
        <h2>Restaurants ({catalog.restaurants.length})</h2>
        <div className="catalog-list">
          {catalog.restaurants.map((r) => (
            <div className="catalog-item" key={r.name}>
              <div className="catalog-item-name">{r.name}</div>
              <div className="catalog-item-meta">{r.category}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="days-builder">
        <h2>Your day-by-day plan</h2>
        {days.map((day, i) => (
          <div className="day-card" key={day.date}>
            <h3>
              Day {i + 1} — {day.date}
            </h3>

            <div className="meal-row">
              {(["breakfast", "lunch", "dinner"] as const).map((meal) => (
                <label key={meal} className="meal-picker">
                  <span>{meal[0].toUpperCase() + meal.slice(1)}</span>
                  <select
                    value={day[meal] ?? ""}
                    onChange={(e) => updateMeal(i, meal, e.target.value)}
                  >
                    <option value="">— choose —</option>
                    {catalog.restaurants.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <div className="activity-picker">
              <span className="interests-label">Activities</span>
              <div className="interests-grid">
                {catalog.attractions
                  .filter(
                    (a) =>
                      day.activities.includes(a.name) ||
                      !days.some((d, di) => di !== i && d.activities.includes(a.name)),
                  )
                  .map((a) => (
                    <label key={a.name} className="interest-chip">
                      <input
                        type="checkbox"
                        checked={day.activities.includes(a.name)}
                        onChange={() => toggleActivity(i, a.name)}
                      />
                      {a.name}
                    </label>
                  ))}
                <label className="interest-chip">
                  <input type="checkbox" checked={otherEnabled[i]} onChange={() => toggleOther(i)} />
                  Other
                </label>
              </div>
              {otherEnabled[i] && (
                <input
                  type="text"
                  className="other-activity-input"
                  placeholder="Enter a place"
                  value={otherText[i]}
                  onChange={(e) => updateOtherText(i, e.target.value)}
                  autoFocus
                />
              )}
            </div>
          </div>
        ))}
      </section>

      <button onClick={() => onFinalize(days)} disabled={loading}>
        {loading ? "Finalizing…" : "Finalize my trip"}
      </button>
    </div>
  );
}
