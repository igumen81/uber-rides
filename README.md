
# On the road 

A fast, on-phone decision helper for Uber rides. Enter **minutes**, **miles**, and the **offer ($)** and the app tells you to **Accept** or **Reject**. You can also set your personal floors: **$/min** and **$/mi**.

> **Core rule**  
> Accept **only if**  
> `offer ≥ max(minutes × $/min_floor, miles × $/mi_floor)`  
> *(include pickup time and pickup miles in your inputs)*

---

## Why this works (Reasoning)

Rides consume **time** and **distance**. Your earnings must cover both:

- **Time floor** protects you in traffic and long pickups.  
  If your target during *active driving* is `H` dollars/hour, set  
  `$ / min floor = H / 60`. Example: target $36/hr → `0.60 $/min`.

- **Distance floor** covers gas/maintenance and long highway runs.  
  Calibrate from your market (e.g., **$1.50–$2.00/mi** baseline; default here is **$1.70/mi**).

Using the **maximum** of the two ensures you’re paid fairly whether the ride is time‑heavy or distance‑heavy.

---

## Inputs & Defaults

- **Minutes per ride** (incl. pickup)
- **Miles per ride** (incl. pickup)
- **Offer ($)** — the payout offered
- **Floors (editable in the app)**
  - **$/min floor:** default **$0.60**
  - **$/mi floor:** default **$1.70**

> The app rounds the minimum required fare **up to the nearest cent** (conservative rounding).

---

## Quick mental decision (2 checks)

1. **Time check:** `minutes × $/min_floor`  
2. **Miles check:** `miles × $/mi_floor`  
3. **Decision:** Take the **larger** of the two numbers; **accept only if offer ≥ that number**.

**Pseudocode**
```txt
time_need = minutes * per_min_floor
mile_need = miles * per_mile_floor
need = max(time_need, mile_need)
if offer >= need: ACCEPT
else: REJECT  # shortfall = need - offer
```

---

## How to use (on the road)

1. **Set your floors** once per shift:  
   - Starter suggestion: `$0.60/min` and `$1.70/mi`.  
   - Raise **$/min** when traffic/pickups run long.  
   - Raise **$/mi** when trips are long highway runs or far‑out destinations.
2. **Include pickup**: Add pickup minutes and pickup miles into your inputs.
3. **Enter minutes, miles, and offer ($)** (or use the mental math below).
4. **Read the decision**:  
   - **Accept** if offer ≥ threshold.  
   - **Reject** if below; the UI shows *how much* it’s short and the *minimum required*.
5. **Adjust floors during the day** as the market changes (surge, events, rush hour).

---

## Cheat‑sheet (with defaults)

**Minutes → minimum fare (@ $0.60/min)**

| Minutes | Min $ | Minutes | Min $ | Minutes | Min $ |
|---:|---:|---:|---:|---:|---:|
| 6 | 3.60 | 10 | 6.00 | 18 | 10.80 |
| 8 | 4.80 | 12 | 7.20 | 20 | 12.00 |
| 15 | 9.00 | 25 | 15.00 | 30 | 18.00 |

**Miles → minimum fare (@ $1.70/mi)**

| Miles | Min $ | Miles | Min $ | Miles | Min $ |
|---:|---:|---:|---:|---:|---:|
| 2 | 3.40 | 4 | 6.80 | 8 | 13.60 |
| 3 | 5.10 | 5 | 8.50 | 10 | 17.00 |
| 6 | 10.20 |   |   |   |   |

> Tip: memorize a few anchors (e.g., **12 min → $7.20**, **5 mi → $8.50**). For everything else, round minutes and miles to the nearest anchor and adjust.

---

## Examples

> Floors: **$0.60/min** and **$1.70/mi** (defaults). Include pickup time/miles.

1) **12 min, 5 mi, $9 offer**  
   - Time: `12 × 0.60 = $7.20`  
   - Miles: `5 × 1.70 = $8.50`  
   - Threshold: `max(7.20, 8.50) = $8.50` → **$9 ≥ $8.50 → ACCEPT**

