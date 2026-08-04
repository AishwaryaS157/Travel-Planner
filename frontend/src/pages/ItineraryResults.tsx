import type { Itinerary } from "../types";

interface Props {
  itinerary: Itinerary;
  onReset: () => void;
}

function money(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

export default function ItineraryResults({ itinerary, onReset }: Props) {
  const b = itinerary.budgetBreakdown;

  return (
    <div className="results">
      <button className="back" onClick={onReset}>
        &larr; Plan another trip
      </button>

      <h1>
        {itinerary.origin} &rarr; {itinerary.destination}
      </h1>
      <p className="subtitle">Starting {itinerary.startDate}</p>

      {itinerary.notes && <div className="notes">{itinerary.notes}</div>}

      <section className="summary-cards">
        <div className="card">
          <h3>Flight</h3>
          {itinerary.flight ? (
            <>
              <p>
                {itinerary.flight.airline} &middot;{" "}
                {itinerary.flight.stops === 0 ? "Nonstop" : `${itinerary.flight.stops} stop(s)`}
              </p>
              <p className="price">{money(itinerary.flight.price, itinerary.flight.currency)}</p>
            </>
          ) : (
            <p className="muted">No flights found</p>
          )}
        </div>
        <div className="card">
          <h3>Hotel</h3>
          {itinerary.hotel ? (
            <>
              <p>
                {itinerary.hotel.name}
                {itinerary.hotel.rating ? ` ★ ${itinerary.hotel.rating}` : ""}
              </p>
              <p className="price">{money(itinerary.hotel.pricePerNight, itinerary.hotel.currency)}/night</p>
            </>
          ) : (
            <p className="muted">No hotels found</p>
          )}
        </div>
      </section>

      <section className={`budget-breakdown ${b.overBudget ? "over" : ""}`}>
        <h2>Budget</h2>
        <ul>
          <li>
            <span>Flights</span>
            <span>{money(b.flightsTotal)}</span>
          </li>
          <li>
            <span>Hotel</span>
            <span>{money(b.hotelTotal)}</span>
          </li>
          <li>
            <span>Food</span>
            <span>{money(b.foodTotal)}</span>
          </li>
          <li>
            <span>Activities</span>
            <span>{money(b.activitiesTotal)}</span>
          </li>
          <li className="total">
            <span>Total</span>
            <span>{money(b.grandTotal)}</span>
          </li>
          <li className="budget-line">
            <span>Your budget</span>
            <span>{money(b.budget)}</span>
          </li>
        </ul>
        {b.overBudget && (
          <p className="warning">This plan is {money(b.grandTotal - b.budget)} over budget.</p>
        )}
        {b.overBudget && itinerary.suggestions.length > 0 && (
          <div className="suggestions">
            <h3>Ways to fit your budget</h3>
            <ul>
              {itinerary.suggestions.map((suggestion, i) => (
                <li key={i}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="days">
        <h2>Day-by-day itinerary</h2>
        {itinerary.days.map((day) => (
          <div className="day-card" key={day.date}>
            <h3>
              {day.date} — {day.summary}
            </h3>
            <div className="meals">
              {day.breakfast && (
                <p>
                  <strong>Breakfast:</strong> {day.breakfast}
                </p>
              )}
              {day.lunch && (
                <p>
                  <strong>Lunch:</strong> {day.lunch}
                </p>
              )}
              {day.dinner && (
                <p>
                  <strong>Dinner:</strong> {day.dinner}
                </p>
              )}
            </div>
            {day.activities.length > 0 && (
              <ul className="activities">
                {day.activities.map((activity, i) => (
                  <li key={i}>{activity}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
