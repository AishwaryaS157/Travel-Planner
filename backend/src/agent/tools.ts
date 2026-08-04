import type { FunctionDeclaration } from "@google/genai";

export const estimateAttractionDetailsTool: FunctionDeclaration = {
  name: "estimate_attraction_details",
  description:
    "For each given attraction, estimate a typical visit duration and typical opening hours, " +
    "based on general knowledge of that kind of place -- not live data. Return one entry per " +
    "attraction, in the same order they were given.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      attractions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "The attraction's name, for reference" },
            estimatedDurationMinutes: {
              type: "number",
              description: "Typical time in minutes a visitor would spend here",
            },
            typicalHours: {
              type: "string",
              description:
                "Typical opening hours, e.g. '9:00 AM - 5:00 PM, closed Mondays' -- a general estimate, not live data",
            },
          },
          required: ["name", "estimatedDurationMinutes", "typicalHours"],
        },
      },
    },
    required: ["attractions"],
  },
};

export const finalizeTripTool: FunctionDeclaration = {
  name: "finalize_trip",
  description:
    "Estimate hotel cost and total food/activity cost for the trip based on the traveler's " +
    "confirmed day-by-day restaurant and attraction picks.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      hotelName: {
        type: "string",
        description:
          "There is no live hotel search. Your best estimate of a reasonable hotel for this trip " +
          "(e.g. 'Mid-range 3-star hotel near city center') based on your own knowledge -- not a " +
          "real, bookable listing.",
      },
      hotelPricePerNight: {
        type: "number",
        description: "Your estimated nightly rate in USD for that hotel.",
      },
      foodTotal: {
        type: "number",
        description: "Estimated total food cost across the whole trip, in USD, given the traveler's restaurant picks",
      },
      activitiesTotal: {
        type: "number",
        description: "Estimated total activities/attractions cost across the whole trip, in USD, given the traveler's picks",
      },
      notes: {
        type: "string",
        description:
          "Any caveats, e.g. no flights found for this route, or the hotel cost is an estimate not a live price",
      },
      suggestions: {
        type: "array",
        items: { type: "string" },
        description:
          "Only when the plan is over budget: 2-4 concrete, actionable ways the traveler could " +
          "fit their budget (e.g. 'shorten the trip by 2 days', 'increase budget by $300', " +
          "'choose a cheaper hotel'). Omit or leave empty if the plan fits the budget.",
      },
    },
    required: ["hotelName", "hotelPricePerNight", "foodTotal", "activitiesTotal"],
  },
};