2) **18 min, 3 mi, $9 offer**  
   - Time: `18 × 0.60 = $10.80`  
   - Miles: `3 × 1.70 = $5.10`  
   - Threshold: `max(10.80, 5.10) = $10.80` → **$9 < $10.80 → REJECT**  
   - Minimum required: **$10.80** (shortfall **$1.80**)

3) **8 min, 10 mi, $15 offer**  
   - Time: `8 × 0.60 = $4.80`  
   - Miles: `10 × 1.70 = $17.00`  
   - Threshold: `max(4.80, 17.00) = $17.00` → **$15 < $17.00 → REJECT**  
   - Minimum required: **$17.00** (shortfall **$2.00**)

---

## Choosing your floors

- **Tie $/min to your active $/hour goal:**  
  `$/min floor = target_active_$/hr ÷ 60`  
  Examples:  
  - $30/hr → $0.50/min  
  - $36/hr → $0.60/min  
  - $42/hr → $0.70/min

- **Tie $/mi to your market costs & pay patterns:**  
  Start between **$1.50–$2.00/mi** and tune from your logs.  
  Raise when fuel/maintenance costs or out‑of‑area deadhead risk increases.

---

## Edge cases & tips

- **Long pickups:** Add pickup minutes/miles. If uncertain, pad floors slightly (e.g., +$0.05/min or +$0.10/mi).  
- **Heavy traffic:** Favor the **time** floor (raise $/min).  
- **Highway stretches:** Favor the **distance** floor (raise $/mi).  
- **Surge/events:** Temporarily bump both floors to lock in elevated earnings.

---

## Summary

- Make **two quick multiplications** and take the **max**.
# Earnings Planner


This document explains the earnings logic behind the planner and provides a pocket‑friendly decision rule to accept/decline rides in real time. It focuses on **formulas, reasoning, and mental math** only.

---

## Notation (inputs)

- G — total earnings goal (e.g., $6,500)  
- W — driving days (e.g., 28)  
- H — hours per day (e.g., 10)  
- p — idle fraction (e.g., 0.35 → 35%)  
- T — trip time in hours (include pickup)  
- M — trip miles (include pickup)  
- v — effective MPH on trip (≈ M / T)  
- D — offered dollars for the trip

---

## Core formulas

**Daily target (on driving days)**
```
g_d = G / W
```

**Active driving hours per day**
```
H_active = H * (1 - p)
```

**Required dollars per hour**
```
DPH_all_in = g_d / H
DPH_active = g_d / H_active
```

**Time test (minimum $ by time)**
```
D_min_time(T) = DPH_active * T
```

**Miles test (using a $/mile floor)**
```
DPM_floor = DPH_active / v
D_min_miles(M) = DPM_floor * M
```

**Combined acceptance rule (keeps you on pace)**
```
Accept if Offer >= max(D_min_time, D_min_miles)
```

---

## Worked example

Target G = $6,500 in 30 days, driving W = 28 days, H = 10 h/day, idle p = 0.35.

- g_d = 6500 / 28 ≈ **$232.14/day**  
- H_active = 10 * (1 - 0.35) = **6.5 h**  
- DPH_active = 232.14 / 6.5 ≈ **$35.71/hr**  
- DPH_all_in = 232.14 / 10 ≈ **$23.21/hr**  
- Active $/min = 35.71 / 60 ≈ **$0.595/min** (≈ **$0.60/min** for mental math)

**$/mile floors by speed (DPM_floor = DPH_active / v)**

- 12 mph → **$2.98/mi**  
- 15 mph → **$2.38/mi**  
- 16 mph → **$2.23/mi**  
- 18 mph → **$1.98/mi**  
- 20 mph → **$1.79/mi**  
- 22 mph → **$1.62/mi**

Interpret these as **acceptance floors**: if a trip only just meets the floor, you’re still on pace.

---

## Reasoning (why this works)

- Your **daily target** is spread across **driving days**, not the entire calendar, so the per‑day bar rises if you take days off.  
- Because a chunk of time is **idle**, you must earn faster during **active** time; hence DPH_active.  
- The **time test** protects your hourly rate regardless of distance.  
- The **miles test** translates the same target through typical MPH, protecting against long, underpaid miles.  
- Taking the **maximum** of the two thresholds filters weak offers that would quietly drag your hourly below target.

