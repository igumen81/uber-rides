export type Decision = "accept" | "reject";

export interface OnTheRoadInput {
  minutes: number;
  miles: number;
  offer: number;
  perMinFloor: number;
  dpmFloor: number;
}

export interface OnTheRoadMetrics {
  minByTime: number;
  minByMiles: number;
  minCombined: number;
  binding: "time" | "miles";
  decisionTime: Decision;
  decisionMiles: Decision;
  decisionCombined: Decision;
}

const centsCeil = (value: number) => Math.ceil(value * 100) / 100;

export function computeOnTheRoadMetrics(input: OnTheRoadInput): OnTheRoadMetrics {
  const safeMinutes = Math.max(0, Number(input.minutes) || 0);
  const safeMiles = Math.max(0, Number(input.miles) || 0);
  const perMinuteFloor = Math.max(0, Number(input.perMinFloor) || 0);
  const perMileFloor = Math.max(0, Number(input.dpmFloor) || 0);
  const offer = Math.max(0, Number(input.offer) || 0);

  const minByTime = centsCeil(safeMinutes * perMinuteFloor);
  const minByMiles = centsCeil(safeMiles * perMileFloor);
  const minCombined = Math.max(minByTime, minByMiles);
  const binding: "time" | "miles" = minByTime >= minByMiles ? "time" : "miles";

  const decision = (threshold: number): Decision => (offer >= threshold ? "accept" : "reject");

  return {
    minByTime,
    minByMiles,
    minCombined,
    binding,
    decisionTime: decision(minByTime),
    decisionMiles: decision(minByMiles),
    decisionCombined: decision(minCombined),
  };
}

export interface PlannerInput {
  earningsGoal: number;
  daysInMonth: number;
  hoursPerDay: number;
  idlePercent: number;
}

export interface PlannerMetrics {
  dailyTarget: number;
  dphAllIn: number;
  dphActive: number;
  effectiveHours: number;
  perMinuteActive: number;
}

export const DPM_FLOORS = {
  r10: 1.4,
  r10to20: 1.7,
  r20to25: 2.4,
} as const;

export type PlannerThresholdRow = {
  label: string;
  ridesUsed: number;
  minDollarsPerRide: number;
  maxMilesPerRide: number;
};

export function computePlannerMetrics(input: PlannerInput): PlannerMetrics {
  const safeGoal = Math.max(0, Number(input.earningsGoal) || 0);
  const safeDays = Math.max(0, Number(input.daysInMonth) || 0);
  const safeHours = Math.max(0.1, Number(input.hoursPerDay) || 0);
  const idleFraction = Math.min(95, Math.max(0, Number(input.idlePercent) || 0)) / 100;

  const dailyTarget = safeDays > 0 ? safeGoal / safeDays : 0;
  const dphAllIn = dailyTarget / safeHours;
  const effectiveHours = Math.max(0.1, safeHours * (1 - idleFraction));
  const dphActive = effectiveHours > 0 ? dailyTarget / effectiveHours : 0;
  const perMinuteActive = dphActive / 60;

  return { dailyTarget, dphAllIn, dphActive, effectiveHours, perMinuteActive };
}

export function buildPlannerThresholdRows(dailyTarget: number): PlannerThresholdRow[] {
  const mk = (label: string, ridesUsed: number, dpmFloor: number): PlannerThresholdRow => {
    const minDollars = ridesUsed > 0 ? dailyTarget / ridesUsed : 0;
    const maxMiles = dpmFloor > 0 ? minDollars / dpmFloor : 0;
    return { label, ridesUsed, minDollarsPerRide: minDollars, maxMilesPerRide: maxMiles };
  };

  return [
    mk("10 rides", 10, DPM_FLOORS.r10),
    mk("10–20 rides (using 20)", 20, DPM_FLOORS.r10to20),
    mk("20–25 rides (using 25)", 25, DPM_FLOORS.r20to25),
  ];
}

export interface EstimatorInput {
  hoursPerDay: number;
  daysPerMonth: number;
}

export interface EstimatorMetrics {
  activeMinutesPerDay: number;
  dailyCounts: {
    short: number;
    medium: number;
    long: number;
  };
  perMin: {
    short: number;
    medium: number;
    long: number;
  };
  dailyEarningsFloor: number;
  dailyEarningsBlended: number;
  monthlyEarningsFloor: number;
  monthlyEarningsBlended: number;
  blendedPerHr: number;
  scale: number;
}

