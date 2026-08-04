import { describe, it, expect } from "vitest";
import { estimateAttractionDetailsTool, finalizeTripTool } from "../../src/agent/tools.js";

describe("tool schemas", () => {
  it("estimateAttractionDetailsTool requires an attractions array", () => {
    expect(estimateAttractionDetailsTool.name).toBe("estimate_attraction_details");
    expect(estimateAttractionDetailsTool.parametersJsonSchema).toMatchObject({
      required: ["attractions"],
    });
  });

  it("finalizeTripTool requires hotel and cost fields", () => {
    expect(finalizeTripTool.name).toBe("finalize_trip");
    expect(finalizeTripTool.parametersJsonSchema).toMatchObject({
      required: ["hotelName", "hotelPricePerNight", "foodTotal", "activitiesTotal"],
    });
  });
});