---

## Quick mental decision (2 checks)

1) **Time check (fastest)**  
   Use your **active $/min** floor. In this example, round **$0.595/min → $0.60/min**.  
   **Rule:** _Minimum dollars ≈ minutes × $0.60_.

2) **Miles cross‑check**  
   Pick the MPH band that matches the route (include pickup). In this example:  
   - 16 mph → **$2.23/mi**  
   - 18 mph → **$1.98/mi**  
   - 20 mph → **$1.79/mi**  
   **Rule:** _Minimum dollars ≈ miles × DPM_floor_.

**Accept only if** the offer ≥ **the higher** of the two numbers.  
Always **include pickup** time & miles in both checks.

---

## How to use this on the road

1) **Glance at trip minutes** → multiply by **$0.60**. That’s your **time minimum**.  
2) **Glance at miles** (or think about speed) → multiply miles by the **DPM_floor** for your current traffic. That’s your **miles minimum**.  
3) **Compare** the offer to both numbers → take it only if the offer ≥ **max(time minimum, miles minimum)**.  
4) **Adjust on the fly**  
   - If traffic is **faster** than usual, you can use the **20 mph** band (≈ $1.79/mi).  
   - If it’s **slow/stop‑and‑go**, use **16 mph** (≈ $2.23/mi).  
5) **Edge considerations**  
   - **Stacking / back‑to‑back** trips: a strong time check can outweigh a borderline miles check if the next trip likely starts quickly.  
   - **Deadhead risk** (return miles): tighten your miles floor when you expect unpaid miles after drop‑off.  
   - **Surge/boost**: during surge, still apply both checks; many “good‑looking” offers fail one of them.  
   - **Rounding**: round **up** on thresholds (protects hourly).  
   - **Cancellations**: be cautious with long pickups; include pickup time & miles in the checks.

---

## Quick time thresholds (memorize‑friendly)

Using **$0.60/min**:

| Trip time | Min $ (≈) |
|---:|---:|
| 8 min | **$5** |
| 10 min | **$6** |
| 12 min | **$7** |
| 15 min | **$9** |
| 18 min | **$11** |
| 20 min | **$12** |
| 25 min | **$15** |
| 30 min | **$18** |

---

## Examples (decision table)

Assume the **18 mph band** (DPM ≈ **$1.98/mi**) unless noted.  
**Decision rule:** accept only if **Offer ≥ max(Time check, Miles check)**.

| Scenario | Time check (min $) | Miles check (min $) | Offer | Decision | Notes |
|---|---:|---:|---:|:--|:--|
| **10 min, 2.5 mi, $6.50** | 10 × 0.595 = **$5.95 → $6.00** | 2.5 × 1.98 = **$4.95 → $5.00** | **$6.50** | ✅ Accept | Passes both checks. |
| **12 min, 4.0 mi, $7.50** | 12 × 0.595 = **$7.14 → $7.00** | 4 × 1.98 = **$7.92** | **$7.50** | ❌ Skip | Time passes; miles fails @18 mph. **At 20 mph**: 4 × 1.79 ≈ **$7.16** → ✅ Accept. |
| **15 min, 3.0 mi, $8.00** | 15 × 0.595 = **$8.93** | 3 × 1.98 = **$5.94** | **$8.00** | ❌ Skip | Fails time check (miles passes). |
| **18 min, 3.5 mi, $11.00** | 18 × 0.595 = **$10.71** | 3.5 × 1.98 = **$6.93** | **$11.00** | ✅ Accept | Solid on both checks. |
| **20 min, 6.0 mi, $11.50** | 20 × 0.595 = **$11.90** | 6 × 1.98 = **$11.88** | **$11.50** | ❌ Skip | Misses both; **$12.00+** would be ✅. |
| **25 min, 5.0 mi, $14.50** | 25 × 0.595 = **$14.88** | 5 × 1.98 = **$9.90** | **$14.50** | ❌ Skip | Time fails; **$15+** is the go. |
| **30 min, 10.0 mi, $18.00** | 30 × 0.595 = **$17.85** | 10 × 1.98 = **$19.80** | **$18.00** | ❌ Skip | Passes time, fails miles @18 mph. **At 20 mph**: 10 × 1.79 = **$17.90** → ✅ Accept. |
| **8 min, 1.2 mi, $5.00** | 8 × 0.595 = **$4.76 → $4.75–$5.00** | 1.2 × 1.98 = **$2.38 → $2.50** | **$5.00** | ✅ Accept | Easy pass on both. |