export const ESTIMATOR_CONSTANTS = {
  IDLE_PCT: 0.3,
  BASE_PER_MIN: 0.6,
  RIDE_MIX: {
    short: { label: "Short (<10 min)", avgMin: 8, rateMult: 1.08, defaultCount: 10 },
    medium: { label: "Medium (10–20 min)", avgMin: 15, rateMult: 1.0, defaultCount: 4 },
    long: { label: "Long (20+ min)", avgMin: 25, rateMult: 0.95, defaultCount: 2 },
  } as const,
} as const;

const patternMinutes =
  ESTIMATOR_CONSTANTS.RIDE_MIX.short.defaultCount * ESTIMATOR_CONSTANTS.RIDE_MIX.short.avgMin +
  ESTIMATOR_CONSTANTS.RIDE_MIX.medium.defaultCount * ESTIMATOR_CONSTANTS.RIDE_MIX.medium.avgMin +
  ESTIMATOR_CONSTANTS.RIDE_MIX.long.defaultCount * ESTIMATOR_CONSTANTS.RIDE_MIX.long.avgMin;

export function computeEstimatorMetrics(input: EstimatorInput): EstimatorMetrics {
  const safeHours = Math.max(0, Number(input.hoursPerDay) || 0);
  const safeDays = Math.max(0, Number(input.daysPerMonth) || 0);

  const activeMinutesPerDay = safeHours * 60 * (1 - ESTIMATOR_CONSTANTS.IDLE_PCT);
  const scale = patternMinutes > 0 ? activeMinutesPerDay / patternMinutes : 0;

  const dailyCounts = {
    short: ESTIMATOR_CONSTANTS.RIDE_MIX.short.defaultCount * scale,
    medium: ESTIMATOR_CONSTANTS.RIDE_MIX.medium.defaultCount * scale,
    long: ESTIMATOR_CONSTANTS.RIDE_MIX.long.defaultCount * scale,
  };

  const perMin = {
    short: ESTIMATOR_CONSTANTS.BASE_PER_MIN * ESTIMATOR_CONSTANTS.RIDE_MIX.short.rateMult,
    medium: ESTIMATOR_CONSTANTS.BASE_PER_MIN * ESTIMATOR_CONSTANTS.RIDE_MIX.medium.rateMult,
    long: ESTIMATOR_CONSTANTS.BASE_PER_MIN * ESTIMATOR_CONSTANTS.RIDE_MIX.long.rateMult,
  } as const;

  const dailyEarningsFloor = activeMinutesPerDay * ESTIMATOR_CONSTANTS.BASE_PER_MIN;
  const dailyEarningsBlended =
    dailyCounts.short * ESTIMATOR_CONSTANTS.RIDE_MIX.short.avgMin * perMin.short +
    dailyCounts.medium * ESTIMATOR_CONSTANTS.RIDE_MIX.medium.avgMin * perMin.medium +
    dailyCounts.long * ESTIMATOR_CONSTANTS.RIDE_MIX.long.avgMin * perMin.long;

  const monthlyEarningsFloor = dailyEarningsFloor * safeDays;
  const monthlyEarningsBlended = dailyEarningsBlended * safeDays;

  const weightedMultiplier =
    (ESTIMATOR_CONSTANTS.RIDE_MIX.short.avgMin * ESTIMATOR_CONSTANTS.RIDE_MIX.short.rateMult +
      ESTIMATOR_CONSTANTS.RIDE_MIX.medium.avgMin * ESTIMATOR_CONSTANTS.RIDE_MIX.medium.rateMult +
      ESTIMATOR_CONSTANTS.RIDE_MIX.long.avgMin * ESTIMATOR_CONSTANTS.RIDE_MIX.long.rateMult) /
    patternMinutes;
  const blendedPerHr = ESTIMATOR_CONSTANTS.BASE_PER_MIN * weightedMultiplier * 60;

  return {
    activeMinutesPerDay,
    dailyCounts,
    perMin,
    dailyEarningsFloor,
    dailyEarningsBlended,
    monthlyEarningsFloor,
    monthlyEarningsBlended,
    blendedPerHr,
    scale,
  };
}
