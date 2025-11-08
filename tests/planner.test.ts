import { afterEach, describe, expect, it, vi } from "vitest";
import * as planner from "../src/planner";

describe("planner state updates", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses sanitizeDaysInMonth whenever the planner days change", () => {
    const spy = vi.spyOn(planner, "sanitizeDaysInMonth");

    const baseState = {
      hoursPerDay: 6,
      earningsGoal: 1600,
      noRidePercent: 30,
    } as const;

    planner.computePlannerMetrics({ ...baseState, daysInMonth: 30 });
    spy.mockClear();

    const updatedState = { ...baseState, daysInMonth: 0 };
    const result = planner.computePlannerMetrics(updatedState);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(updatedState.daysInMonth);
    expect(result.dailyTarget).toBeCloseTo(baseState.earningsGoal, 10);
  });
});