---

## Practical tuning

- Recompute DPH_active with your G, W, H, p. Your $/min and DPM floors update automatically.  
- Use 16/18/20 mph bands as defaults; add 12/15/22 mph if your market frequently hits those.  
- If you notice consistent deadhead after certain drop‑off zones, tighten your miles floor for trips ending there.  
- During heavy surge, keep the two‑check rule—prevents “glossy but slow” trips from wrecking your hourly.

---

## One‑line rule (memorize this)

```
Accept if Offer >= max( minutes × $/min_floor , miles × DPM_floor )   // include pickup
```


- If the **offer** meets or beats that number → **Accept**; otherwise **Reject**.  
- Tune **$/min** and **$/mi** to match your goals and your market conditions.



# Earnings Planner

This document explains the earnings logic behind the planner and provides a pocket‑friendly decision rule to accept/decline rides in real time. It focuses on **formulas, reasoning, and mental math** only.

---

## Notation (inputs)

- G — total earnings goal (e.g., $6,500)  
- W — driving days (e.g., 28)  
- H — hours per day (e.g., 10)  
- p — idle fraction (e.g., 0.35 → 35%)  
- T — trip time in hours (include pickup)  
- M — trip miles (include pickup)  
- v — effective MPH on trip (≈ M / T)  
- D — offered dollars for the trip

---

## Core formulas

**Daily target (on driving days)**
```
g_d = G / W
```

**Active driving hours per day**
```
H_active = H * (1 - p)
```

**Required dollars per hour**
```
DPH_all_in = g_d / H
DPH_active = g_d / H_active
```

**Time test (minimum $ by time)**
```
D_min_time(T) = DPH_active * T
```

**Miles test (using a $/mile floor)**
```
DPM_floor = DPH_active / v
D_min_miles(M) = DPM_floor * M
```

**Combined acceptance rule (keeps you on pace)**
```
Accept if Offer >= max(D_min_time, D_min_miles)
```

---

## Worked example

Target G = $6,500 in 30 days, driving W = 28 days, H = 10 h/day, idle p = 0.35.

- g_d = 6500 / 28 ≈ **$232.14/day**  
- H_active = 10 * (1 - 0.35) = **6.5 h**  
- DPH_active = 232.14 / 6.5 ≈ **$35.71/hr**  
- DPH_all_in = 232.14 / 10 ≈ **$23.21/hr**  
- Active $/min = 35.71 / 60 ≈ **$0.595/min** (≈ **$0.60/min** for mental math)

**$/mile floors by speed (DPM_floor = DPH_active / v)**

- 12 mph → **$2.98/mi**  
- 15 mph → **$2.38/mi**  
- 16 mph → **$2.23/mi**  
- 18 mph → **$1.98/mi**  
- 20 mph → **$1.79/mi**  
- 22 mph → **$1.62/mi**

Interpret these as **acceptance floors**: if a trip only just meets the floor, you’re still on pace.

---

## Reasoning (why this works)

- Your **daily target** is spread across **driving days**, not the entire calendar, so the per‑day bar rises if you take days off.  
- Because a chunk of time is **idle**, you must earn faster during **active** time; hence DPH_active.  
- The **time test** protects your hourly rate regardless of distance.  
- The **miles test** translates the same target through typical MPH, protecting against long, underpaid miles.  
- Taking the **maximum** of the two thresholds filters weak offers that would quietly drag your hourly below target.

---

## Quick mental decision (2 checks)

