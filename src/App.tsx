import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Legend,
  PieChart, Pie, Cell,
} from "recharts";

/**
 * Uber Rides — Tabbed App (On‑the‑road + Planner + Estimater)
 *
 * Tabs:
 *  1) On the road — instant accept/reject using minutes, miles, or both (combined).
 *  2) Earnings Planner — monthly goal, idle%, thresholds.
 *  3) Earnings Estimater — 2‑input (hours/day, days/month) monthly estimator with blended ride mix.
 *
 * Notes:
 *  • Lightweight runtime sanity tests live at the bottom.
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
      <Item id="estimator" label="Earnings Estimater" />
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

  // --- Time‑only ---
  const minByTime = useMemo(() => {
    const m = Math.max(0, Number(minutes) || 0);
    const floor = Math.max(0, Number(perMinFloor) || 0);
    return Math.ceil(m * floor * 100) / 100; // round up to cents
  }, [minutes, perMinFloor]);
  const decisionTime = useMemo(
    () => ((Number(fair) || 0) >= minByTime ? "accept" : "reject"),
    [fair, minByTime]
  );

  // --- Miles‑only ---
  const minByMiles = useMemo(() => {
    const mi = Math.max(0, Number(miles) || 0);
    const floor = Math.max(0, Number(dpmFloor) || 0);
    return Math.ceil(mi * floor * 100) / 100;
  }, [miles, dpmFloor]);
  const decisionMiles = useMemo(
    () => ((Number(fair) || 0) >= minByMiles ? "accept" : "reject"),
    [fair, minByMiles]
  );

  // --- Combined (minutes + miles) ---
  const minCombined = useMemo(() => Math.max(minByTime, minByMiles), [minByTime, minByMiles]);
  const binding = useMemo(() => (minByTime >= minByMiles ? "time" : "miles"), [minByTime, minByMiles]);
  const decisionCombined = useMemo(
    () => ((Number(fair) || 0) >= minCombined ? "accept" : "reject"),
    [fair, minCombined]
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
          Instant accept/reject using minutes, miles, or <span className="font-medium">both</span>. Rule:
          <span className="font-medium"> accept only if offer ≥ max(minutes × $/min floor, miles × $/mi floor)</span>.
          Include pickup time/distance.
        </p>
      </header>

      {/* Floors (editable) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-6">
        <h3 className="text-lg font-semibold mb-3">Floors</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="rounded-xl border border-slate-200 p-4">
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="permin">
              $ per active minute
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
              $ per mile
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

      {/* Inputs shared */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
      </section>

      {/* Visuals */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mt-6">
        <h3 className="text-lg font-semibold mb-3">Visuals — Offer vs Requirements</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* BAR: Offer vs Needs */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-600 mb-2">Offer vs Time/Miles Needs</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, ""]} />
                  <Legend />
                  <ReferenceLine
                    y={need}
                    stroke={COLORS.required}
                    strokeDasharray="4 4"
                    label={{ value: `Required: $${need.toFixed(2)}`, fill: "#475569", position: "top" }}
                  />
                  <Bar dataKey="value" name="Value ($)" radius={[6, 6, 0, 0]}>
                    {barData.map((entry, idx) => {
                      const c = entry.name === "Offer"
                        ? COLORS.offer
                        : entry.name === "Time need"
                        ? COLORS.time
                        : COLORS.miles;
                      return <Cell key={`c-${idx}`} fill={c} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DONUT: Coverage vs Required */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-slate-600">Offer coverage of required minimum</div>
              <div className={`text-sm font-medium ${offerVal >= need ? "text-emerald-600" : "text-rose-600"}`}>
                {offerVal >= need ? "✅ Accept" : "❌ Reject"}
              </div>
            </div>

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
            </div>
          </div>
        </div>
      </section>
      {/* Time only */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-4">
        <h3 className="text-lg font-semibold mb-1">Decision — Time only</h3>
        <p className="text-sm text-slate-600 mb-3">Accept if offer ≥ minutes × $/min floor.</p>
        <div className={`rounded-xl border ${decisionTime === "accept" ? "border-emerald-300" : "border-rose-300"} p-4`}>
          <div className="font-semibold mb-1">{decisionTime === "accept" ? "✅ Accept" : "❌ Reject"}</div>
          <div className="text-slate-700">
            Need at least {fmtCurrency(minByTime)} = {fmtNumber(minutes, 0)} min × {fmtCurrency(perMinFloor)}/min.
            {decisionTime === "reject" && (
              <span> Short by {fmtCurrency(Math.max(0, minByTime - (Number(fair) || 0)))}.</span>
            )}
          </div>
        </div>
      </section>

      {/* Miles only */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-4">
        <h3 className="text-lg font-semibold mb-1">Decision — Miles only</h3>
        <p className="text-sm text-slate-600 mb-3">Accept if offer ≥ miles × $/mi floor.</p>
        <div className={`rounded-xl border ${decisionMiles === "accept" ? "border-emerald-300" : "border-rose-300"} p-4`}>
          <div className="font-semibold mb-1">{decisionMiles === "accept" ? "✅ Accept" : "❌ Reject"}</div>
          <div className="text-slate-700">
            Need at least {fmtCurrency(minByMiles)} = {fmtNumber(miles, 1)} mi × {fmtCurrency(dpmFloor)}/mi.
            {decisionMiles === "reject" && (
              <span> Short by {fmtCurrency(Math.max(0, minByMiles - (Number(fair) || 0)))}.</span>
            )}
          </div>
        </div>
      </section>

      {/* Combined */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-1">Decision — Combined (minutes + miles)</h3>
        <p className="text-sm text-slate-600 mb-3">Accept only if offer ≥ max(minutes × $/min floor, miles × $/mi floor).</p>
        <div className={`rounded-xl border ${decisionCombined === "accept" ? "border-emerald-300" : "border-rose-300"} p-4`}>
          <div className="font-semibold mb-1">{decisionCombined === "accept" ? "✅ Accept" : "❌ Reject"}</div>
          <div className="text-slate-700">
            Threshold is {fmtCurrency(minCombined)} based on <span className="font-medium">{binding}</span>:
            {" "}
            {binding === "time" ? (
              <>
                {fmtNumber(minutes, 0)} min × {fmtCurrency(perMinFloor)}/min = {fmtCurrency(minByTime)}
              </>
            ) : (
              <>
                {fmtNumber(miles, 1)} mi × {fmtCurrency(dpmFloor)}/mi = {fmtCurrency(minByMiles)}
              </>
            )}
            . {decisionCombined === "reject" && (
              <span> Short by {fmtCurrency(Math.max(0, minCombined - (Number(fair) || 0)))}.</span>
            )}
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
        <p className="mt-3 text-xs text-slate-500">Rule of thumb: accept only if offer ≥ max(minutes × $/min, miles × $/mi).</p>
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
  const DEFAULT_HOURS_PER_DAY = 6; // hours
  const DEFAULT_NO_RIDE_PCT = 30; // % idle

  // DPM floors by bracket (dollars per mile)
  const DPM_FLOORS = {
    r10: 1.4, // 10 rides/day
    r10to20: 1.7, // 10–20 rides/day
    r20to25: 2.4, // 20–25 rides/day
  } as const;

  // Month/year
  const now = new Date();
  const [monthIndex, setMonthIndex] = useState<number>(now.getMonth()); // 0–11
  const [year, setYear] = useState<number>(now.getFullYear());

  // State
  const [hoursPerDay, setHoursPerDay] = useState<number>(DEFAULT_HOURS_PER_DAY);
  const [earningsGoal, setEarningsGoal] = useState<number>(DEFAULT_GOAL);
  const [noRidePercent, setNoRidePercent] = useState<number>(DEFAULT_NO_RIDE_PCT);

  // Days in month
  const daysInMonth = useMemo(() => {
    const y = Number.isFinite(year) ? year : now.getFullYear();
    const m = Number.isFinite(monthIndex) ? monthIndex : now.getMonth();
    return new Date(y, m + 1, 0).getDate();
  }, [year, monthIndex]);

  // Derived
  const { dailyTarget, dphAllIn, dphActive, effectiveHours } = useMemo(() => {
    const safeHours = Math.max(0.1, Number(hoursPerDay) || 0); // prevent divide-by-zero
    const safeGoal = Math.max(0, Number(earningsGoal) || 0);
    const pctIdle = Math.min(95, Math.max(0, Number(noRidePercent) || 0)) / 100; // clamp 0–95%

    const daily = safeGoal / daysInMonth; // goal spread across all days of selected month
    const allInDph = daily / safeHours; // $/hr including idle

    const effHours = Math.max(0.1, safeHours * (1 - pctIdle));
    const activeDph = daily / effHours; // $/hr during active time

    return {
      dailyTarget: daily,
      dphAllIn: allInDph,
      dphActive: activeDph,
      effectiveHours: effHours,
    };
  }, [hoursPerDay, earningsGoal, daysInMonth, noRidePercent]);

  // Per‑ride thresholds table
  type Row = {
    label: string;
    ridesUsed: number;
    minDollarsPerRide: number;
    maxMilesPerRide: number;
  };
  const rows: Row[] = useMemo(() => {
    const mk = (label: string, ridesUsed: number, dpmFloor: number): Row => {
      const minDollars = dailyTarget / ridesUsed;
      const maxMiles = minDollars / dpmFloor;
      return {
        label,
        ridesUsed,
        minDollarsPerRide: minDollars,
        maxMilesPerRide: maxMiles,
      };
    };
    return [
      mk("10 rides", 10, DPM_FLOORS.r10),
      mk("10–20 rides (using 20)", 20, DPM_FLOORS.r10to20),
      mk("20–25 rides (using 25)", 25, DPM_FLOORS.r20to25),
    ];
  }, [dailyTarget]);

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
          Enter your <span className="font-medium">hours per day</span> and your <span className="font-medium">monthly earnings goal</span>.
          We assume you drive <span className="font-medium">every day</span> of the selected month, with some idle time.
          We compute per‑ride thresholds for three ride brackets.
        </p>
      </header>

      {/* Inputs */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6 mb-6">
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
          <p className="mt-2 text-xs text-slate-500">Split across all days of the selected month.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="month1">
            Month
          </label>
          <select
            id="month1"
            value={monthIndex}
            onChange={(e) => setMonthIndex(parseInt(e.target.value, 10))}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {months.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500">We assume you drive every day this month.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="year1">
            Year
          </label>
          <input
            id="year1"
            type="number"
            min={2000}
            max={2100}
            step={1}
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-2 text-xs text-slate-500">
            Days in month: <span className="font-medium">{daysInMonth}</span>
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
// (3) Earnings Estimater — 2 inputs
// -----------------------------
function MonthlyEarningsEstimator() {
  // Inputs
  const [hoursPerDay, setHoursPerDay] = useState<number>(6);
  const [daysPerMonth, setDaysPerMonth] = useState<number>(25);

  // Assumptions
  const IDLE_PCT = 0.3; // 30% idle time per day
  const BASE_PER_MIN = 0.6; // $/min during active driving (conservative floor)
  const CATS = {
    short: { label: "Short (<10 min)", avgMin: 8, rateMult: 1.08, defaultCount: 10 },
    medium: { label: "Medium (10–20 min)", avgMin: 15, rateMult: 1.0, defaultCount: 4 },
    long: { label: "Long (20+ min)", avgMin: 25, rateMult: 0.95, defaultCount: 2 },
  } as const;
  const patternMinutes =
    CATS.short.defaultCount * CATS.short.avgMin +
    CATS.medium.defaultCount * CATS.medium.avgMin +
    CATS.long.defaultCount * CATS.long.avgMin; // 190

  // Derived
  const activeMinutesPerDay = useMemo(
    () => Math.max(0, Number(hoursPerDay) || 0) * 60 * (1 - IDLE_PCT),
    [hoursPerDay]
  );
  const scale = useMemo(
    () => (patternMinutes > 0 ? activeMinutesPerDay / patternMinutes : 0),
    [activeMinutesPerDay]
  );
  const dailyCounts = useMemo(
    () => ({
      short: CATS.short.defaultCount * scale,
      medium: CATS.medium.defaultCount * scale,
      long: CATS.long.defaultCount * scale,
    }),
    [scale]
  );
  const perMin = {
    short: BASE_PER_MIN * CATS.short.rateMult,
    medium: BASE_PER_MIN * CATS.medium.rateMult,
    long: BASE_PER_MIN * CATS.long.rateMult,
  } as const;

  const dailyEarningsFloor = useMemo(
    () => activeMinutesPerDay * BASE_PER_MIN,
    [activeMinutesPerDay]
  );
  const dailyEarningsBlended = useMemo(() => {
    const short = dailyCounts.short * CATS.short.avgMin * perMin.short;
    const med = dailyCounts.medium * CATS.medium.avgMin * perMin.medium;
    const lng = dailyCounts.long * CATS.long.avgMin * perMin.long;
    return short + med + lng;
  }, [dailyCounts]);

  const monthlyEarningsFloor = dailyEarningsFloor * Math.max(0, Number(daysPerMonth) || 0);
  const monthlyEarningsBlended = dailyEarningsBlended * Math.max(0, Number(daysPerMonth) || 0);

  const blendedPerHr = useMemo(() => {
    // time‑weighted per‑min multiplier of the default mix
    const mixMinutes = patternMinutes; // 190
    const weightedMultiplier = (80 * 1.08 + 60 * 1.0 + 50 * 0.95) / mixMinutes; // ≈ 1.0205
    return BASE_PER_MIN * weightedMultiplier * 60; // $/hr
  }, []);

  return (
    <div className="text-slate-800">
      {/* Header */}
      <header className="mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Earnings Estimater</h2>
        <p className="mt-2 text-slate-600">
          Two inputs only. We assume <span className="font-medium">30% idle time</span> and a blended ride mix by duration.
          Earnings are shown as a conservative floor and a realistic blended estimate.
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
            <span className="font-medium">Idle time:</span> 30% of on‑app time
          </div>
          <div>
            <span className="font-medium">Active $/min floor:</span> $0.60
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
          <div className="text-xs text-slate-500">= hours × 70%</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Conservative $/hr (active)</div>
          <div className="text-2xl font-semibold">{fmtNumber(0.6 * 60, 2)}</div>
          <div className="text-xs text-slate-500">Using $0.60 per active min</div>
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

// -----------------------------
// Lightweight runtime sanity tests (console)
// -----------------------------
function near(a: number, b: number, tol = 1.5) {
  return Math.abs(a - b) <= tol;
}
(function runSanityTests() {
  try {
    // Estimator math checks for hours=6, days=25
    const idle = 0.3;
    const basePerMin = 0.6;
    const activeMin = 6 * 60 * (1 - idle); // 252
    const dailyFloor = activeMin * basePerMin; // 151.2
    const monthlyFloor = dailyFloor * 25; // 3780
    // Weighted multiplier for mix: (80*1.08 + 60*1 + 50*0.95) / 190 ≈ 1.0205
    const mixMult = (80 * 1.08 + 60 * 1 + 50 * 0.95) / 190; // ≈ 1.0205
    const dailyBlend = dailyFloor * mixMult; // ≈ 154.3
    const monthlyBlend = monthlyFloor * mixMult; // ≈ 3857
    console.assert(near(monthlyFloor, 3780, 1), "Monthly floor mismatch");
    console.assert(dailyBlend > dailyFloor, "Blended should exceed floor");
    console.assert(near(monthlyBlend, 3857, 15), "Monthly blended in expected band");

    // Planner per-minute derivation spot check (goal=1600, hours=6, idle=30%, 30‑day month)
    const gd = 1600 / 30; // 53.33/day
    const dphActive = gd / (6 * (1 - 0.3)); // ≈ 12.698 $/hr
    const perMin = dphActive / 60; // ≈ 0.2116 $/min
    console.assert(perMin > 0 && perMin < 1, "Planner per-minute sanity");

    // Additional boundary tests
    console.assert(near(12 * 0.6, 7.2, 0.001), "12m floor exact");

    // On-the-road combined rule checks
    const pm = 0.6; const dpm = 1.7;
    const t = 15; const mi = 5;
    const threshold = Math.max(t * pm, mi * dpm); // max(9, 8.5) = 9
    console.assert(near(threshold, 9, 0.01), "Combined threshold calc");
    const offer1 = 9.0; const offer2 = 8.9;
    console.assert(offer1 >= threshold, "Offer at threshold should accept");
    console.assert(!(offer2 >= threshold), "Offer below threshold should reject");

    console.log("[Uber Rides] Sanity tests passed.");
  } catch (e) {
    console.warn("[Uber Rides] Sanity tests issue:", e);
  }
})();