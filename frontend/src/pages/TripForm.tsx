import { useState, type FormEvent } from "react";
import type { TripRequest } from "../types";

interface Props {
  onSubmit: (request: TripRequest) => void;
  disabled: boolean;
}

export default function TripForm({ onSubmit, disabled }: Props) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [days, setDays] = useState(5);
  const [travelers, setTravelers] = useState(1);
  const [budget, setBudget] = useState(2000);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ origin, destination, startDate, days, travelers, budget });
  }

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
      <h1>Travel Planner</h1>
      <p className="subtitle">
        Real flights, restaurants, and attractions — you build the day-by-day plan yourself.
      </p>

      <label>
        From
        <input
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="New York"
          required
        />
      </label>

      <label>
        To
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Tokyo"
          required
        />
      </label>

      <div className="row">
        <label>
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </label>
        <label>
          Days
          <input
            type="number"
            min={1}
            max={30}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            required
          />
        </label>
      </div>

      <div className="row">
        <label>
          Travelers
          <input
            type="number"
            min={1}
            max={10}
            value={travelers}
            onChange={(e) => setTravelers(Number(e.target.value))}
            required
          />
        </label>
        <label>
          Budget (USD)
          <input
            type="number"
            min={1}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            required
          />
        </label>
      </div>

      <button type="submit" disabled={disabled}>
        {disabled ? "Loading…" : "Find real options"}
      </button>
    </form>
  );
}