1) **Time check (fastest)**  
   Use your **active $/min** floor. In this example, round **$0.595/min → $0.60/min**.  
   **Rule:** _Minimum dollars ≈ minutes × $0.60_.

2) **Miles cross‑check**  
   Pick the MPH band that matches the route (include pickup). In this example:  
   - 16 mph → **$2.23/mi**  
   - 18 mph → **$1.98/mi**  
   - 20 mph → **$1.79/mi**  
   **Rule:** _Minimum dollars ≈ miles × DPM_floor_.

**Accept only if** the offer ≥ **the higher** of the two numbers.  
Always **include pickup** time & miles in both checks.

---

## How to use this on the road

1) **Glance at trip minutes** → multiply by **$0.60**. That’s your **time minimum**.  
2) **Glance at miles** (or think about speed) → multiply miles by the **DPM_floor** for your current traffic. That’s your **miles minimum**.  
3) **Compare** the offer to both numbers → take it only if the offer ≥ **max(time minimum, miles minimum)**.  
4) **Adjust on the fly**  
   - If traffic is **faster** than usual, you can use the **20 mph** band (≈ $1.79/mi).  
   - If it’s **slow/stop‑and‑go**, use **16 mph** (≈ $2.23/mi).  
5) **Edge considerations**  
   - **Stacking / back‑to‑back** trips: a strong time check can outweigh a borderline miles check if the next trip likely starts quickly.  
   - **Deadhead risk** (return miles): tighten your miles floor when you expect unpaid miles after drop‑off.  
   - **Surge/boost**: during surge, still apply both checks; many “good‑looking” offers fail one of them.  
   - **Rounding**: round **up** on thresholds (protects hourly).  
   - **Cancellations**: be cautious with long pickups; include pickup time & miles in the checks.

---

## Quick time thresholds (memorize‑friendly)

Using **$0.60/min**:

| Trip time | Min $ (≈) |
|---:|---:|
| 8 min | **$5** |
| 10 min | **$6** |
| 12 min | **$7** |
| 15 min | **$9** |
| 18 min | **$11** |
| 20 min | **$12** |
| 25 min | **$15** |
| 30 min | **$18** |

---

## Examples (decision table)

Assume the **18 mph band** (DPM ≈ **$1.98/mi**) unless noted.  
**Decision rule:** accept only if **Offer ≥ max(Time check, Miles check)**.

| Scenario | Time check (min $) | Miles check (min $) | Offer | Decision | Notes |
|---|---:|---:|---:|:--|:--|
| **10 min, 2.5 mi, $6.50** | 10 × 0.595 = **$5.95 → $6.00** | 2.5 × 1.98 = **$4.95 → $5.00** | **$6.50** | ✅ Accept | Passes both checks. |
| **12 min, 4.0 mi, $7.50** | 12 × 0.595 = **$7.14 → $7.00** | 4 × 1.98 = **$7.92** | **$7.50** | ❌ Skip | Time passes; miles fails @18 mph. **At 20 mph**: 4 × 1.79 ≈ **$7.16** → ✅ Accept. |
| **15 min, 3.0 mi, $8.00** | 15 × 0.595 = **$8.93** | 3 × 1.98 = **$5.94** | **$8.00** | ❌ Skip | Fails time check (miles passes). |
| **18 min, 3.5 mi, $11.00** | 18 × 0.595 = **$10.71** | 3.5 × 1.98 = **$6.93** | **$11.00** | ✅ Accept | Solid on both checks. |
| **20 min, 6.0 mi, $11.50** | 20 × 0.595 = **$11.90** | 6 × 1.98 = **$11.88** | **$11.50** | ❌ Skip | Misses both; **$12.00+** would be ✅. |
| **25 min, 5.0 mi, $14.50** | 25 × 0.595 = **$14.88** | 5 × 1.98 = **$9.90** | **$14.50** | ❌ Skip | Time fails; **$15+** is the go. |
| **30 min, 10.0 mi, $18.00** | 30 × 0.595 = **$17.85** | 10 × 1.98 = **$19.80** | **$18.00** | ❌ Skip | Passes time, fails miles @18 mph. **At 20 mph**: 10 × 1.79 = **$17.90** → ✅ Accept. |
| **8 min, 1.2 mi, $5.00** | 8 × 0.595 = **$4.76 → $4.75–$5.00** | 1.2 × 1.98 = **$2.38 → $2.50** | **$5.00** | ✅ Accept | Easy pass on both. |

