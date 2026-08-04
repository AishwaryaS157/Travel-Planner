export interface TripRequest {
  origin: string;
  destination: string;
  startDate: string;
  days: number;
  travelers: number;
  budget: number;
}

export interface FlightOption {
  airline: string;
  price: number;
  currency: string;
  departDate: string;
  returnDate: string;
  stops: number;
}

export interface HotelOption {
  name: string;
  pricePerNight: number;
  currency: string;
  rating?: number;
}

export interface PlaceResult {
  name: string;
  category: string;
  address: string;
  rating?: number;
  priceLevel?: number;
}

export interface AttractionOption extends PlaceResult {
  estimatedDurationMinutes: number;
  typicalHours: string;
}

export interface DayPlan {
  date: string;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  activities: string[];
}

export interface TripCatalog {
  flight?: FlightOption;
  restaurants: PlaceResult[];
  attractions: AttractionOption[];
}

export interface ItineraryDay {
  date: string;
  summary: string;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  activities: string[];
}

export interface BudgetBreakdown {
  flightsTotal: number;
  hotelTotal: number;
  foodTotal: number;
  activitiesTotal: number;
  grandTotal: number;
  budget: number;
  overBudget: boolean;
}

export interface Itinerary {
  destination: string;
  origin: string;
  startDate: string;
  days: ItineraryDay[];
  flight?: FlightOption;
  hotel?: HotelOption;
  budgetBreakdown: BudgetBreakdown;
  notes?: string;
  suggestions: string[];
}
