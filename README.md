# Travel Planner

Give it an origin, a destination, dates, and a budget — it finds real flights, restaurants, and
attractions for the destination, and you build your own day-by-day plan from them.

This is an **agentic** app: the backend calls real APIs (Duffel for flights, Foursquare for
restaurants/attractions) and uses Gemini for the two jobs that actually need model judgment —
estimating how long each attraction takes to visit and its typical hours, and estimating hotel/food/
activity cost and budget fit once you've built your plan — rather than a single prompt making
everything up.

## Data sources

- **Planning:** [Google Gemini API](https://aistudio.google.com/apikey) — free tier.
- **Restaurants & attractions:** [Foursquare Places API](https://location.foursquare.com/developer/) — free tier.
- **Flights:** [Duffel API](https://duffel.com/) — free test-mode signup, no travel-agency accreditation needed.
- **Hotels:** no reliable free live-pricing API exists (Amadeus's free self-service tier is gone; every
  free "hotel API" found either requires RapidAPI, a paid trial, or is an unvetted scraper). Instead,
  Gemini estimates a reasonable hotel and nightly rate — clearly labeled as an estimate, not a
  live/bookable price.
- **Attraction duration & hours:** Foursquare's free tier doesn't return real opening hours, so these
  are also Gemini estimates, labeled as such in the UI.

## Setup

### 1. Get API keys

- Gemini: create a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- Foursquare: sign up at [location.foursquare.com/developer](https://location.foursquare.com/developer/) and create a project API key (uses the new `places-api.foursquare.com` endpoint, Bearer auth — see `backend/src/clients/foursquare.ts`)
- Duffel: sign up at [duffel.com](https://duffel.com/) (~1 minute, no accreditation needed), go to Developers → Access tokens, and copy a **test** token

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in GEMINI_API_KEY, FOURSQUARE_API_KEY, DUFFEL_API_KEY
npm install
npm run dev             # starts on http://localhost:3001
```

Leaving `DUFFEL_API_KEY` blank is fine — the server logs a warning and just skips flight search.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev             # starts on http://localhost:5173, proxies /api to the backend
```

Open http://localhost:5173, fill in the trip form, and submit.

## Testing

```bash
cd backend
npm test
```

## Deploying to Vercel

The backend (Express) and frontend (Vite) deploy as **two separate Vercel projects** from the same
repo — Vercel auto-detects both frameworks, so no custom `vercel.json` is needed.

1. **Push this repo to GitHub** (or use the `vercel` CLI to deploy from your machine without git).
2. **Backend project**: on [vercel.com](https://vercel.com), "Add New Project" → import the repo →
   set **Root Directory** to `backend`. Vercel detects the Express app automatically (it looks for
   `src/server.ts`, which is exactly where ours is). In the project's **Settings → Environment
   Variables**, add `GEMINI_API_KEY`, `FOURSQUARE_API_KEY`, and `DUFFEL_API_KEY` with your real
   values. Deploy, then copy the resulting URL (e.g. `https://your-backend.vercel.app`).
3. **Frontend project**: "Add New Project" again → same repo → **Root Directory** set to `frontend`.
   Vercel auto-detects Vite. Add one environment variable: `VITE_API_BASE_URL` = the backend URL from
   step 2 (no trailing slash). Deploy.
4. Open the frontend's Vercel URL — it now calls the deployed backend instead of localhost.

Notes:
- Never commit `.env`/`.env.local` — both `.gitignore` files already exclude them; enter real keys
  only in each Vercel project's dashboard.
- Gemini's free tier caps at **20 requests/day** per project — fine for testing, but worth knowing
  before demoing this to others.
- Vercel's current default function duration (300s on Hobby, via Fluid Compute) comfortably covers
  this app's sequential external API calls, so no extra timeout configuration is needed.