---

## Practical tuning

- Recompute DPH_active with your G, W, H, p. Your $/min and DPM floors update automatically.  
- Use 16/18/20 mph bands as defaults; add 12/15/22 mph if your market frequently hits those.  
- If you notice consistent deadhead after certain drop‑off zones, tighten your miles floor for trips ending there.  
- During heavy surge, keep the two‑check rule—prevents “glossy but slow” trips from wrecking your hourly.

---

## One‑line rule (memorize this)

```
Accept if Offer >= max( minutes × $/min_floor , miles × DPM_floor )   // include pickup
```

# Earnings Estimator

A lightweight calculator that estimates **daily** and **monthly** rideshare earnings from just two inputs:
**hours per day** and **days per month**. It assumes **30% idle time** and a **blended ride mix** across short/medium/long rides,
then shows a **conservative floor** and a **blended estimate**.

> This README documents the **Monthly Earnings Estimator** tab only.

---

## What it does

- Takes two inputs:
  - **Hours per day** (slider, 1–12; default 6; step 0.5)
  - **Days per month** (slider, 1–30; default 25; step 1)
- Assumes **30% idle/no-ride time** each day.
- Uses a **blended ride mix** (scaled to your active minutes):
  - 10 × short rides (**8 min**, **+8%** vs. base $/min)
  - 4 × medium rides (**15 min**, **baseline**)
  - 2 × long rides (**25 min**, **−5%** vs. base $/min)
- Computes and displays:
  - **Active time per day**
  - **Conservative $/hr** (floor) based on **$0.60/min** during active time
  - **Blended $/hr** (time-weighted across the mix with small uplifts/discounts)
  - **Daily** and **Monthly** potential: **Floor** and **Blended**

---

## Reasoning

- **Idle time matters**: Not all on-app time is earning time. We model this by reducing the day to **active minutes**:  
  `active_minutes_per_day = hours_per_day × 60 × (1 − idle%)`

- **Conservative floor** uses a simple floor rate during active minutes:  
  `daily_floor = active_minutes_per_day × 0.60`

- **Realistic blend** accounts for typical fare shape:
  short rides tend to have better per-minute returns (base fare effect), long rides slightly worse. We apply small multipliers
  and **weight by minutes** to get a blended per-minute rate. With the default mix:
  `blended_multiplier ≈ 1.020526`  
  so `daily_blended = daily_floor × blended_multiplier`.

- **Monthly** totals are simply daily × days:
  `monthly_floor = daily_floor × days_per_month`  
  `monthly_blended = daily_blended × days_per_month`

This keeps the UI simple while reflecting real-world differences between short, medium, and long trips.

---

## Formulas

```
active_minutes_per_day = hours_per_day * 60 * (1 - 0.30)

daily_floor   = active_minutes_per_day * 0.60
daily_blended = daily_floor * blended_multiplier

# blended multiplier from the default ride mix (time-weighted):
# minutes = 10*8 + 4*15 + 2*25 = 190
# weighted = (80*1.08 + 60*1.00 + 50*0.95) / 190 ≈ 1.0205

monthly_floor   = daily_floor   * days_per_month
monthly_blended = daily_blended * days_per_month
```

---

## How to use

1. **Set hours/day** with the slider. This is your *on-app* time (includes waiting).
2. **Set days/month** you expect to work.
3. Read:
   - **Active time/day** → your effective earning time after idle.
   - **Conservative $/hr** and **Blended $/hr** → rough per-hour benchmarks.
   - **Daily Potential** and **Monthly Potential** → floor vs. blended earnings.
4. Use these as **targets**: if your actual day is below the **floor**, you may need to improve acceptance filters, timing, or areas.  
   If you’re consistently above **blended**, you’re outperforming the model.

