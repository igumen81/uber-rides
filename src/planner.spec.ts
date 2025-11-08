import { computePlannerMetrics, sanitizeDaysInMonth } from "./planner.js";

const baseInputs = {
  hoursPerDay: 6,
  earningsGoal: 1600,
  noRidePercent: 30,
};

const scenarios: Array<{ label: string; days: number }> = [
  { label: "blank", days: Number.NaN },
  { label: "zero", days: 0 },
  { label: "negative", days: -5 },
];

for (const scenario of scenarios) {
  const metrics = computePlannerMetrics({
    ...baseInputs,
    daysInMonth: scenario.days,
  });

  for (const [key, value] of Object.entries(metrics)) {
    if (!Number.isFinite(value)) {
      throw new Error(
        `Expected ${key} to be finite when daysInMonth is ${scenario.label}, received ${value}`
      );
    }
  }

  const expectedDaily = baseInputs.earningsGoal / sanitizeDaysInMonth(scenario.days);
  const delta = Math.abs(metrics.dailyTarget - expectedDaily);
  if (delta > 1e-9) {
    throw new Error(
      `Daily target mismatch for ${scenario.label}: expected ${expectedDaily}, received ${metrics.dailyTarget}`
    );
  }
}

const clampTargets = [Number.NaN, 0, -2, 1, 15];
for (const target of clampTargets) {
  const sanitized = sanitizeDaysInMonth(target);
  if (!Number.isFinite(sanitized) || sanitized < 1) {
    throw new Error(`sanitizeDaysInMonth failed for ${target}: produced ${sanitized}`);
  }
}

console.log("Planner calculations remain finite under non-positive inputs.");
