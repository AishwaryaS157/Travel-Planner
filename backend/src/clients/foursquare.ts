import type { PlaceResult } from "../types.js";

const FSQ_BASE = "https://places-api.foursquare.com/places/search";
const FSQ_API_VERSION = "2025-06-17";

const CATEGORY_DINING = "4d4b7105d754a06374d81259";
const CATEGORY_ARTS_ENTERTAINMENT = "4d4b7104d754a06370d81259";
const CATEGORY_OUTDOORS_RECREATION = "4d4b7105d754a06377d81259";
const CATEGORY_SHOP_SERVICE = "4d4b7105d754a06378d81259";
const CATEGORY_BAR = "4bf58dd8d48988d116941735";
const CATEGORY_NIGHT_CLUB = "4bf58dd8d48988d11f941735";

const ATTRACTION_CATEGORY_IDS = [
  CATEGORY_ARTS_ENTERTAINMENT,
  CATEGORY_OUTDOORS_RECREATION,
  CATEGORY_SHOP_SERVICE,
  CATEGORY_BAR,
  CATEGORY_NIGHT_CLUB,
].join(",");

const CORE_FIELDS = "name,categories,location";

interface FsqPlace {
  name: string;
  categories?: { name: string }[];
  location?: { formatted_address?: string };
  rating?: number;
  price?: number;
}

async function fsqSearch(
  params: Record<string, string>,
  apiKey: string,
): Promise<FsqPlace[]> {
  const url = new URL(FSQ_BASE);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Places-Api-Version": FSQ_API_VERSION,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Foursquare API error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { results?: FsqPlace[] };
  return data.results ?? [];
}

function mapPlace(place: FsqPlace): PlaceResult {
  return {
    name: place.name,
    category: place.categories?.[0]?.name ?? "Place",
    address: place.location?.formatted_address ?? "",
    rating: place.rating,
    priceLevel: place.price,
  };
}

export async function searchRestaurants(
  destination: string,
  apiKey: string,
  priceTier?: number,
): Promise<PlaceResult[]> {
  const params: Record<string, string> = {
    near: destination,
    fsq_category_ids: CATEGORY_DINING,
    sort: "RATING",
    limit: "20",
    fields: CORE_FIELDS,
  };
  if (priceTier) params.max_price = String(priceTier);
  const results = await fsqSearch(params, apiKey);
  return results.map(mapPlace);
}

export async function searchAttractions(
  destination: string,
  apiKey: string,
): Promise<PlaceResult[]> {
  const params: Record<string, string> = {
    near: destination,
    fsq_category_ids: ATTRACTION_CATEGORY_IDS,
    sort: "RATING",
    limit: "20",
    fields: CORE_FIELDS,
  };
  const results = await fsqSearch(params, apiKey);
  return results.map(mapPlace);
}