> Tip: Pair this with the **two-check acceptance rule** from the Planner tab (minutes × $/min floor, and miles × DPM floor) to protect your hourly.

---

## Examples

### Example A — Defaults
- **Hours/day:** 6  
- **Days/month:** 25

| Metric | Value |
|---|---:|
| Active time/day | 4.20 h |
| Daily Potential — Floor | $151.20 |
| Daily Potential — Blended | $154.30 |
| Monthly Potential — Floor | $3,780 |
| Monthly Potential — Blended | $3,858 |

---

### Example B — Higher intensity month
- **Hours/day:** 10  
- **Days/month:** 28

| Metric | Value |
|---|---:|
| Active time/day | 7.00 h |
| Daily Potential — Floor | $252.00 |
| Daily Potential — Blended | $257.17 |
| Monthly Potential — Floor | $7,056 |
| Monthly Potential — Blended | $7,201 |

---

### Example C — Lighter schedule
- **Hours/day:** 4.5  
- **Days/month:** 20

| Metric | Value |
|---|---:|
| Active time/day | 3.15 h |
| Daily Potential — Floor | $113.40 |
| Daily Potential — Blended | $115.73 |
| Monthly Potential — Floor | $2,268 |
| Monthly Potential — Blended | $2,315 |

---

## Assumptions & Notes

- Idle fraction fixed at **30%**. If your market has more or less waiting, adjust expectations accordingly.
- Base **$0.60/min** floor is a conservative starting point for on-trip, active minutes.
- Blended multipliers (+8% short, −5% long) are modest and can be tuned per market if needed.
- The estimator **does not** model surge/boosts, cancellations, or deadhead mileage explicitly—it’s a planning baseline.

---

## Sanity checks (quick math)

- With **6 h/day** and **30% idle**, active time/day = 6 × 60 × 70% = **4.20 h**.  
- Conservative $/hr (active) = **36.00**.  
- Daily floor = $151.20; blended multiplier ≈ **1.0205** → daily blended ≈ $154.30.  
- Monthly floor/blended = **daily × days** → $3,780 / $3,858.

If your results deviate significantly from these numbers with the same inputs, please open an issue with screenshots.

---

## FAQ

**Why 30% idle?**  
It’s a common conservative baseline across many markets and times. Adjust your expectations if your real idle time differs.

**Why is short-ride $/min higher?**  
Base fares and minimums create a higher $/min for very short trips; longer trips average lower per-minute returns.

**Does this include tips?**  
Estimates reflect gross fares. Tips will push you above the **blended** line when they’re solid.

---

# Earnings Estimator

A lightweight calculator that estimates **daily** and **monthly** rideshare earnings from just two inputs:
**hours per day** and **days per month**. It assumes **30% idle time** and a **blended ride mix** across short/medium/long rides,
then shows a **conservative floor** and a **blended estimate**.

> This README documents the **Monthly Earnings Estimator** tab only.

---

## What it does

- Takes two inputs:
  - **Hours per day** (slider, 1–12; default 6; step 0.5)
  - **Days per month** (slider, 1–30; default 25; step 1)
- Assumes **30% idle/no-ride time** each day.
- Uses a **blended ride mix** (scaled to your active minutes):
  - 10 × short rides (**8 min**, **+8%** vs. base $/min)
  - 4 × medium rides (**15 min**, **baseline**)
  - 2 × long rides (**25 min**, **−5%** vs. base $/min)
- Computes and displays:
  - **Active time per day**
  - **Conservative $/hr** (floor) based on **$0.60/min** during active time
  - **Blended $/hr** (time-weighted across the mix with small uplifts/discounts)
  - **Daily** and **Monthly** potential: **Floor** and **Blended**

---

## Reasoning

- **Idle time matters**: Not all on-app time is earning time. We model this by reducing the day to **active minutes**:  
  `active_minutes_per_day = hours_per_day × 60 × (1 − idle%)`

- **Conservative floor** uses a simple floor rate during active minutes:  
  `daily_floor = active_minutes_per_day × 0.60`

