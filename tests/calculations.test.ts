import { describe, it, expect } from "vitest";
import {
  computeEstimatorMetrics,
  ESTIMATOR_CONSTANTS,
  computePlannerMetrics,
  computeOnTheRoadMetrics,
} from "../src/calculations";

describe("Monthly earnings estimator", () => {
  it("matches the conservative and blended projections for the baseline scenario", () => {
    const result = computeEstimatorMetrics({ hoursPerDay: 6, daysPerMonth: 25 });

    expect(result.monthlyEarningsFloor).toBeCloseTo(3780, 5);
    expect(result.dailyEarningsBlended).toBeGreaterThan(result.dailyEarningsFloor);

    const totalPatternMinutes =
      ESTIMATOR_CONSTANTS.RIDE_MIX.short.defaultCount * ESTIMATOR_CONSTANTS.RIDE_MIX.short.avgMin +
      ESTIMATOR_CONSTANTS.RIDE_MIX.medium.defaultCount * ESTIMATOR_CONSTANTS.RIDE_MIX.medium.avgMin +
      ESTIMATOR_CONSTANTS.RIDE_MIX.long.defaultCount * ESTIMATOR_CONSTANTS.RIDE_MIX.long.avgMin;
    const weightedMultiplier =
      (ESTIMATOR_CONSTANTS.RIDE_MIX.short.defaultCount *
        ESTIMATOR_CONSTANTS.RIDE_MIX.short.avgMin *
        ESTIMATOR_CONSTANTS.RIDE_MIX.short.rateMult +
        ESTIMATOR_CONSTANTS.RIDE_MIX.medium.defaultCount *
          ESTIMATOR_CONSTANTS.RIDE_MIX.medium.avgMin *
          ESTIMATOR_CONSTANTS.RIDE_MIX.medium.rateMult +
        ESTIMATOR_CONSTANTS.RIDE_MIX.long.defaultCount *
          ESTIMATOR_CONSTANTS.RIDE_MIX.long.avgMin *
          ESTIMATOR_CONSTANTS.RIDE_MIX.long.rateMult) /
      totalPatternMinutes;
    const expectedMonthlyBlend = result.monthlyEarningsFloor * weightedMultiplier;
    expect(result.monthlyEarningsBlended).toBeCloseTo(expectedMonthlyBlend, 2);
  });
});

describe("Planner metrics", () => {
  it("yield a per-minute requirement between zero and one dollar", () => {
    const { perMinuteActive } = computePlannerMetrics({
      earningsGoal: 1600,
      daysInMonth: 30,
      hoursPerDay: 6,
      idlePercent: 30,
    });

    expect(perMinuteActive).toBeGreaterThan(0);
    expect(perMinuteActive).toBeLessThan(1);
  });
});

describe("On-the-road thresholds", () => {
  it("rounds the minute floor to cents", () => {
    const metrics = computeOnTheRoadMetrics({
      minutes: 12,
      miles: 0,
      offer: 0,
      perMinFloor: 0.6,
      dpmFloor: 1.7,
    });

    expect(metrics.minByTime).toBeCloseTo(7.2, 3);
  });

  it("enforces the combined max(minutes, miles) rule", () => {
    const acceptance = computeOnTheRoadMetrics({
      minutes: 15,
      miles: 5,
      offer: 9,
      perMinFloor: 0.6,
      dpmFloor: 1.7,
    });
    const rejection = computeOnTheRoadMetrics({
      minutes: 15,
      miles: 5,
      offer: 8.9,
      perMinFloor: 0.6,
      dpmFloor: 1.7,
    });

    expect(acceptance.minCombined).toBeCloseTo(9, 2);
    expect(acceptance.decisionCombined).toBe("accept");
    expect(rejection.decisionCombined).toBe("reject");
  });
});
