import React, { useCallback, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import {
  computeOnTheRoadMetrics,
  computePlannerMetrics,
  buildPlannerThresholdRows,
  ESTIMATOR_CONSTANTS,
  computeEstimatorMetrics,
  type PlannerThresholdRow,
} from "./calculations";
import { sanitizeDaysInMonth } from "./planner";

/**
 * Uber Rides — Tabbed App (On‑the‑road + Planner + Estimator)
 *
 * Tabs:
 *  1) On the road — instant accept/reject using minutes, miles, or both (combined).
 *  2) Earnings Planner — monthly goal, idle%, thresholds.
 *  3) Earnings Estimator — 2‑input (hours/day, days/month) monthly estimator with blended ride mix.
 *
 * Notes:
 *  • Core calculator logic lives in src/calculations.ts and is verified by tests/calculations.test.ts.
 */

// -----------------------------
// Utility formatters
// -----------------------------
const fmtCurrency = (x: number, digits = 2) =>
  x.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const fmtNumber = (x: number, d = 2) => (Number.isFinite(x) ? Number(x).toFixed(d) : "—");

// -----------------------------
// Tab Shell
// -----------------------------
function Tabs({
  tab,
  setTab,
}: {
  tab: "road" | "planner" | "estimator";
  setTab: (t: "road" | "planner" | "estimator") => void;
}) {
  const Item = ({ id, label }: { id: "road" | "planner" | "estimator"; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className={
        "px-4 py-2 rounded-xl text-sm font-medium border transition " +
        (tab === id
          ? "bg-indigo-600 text-white border-indigo-600 shadow"
          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300")
      }
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center gap-2">
      <Item id="road" label="On the road" />
      <Item id="planner" label="Earnings Planner" />
      <Item id="estimator" label="Earnings Estimator" />
    </div>
  );
}

// -----------------------------
// (1) On‑the‑road — minutes, miles, and combined
// -----------------------------
function OnTheRoad() {
  // Floors (editable) — conservative defaults
  const [perMinFloor, setPerMinFloor] = useState<number>(0.6); // $/active min
  const [dpmFloor, setDpmFloor] = useState<number>(1.7); // $/mile

  // Shared inputs
  const [minutes, setMinutes] = useState<number>(12);
  const [miles, setMiles] = useState<number>(5);
  const [fair, setFair] = useState<number>(10); // offer amount

  const {
    minByTime,
    minByMiles,
    minCombined,
    binding,
    decisionTime,
    decisionMiles,
    decisionCombined,
  } = useMemo(
    () =>
      computeOnTheRoadMetrics({
        minutes,
        miles,
        offer: fair,
        perMinFloor,
        dpmFloor,
      }),
    [minutes, miles, fair, perMinFloor, dpmFloor]
  );

  const quickTimes = [6, 8, 10, 12, 15, 18, 20, 25, 30];
  const quickMiles = [2, 3, 4, 5, 6, 8, 10];
  // === Charts data (Offer vs Needs + Coverage Donut) ===
  const offerVal = Math.max(0, Number(fair) || 0);
  const timeNeed = minByTime;
  const mileNeed = minByMiles;
  const need = minCombined;

  const barData = [
    { name: "Offer", value: offerVal },
    { name: "Time need", value: timeNeed },
    { name: "Miles need", value: mileNeed },
  ];

  let donutData: { name: string; value: number }[] = [];
  if (offerVal >= need) {
    donutData = [
      { name: "Required", value: need },
      { name: "Over", value: offerVal - need },
    ];
  } else {
    donutData = [
      { name: "Covered", value: offerVal },
      { name: "Shortfall", value: need - offerVal },
    ];
  }

  const COLORS = {
    offer: "#10b981",      // emerald
    time: "#6366f1",       // indigo
    miles: "#f59e0b",      // amber
    required: "#94a3b8",   // slate-400
    over: "#34d399",       // emerald-400
    shortfall: "#ef4444",  // red-500
  } as const;

  return (
    <div className="text-slate-800">
      {/* Header */}
      <header className="mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">On the road</h2>
        <p className="mt-2 text-slate-600">
          Instant accept/reject using minutes, miles, or both. Include pickup time/distance.<br />
          <span className="font-bold">Rule:</span><span className="font-medium"> accept only if offer ≥ max(minutes × $/min floor, miles × $/mi floor)</span>.
        </p>
      </header>

      {/* Floors (editable) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-6">
        <h3 className="text-lg font-semibold mb-3">Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="rounded-xl border border-slate-200 p-4">
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="permin">
              $/min floor (minutes)
            </label>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">$</span>
              <input
                id="permin"
                type="number"
                min={0}
                step={0.05}
                value={perMinFloor}
                onChange={(e) => setPerMinFloor(parseFloat(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-500">/min</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="dpm">
              $/mi floor (miles)
            </label>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">$</span>
              <input
                id="dpm"
                type="number"
                min={0}
                step={0.1}
                value={dpmFloor}
                onChange={(e) => setDpmFloor(parseFloat(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-500">/mi</span>
            </div>
          </div>
        </div>
      </section>


      {/* Ride check inputs */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-6">
        <h3 className="text-lg font-semibold mb-3">Check Ride</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="rounded-xl border border-slate-200 p-4">
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="mins">
              Minutes per ride (incl. pickup)
            </label>
            <input
              id="mins"
              type="number"
              min={0}
              step={1}
              value={minutes}
              onChange={(e) => setMinutes(parseFloat(e.target.value))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 12"
            />
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="miles">
              Miles per ride (incl. pickup)
            </label>
            <input
              id="miles"
              type="number"
              min={0}
              step={0.1}
              value={miles}
              onChange={(e) => setMiles(parseFloat(e.target.value))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 5"
            />
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="offer">
              Fair ($) — offer amount
            </label>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">$</span>
              <input
                id="offer"
                type="number"
                min={0}
                step={0.25}
                value={fair}
                onChange={(e) => setFair(parseFloat(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </section>

     {/* Visuals */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mt-6">
        <h3 className={`text-lg font-semibold mb-3 ${offerVal >= need ? "text-emerald-600" : "text-rose-600"}`}>
          {offerVal >= need ? "✅ Accept" : "❌ Reject"}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">

          {/* DONUT: Coverage vs Required */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="60%"
                    outerRadius="85%"
                    paddingAngle={2}
                  >
                    {donutData.map((d, i) => {
                      const fill =
                        d.name === "Required" ? COLORS.required :
                        d.name === "Over" ? COLORS.over :
                        d.name === "Covered" ? COLORS.offer :
                        COLORS.shortfall; // Shortfall
                      return <Cell key={`p-${i}`} fill={fill} />;
                    })}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [`$${Number(v).toFixed(2)}`, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Center summary */}
            <div className="mt-3 text-center">
              <div className="text-2xl font-semibold">
                {offerVal >= need
                  ? `+$${(offerVal - need).toFixed(2)} over`
                  : `-$${(need - offerVal).toFixed(2)} short`}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Offer: <span className="font-medium">${offerVal.toFixed(2)}</span> · Required: <span className="font-medium">${need.toFixed(2)}</span>
              </div>
              <br />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

              <div className={`rounded-xl border ${decisionTime === "accept" ? "border-emerald-300" : "border-rose-300"} p-4`}>
                <h3 className="text-lg font-semibold mb-1">Time</h3>
                <div className="text-slate-700">
                  {decisionTime === "accept" ? "✅ " : "❌ "}<span className="font-bold">{fmtCurrency(minByTime)}</span> = {fmtNumber(minutes, 0)} min × {fmtCurrency(perMinFloor)}/min.
                  {decisionTime === "reject" && (
                    <span><br />Short by {fmtCurrency(Math.max(0, minByTime - (Number(fair) || 0)))}.</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-3"><br />offer ≥ minutes × $/min floor.</p>
              </div>
              <div className={`rounded-xl border ${decisionMiles === "accept" ? "border-emerald-300" : "border-rose-300"} p-4`}>
                <h3 className="text-lg font-semibold mb-1">Miles</h3>
                <div className="text-slate-700">
                  {decisionMiles === "accept" ? "✅ " : "❌ "}<span className="font-bold">{fmtCurrency(minByMiles)}</span> = {fmtNumber(miles, 1)} mi × {fmtCurrency(dpmFloor)}/mi.
                  {decisionMiles === "reject" && (
                    <span><br />Short by {fmtCurrency(Math.max(0, minByMiles - (Number(fair) || 0)))}.</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-3"><br />offer ≥ miles × $/mi floor.</p>
              </div>
              <div className={`rounded-xl border ${decisionCombined === "accept" ? "border-emerald-300" : "border-rose-300"} p-4`}>
                <h3 className="text-lg font-semibold mb-1">Combined</h3>
                <div className="text-slate-700">
                  {decisionCombined === "accept" ? "✅ " : "❌ "}<span className="font-bold">{fmtCurrency(minCombined)}</span> based on <span className="font-bold">{binding}</span>
                  . {decisionCombined === "reject" && (
                    <span><br />Short by {fmtCurrency(Math.max(0, minCombined - (Number(fair) || 0)))}.</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-3"><br />offer ≥ max(minutes × $/min floor, miles × $/mi floor).</p>
              </div>
            </div>
           </div>
      </section>


      {/* Quick mental cheat‑sheet */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mt-6">
        <h3 className="text-lg font-semibold mb-2">Quick mental cheat‑sheet</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-slate-600 mb-2">Minutes ➜ minimum fair (× {fmtCurrency(perMinFloor)}/min)</div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {quickTimes.map((m) => (
                <div key={m} className="rounded-xl border border-slate-200 px-3 py-2 flex items-center justify-between">
                  <span>{m} min</span>
                  <span className="font-medium">{fmtCurrency(Math.ceil(m * perMinFloor * 100) / 100)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-600 mb-2">Miles ➜ minimum fair (× {fmtCurrency(dpmFloor)}/mi)</div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {quickMiles.map((mi) => (
                <div key={mi} className="rounded-xl border border-slate-200 px-3 py-2 flex items-center justify-between">
                  <span>{mi} mi</span>
                  <span className="font-medium">{fmtCurrency(Math.ceil(mi * dpmFloor * 100) / 100)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// -----------------------------
// (2) Earnings Planner
// -----------------------------
function UberEarningsPlanner() {
  // Defaults
  const DEFAULT_GOAL = 1600; // $
  const DEFAULT_DAYS = 30; // days
  const DEFAULT_HOURS_PER_DAY = 6; // hours
  const DEFAULT_NO_RIDE_PCT = 30; // % idle

  // Month/year
  const now = new Date();
  const [monthIndex, setMonthIndex] = useState<number>(now.getMonth()); // 0–11
  const [year, setYear] = useState<number>(now.getFullYear());

  // State
  const [hoursPerDay, setHoursPerDay] = useState<number>(DEFAULT_HOURS_PER_DAY);
  const [earningsGoal, setEarningsGoal] = useState<number>(DEFAULT_GOAL);
  const [noRidePercent, setNoRidePercent] = useState<number>(DEFAULT_NO_RIDE_PCT);
  const [daysInMonth, setDaysInMonth] = useState<number>(DEFAULT_DAYS);
  const setSafeDaysInMonth = useCallback((value: number) => {
    setDaysInMonth(() => sanitizeDaysInMonth(value));
  }, []);

  // Derived
  const { dailyTarget, dphAllIn, dphActive, effectiveHours } = useMemo(
    () =>
      computePlannerMetrics({
        earningsGoal,
        daysInMonth,
        hoursPerDay,
        idlePercent: noRidePercent,
      }),
    [earningsGoal, daysInMonth, hoursPerDay, noRidePercent]
  );

  // Per‑ride thresholds table
  const rows: PlannerThresholdRow[] = useMemo(
    () => buildPlannerThresholdRows(dailyTarget),
    [dailyTarget]
  );

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div className="text-slate-800">
      {/* Header */}
      <header className="mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Earnings Planner</h2>
        <p className="mt-2 text-slate-600">
          Enter your <span className="font-medium">monthly earnings goal</span>, <span className="font-medium">days doing rides</span> and <span className="font-medium">hours per day</span>.
        </p>
      </header>

      {/* Inputs */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="goal1">
            Monthly earnings goal
          </label>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">$</span>
            <input
              id="goal1"
              type="number"
              min={0}
              step={50}
              value={earningsGoal}
              onChange={(e) => setEarningsGoal(parseFloat(e.target.value))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="1600"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">Split across days rides are done.</p>
        </div>



        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="days1">
            Days per month
          </label>
          <input
            id="days1"
            type="number"
            min={1}
            max={31}
            step={1}
            value={daysInMonth}
            onChange={(e) => setSafeDaysInMonth(parseFloat(e.target.value))}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., 6"
          />
          <p className="mt-2 text-xs text-slate-500">
            Total on‑app days per month.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="hours1">
            Hours per day
          </label>
          <input
            id="hours1"
            type="number"
            min={1}
            step={0.5}
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., 6"
          />
          <p className="mt-2 text-xs text-slate-500">
            Total on‑app time per day (includes idle/wait time).
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="idle1">
            No‑ride time (%)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="idle1"
              type="number"
              min={0}
              max={95}
              step={1}
              value={noRidePercent}
              onChange={(e) => setNoRidePercent(parseFloat(e.target.value))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="30"
            />
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">%</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Default 30%. Portion of the day with no active rides.
          </p>
        </div>

      </section>

      {/* Summary */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <div className="text-sm text-slate-500">Daily target (goal ÷ {daysInMonth} days)</div>
          <div className="text-2xl font-semibold">{fmtCurrency(dailyTarget)}</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">Effective earning hours</div>
          <div className="text-2xl font-semibold">{fmtNumber(effectiveHours, 2)} h</div>
          <div className="text-xs text-slate-500">(Hours per day × (1 − no‑ride%))</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">Required $/hour — all‑in</div>
          <div className="text-2xl font-semibold">{fmtCurrency(dphAllIn)}</div>
          <div className="text-xs text-slate-500">(Daily target ÷ hours per day)</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">Required $/hour — during active driving</div>
          <div className="text-2xl font-semibold">{fmtCurrency(dphActive)}</div>
          <div className="text-xs text-slate-500">(Daily target ÷ effective hours)</div>
        </div>
        <div className="md:col-span-4 text-sm text-slate-500">
          Assumes DPM floors: 10 → $1.40/mi, 10–20 → $1.70/mi, 20–25 → $2.40/mi
        </div>
      </section>

      {/* Per‑Ride Thresholds */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Per‑Ride Thresholds (by daily ride volume)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-white/70">
                <th className="px-4 py-3 text-sm font-medium text-slate-600">Bracket</th>
                <th className="px-4 py-3 text-sm font-medium text-slate-600">Rides used</th>
                <th className="px-4 py-3 text-sm font-medium text-slate-600">Min dollars / ride</th>
                <th className="px-4 py-3 text-sm font-medium text-slate-600">Max miles / ride</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b last:border-0 border-slate-200">
                  <td className="px-4 py-3 font-medium">{r.label}</td>
                  <td className="px-4 py-3 text-slate-600">{r.ridesUsed}</td>
                  <td className="px-4 py-3">{fmtCurrency(r.minDollarsPerRide)}</td>
                  <td className="px-4 py-3">{fmtNumber(r.maxMilesPerRide)} mi</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// -----------------------------
// (3) Earnings Estimator — 2 inputs
// -----------------------------
function MonthlyEarningsEstimator() {
  // Inputs
  const [hoursPerDay, setHoursPerDay] = useState<number>(6);
  const [daysPerMonth, setDaysPerMonth] = useState<number>(25);
  const CATS = ESTIMATOR_CONSTANTS.RIDE_MIX;

  const {
    activeMinutesPerDay,
    dailyCounts,
    perMin,
    dailyEarningsFloor,
    dailyEarningsBlended,
    monthlyEarningsFloor,
    monthlyEarningsBlended,
    blendedPerHr,
  } = useMemo(
    () => computeEstimatorMetrics({ hoursPerDay, daysPerMonth }),
    [hoursPerDay, daysPerMonth]
  );

  return (
    <div className="text-slate-800">
      {/* Header */}
      <header className="mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Earnings Estimator</h2>
        <p className="mt-2 text-slate-600">
          Two inputs only. We assume <span className="font-medium">{ESTIMATOR_CONSTANTS.IDLE_PCT * 100}% idle time</span> and a
          blended ride mix by duration. Earnings are shown as a conservative floor and a realistic blended estimate.
        </p>
      </header>

      {/* Inputs — sliders */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="hours2">
            Hours per day
          </label>
          <div className="flex items-center gap-3">
            <input
              id="hours2"
              type="range"
              min={1}
              max={12}
              step={0.5}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <span className="w-20 text-right font-medium">{hoursPerDay.toFixed(1)} h</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="days2">
            Days per month
          </label>
          <div className="flex items-center gap-3">
            <input
              id="days2"
              type="range"
              min={1}
              max={30}
              step={1}
              value={daysPerMonth}
              onChange={(e) => setDaysPerMonth(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600"
            />
            <span className="w-12 text-right font-medium">{daysPerMonth}</span>
          </div>
        </div>
      </section>

      {/* Assumptions */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-6 text-sm text-slate-600">
        <div className="flex flex-wrap gap-4">
          <div>
            <span className="font-medium">Idle time:</span> {ESTIMATOR_CONSTANTS.IDLE_PCT * 100}% of on‑app time
          </div>
          <div>
            <span className="font-medium">Active $/min floor:</span> ${ESTIMATOR_CONSTANTS.BASE_PER_MIN.toFixed(2)}
          </div>
          <div>
            <span className="font-medium">Ride mix:</span> 10× short (8m), 4× medium (15m), 2× long (25m) — scaled
          </div>
          <div>
            <span className="font-medium">Category rates:</span> short +8%, medium baseline, long −5%
          </div>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Active time per day</div>
          <div className="text-2xl font-semibold">{fmtNumber(activeMinutesPerDay / 60, 2)} h</div>
          <div className="text-xs text-slate-500">= hours × {(1 - ESTIMATOR_CONSTANTS.IDLE_PCT) * 100}%</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Conservative $/hr (active)</div>
          <div className="text-2xl font-semibold">{fmtNumber(ESTIMATOR_CONSTANTS.BASE_PER_MIN * 60, 2)}</div>
          <div className="text-xs text-slate-500">Using ${ESTIMATOR_CONSTANTS.BASE_PER_MIN.toFixed(2)} per active min</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Blended $/hr (active)</div>
          <div className="text-2xl font-semibold">{fmtNumber(blendedPerHr, 2)}</div>
          <div className="text-xs text-slate-500">Time‑weighted by ride mix</div>
        </div>
      </section>

      {/* Earnings summary */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Daily Potential</h3>
          <div className="flex items-center justify-between text-slate-700">
            <div>Conservative (floor)</div>
            <div className="font-semibold">{fmtCurrency(dailyEarningsFloor)}</div>
          </div>
          <div className="flex items-center justify-between text-slate-700 mt-2">
            <div>Blended estimate</div>
            <div className="font-semibold">{fmtCurrency(dailyEarningsBlended)}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Monthly Potential</h3>
          <div className="flex items-center justify-between text-slate-700">
            <div>Conservative (floor)</div>
            <div className="font-semibold">{fmtCurrency(monthlyEarningsFloor, 0)}</div>
          </div>
          <div className="flex items-center justify-between text-slate-700 mt-2">
            <div>Blended estimate</div>
            <div className="font-semibold">{fmtCurrency(monthlyEarningsBlended, 0)}</div>
          </div>
          <div className="text-xs text-slate-500 mt-2">Days per month: {daysPerMonth}</div>
        </div>
      </section>

      {/* Ride mix breakdown */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Ride Mix Breakdown (per day, scaled)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-white/70">
                <th className="px-4 py-3 text-sm font-medium text-slate-600">Category</th>
                <th className="px-4 py-3 text-sm font-medium text-slate-600">Est. rides/day</th>
                <th className="px-4 py-3 text-sm font-medium text-slate-600">Avg minutes</th>
                <th className="px-4 py-3 text-sm font-medium text-slate-600">$ / min</th>
                <th className="px-4 py-3 text-sm font-medium text-slate-600">Minutes/day</th>
                <th className="px-4 py-3 text-sm font-medium text-slate-600">Earnings/day</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: "short", ...CATS.short, count: dailyCounts.short, rate: perMin.short },
                { key: "medium", ...CATS.medium, count: dailyCounts.medium, rate: perMin.medium },
                { key: "long", ...CATS.long, count: dailyCounts.long, rate: perMin.long },
              ].map((c) => {
                const minutes = c.count * c.avgMin;
                const dollars = minutes * c.rate;
                return (
                  <tr key={c.key as string} className="border-b last:border-0 border-slate-200">
                    <td className="px-4 py-3 font-medium">{c.label}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtNumber(c.count, 1)}</td>
                    <td className="px-4 py-3 text-slate-700">{c.avgMin}</td>
                    <td className="px-4 py-3 text-slate-700">{`$${fmtNumber(c.rate, 2)}`}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtNumber(minutes, 0)}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtCurrency(dollars)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// -----------------------------
// Default export: Tabbed App
// -----------------------------
export default function EarningsSuite() {
  const [tab, setTab] = useState<"road" | "planner" | "estimator">("road");
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-800 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Uber Rides</h1>
          <Tabs tab={tab} setTab={setTab} />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {tab === "road" ? <OnTheRoad /> : tab === "planner" ? <UberEarningsPlanner /> : <MonthlyEarningsEstimator />}
        </div>
      </div>
    </div>
  );
}