- **Realistic blend** accounts for typical fare shape:
  short rides tend to have better per-minute returns (base fare effect), long rides slightly worse. We apply small multipliers
  and **weight by minutes** to get a blended per-minute rate. With the default mix:
  `blended_multiplier ≈ 1.020526`  
  so `daily_blended = daily_floor × blended_multiplier`.

- **Monthly** totals are simply daily × days:
  `monthly_floor = daily_floor × days_per_month`  
  `monthly_blended = daily_blended × days_per_month`

This keeps the UI simple while reflecting real-world differences between short, medium, and long trips.

---

## Formulas

```
active_minutes_per_day = hours_per_day * 60 * (1 - 0.30)

daily_floor   = active_minutes_per_day * 0.60
daily_blended = daily_floor * blended_multiplier

# blended multiplier from the default ride mix (time-weighted):
# minutes = 10*8 + 4*15 + 2*25 = 190
# weighted = (80*1.08 + 60*1.00 + 50*0.95) / 190 ≈ 1.0205

monthly_floor   = daily_floor   * days_per_month
monthly_blended = daily_blended * days_per_month
```

---

## How to use

1. **Set hours/day** with the slider. This is your *on-app* time (includes waiting).
2. **Set days/month** you expect to work.
3. Read:
   - **Active time/day** → your effective earning time after idle.
   - **Conservative $/hr** and **Blended $/hr** → rough per-hour benchmarks.
   - **Daily Potential** and **Monthly Potential** → floor vs. blended earnings.
4. Use these as **targets**: if your actual day is below the **floor**, you may need to improve acceptance filters, timing, or areas.  
   If you’re consistently above **blended**, you’re outperforming the model.

> Tip: Pair this with the **two-check acceptance rule** from the Planner tab (minutes × $/min floor, and miles × DPM floor) to protect your hourly.

---

## Examples

### Example A — Defaults
- **Hours/day:** 6  
- **Days/month:** 25

| Metric | Value |
|---|---:|
| Active time/day | 4.20 h |
| Daily Potential — Floor | $151.20 |
| Daily Potential — Blended | $154.30 |
| Monthly Potential — Floor | $3,780 |
| Monthly Potential — Blended | $3,858 |

---

### Example B — Higher intensity month
- **Hours/day:** 10  
- **Days/month:** 28

| Metric | Value |
|---|---:|
| Active time/day | 7.00 h |
| Daily Potential — Floor | $252.00 |
| Daily Potential — Blended | $257.17 |
| Monthly Potential — Floor | $7,056 |
| Monthly Potential — Blended | $7,201 |

---

### Example C — Lighter schedule
- **Hours/day:** 4.5  
- **Days/month:** 20

| Metric | Value |
|---|---:|
| Active time/day | 3.15 h |
| Daily Potential — Floor | $113.40 |
| Daily Potential — Blended | $115.73 |
| Monthly Potential — Floor | $2,268 |
| Monthly Potential — Blended | $2,315 |

---

## Assumptions & Notes

- Idle fraction fixed at **30%**. If your market has more or less waiting, adjust expectations accordingly.
- Base **$0.60/min** floor is a conservative starting point for on-trip, active minutes.
- Blended multipliers (+8% short, −5% long) are modest and can be tuned per market if needed.
- The estimator **does not** model surge/boosts, cancellations, or deadhead mileage explicitly—it’s a planning baseline.

---

## Sanity checks (quick math)

- With **6 h/day** and **30% idle**, active time/day = 6 × 60 × 70% = **4.20 h**.  
- Conservative $/hr (active) = **36.00**.  
- Daily floor = $151.20; blended multiplier ≈ **1.0205** → daily blended ≈ $154.30.  
- Monthly floor/blended = **daily × days** → $3,780 / $3,858.

If your results deviate significantly from these numbers with the same inputs, please open an issue with screenshots.

---

## FAQ

**Why 30% idle?**  
It’s a common conservative baseline across many markets and times. Adjust your expectations if your real idle time differs.

**Why is short-ride $/min higher?**  
Base fares and minimums create a higher $/min for very short trips; longer trips average lower per-minute returns.

**Does this include tips?**  
Estimates reflect gross fares. Tips will push you above the **blended** line when they’re solid.

---
