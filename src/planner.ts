export type PlannerInputs = {
  hoursPerDay: number;
  earningsGoal: number;
  daysInMonth: number;
  noRidePercent: number;
};

export type PlannerMetrics = {
  dailyTarget: number;
  dphAllIn: number;
  dphActive: number;
  effectiveHours: number;
};

export function sanitizeDaysInMonth(value: number, fallback = 1): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) {
    return fallback;
  }
  return numeric;
}

export function computePlannerMetrics({
  hoursPerDay,
  earningsGoal,
  daysInMonth,
  noRidePercent,
}: PlannerInputs): PlannerMetrics {
  const safeHours = Math.max(0.1, Number(hoursPerDay) || 0);
  const safeGoal = Math.max(0, Number(earningsGoal) || 0);
  const safeDays = sanitizeDaysInMonth(daysInMonth);
  const pctIdle = Math.min(95, Math.max(0, Number(noRidePercent) || 0)) / 100;

  const dailyTarget = safeGoal / safeDays;
  const effectiveHours = Math.max(0.1, safeHours * (1 - pctIdle));
  const dphAllIn = dailyTarget / safeHours;
  const dphActive = dailyTarget / effectiveHours;

  return {
    dailyTarget,
    dphAllIn,
    dphActive,
    effectiveHours,
  };
}
