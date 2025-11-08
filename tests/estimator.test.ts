import { describe, it, expect } from "vitest";
import { computeEstimatorMetrics, ESTIMATOR_CONSTANTS } from "../src/calculations";

describe("Monthly earnings estimator defaults", () => {
  it("uses the default hours/days mix and yields roughly $37/hr blended", () => {
    const defaults = { hoursPerDay: 6, daysPerMonth: 25 };
    const metrics = computeEstimatorMetrics(defaults);

    const expectedActiveMinutes = defaults.hoursPerDay * 60 * (1 - ESTIMATOR_CONSTANTS.IDLE_PCT);
    expect(metrics.activeMinutesPerDay).toBeCloseTo(expectedActiveMinutes, 5);

    const blendedPerHour = metrics.dailyEarningsBlended / (metrics.activeMinutesPerDay / 60);
    expect(metrics.blendedPerHr).toBeCloseTo(blendedPerHour, 5);
    expect(metrics.blendedPerHr).toBeCloseTo(36.74, 2);
  });
});
