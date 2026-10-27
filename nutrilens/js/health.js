// Personal health calculations. Sources:
//  - Energy: Mifflin-St Jeor equation × activity factor
//  - Macros: Dietary Guidelines for Americans 2020–2025 / IOM AMDR
//  - Vitamins & minerals: NIH Office of Dietary Supplements RDAs / AIs / ULs
//  - BMI bands: WHO adult classification

export const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Mostly sitting", hint: "Desk job, little exercise", factor: 1.2 },
  { id: "light", label: "Lightly active", hint: "Walks or light exercise 1–3 days a week", factor: 1.375 },
  { id: "moderate", label: "Moderately active", hint: "Exercise 3–5 days a week", factor: 1.55 },
  { id: "active", label: "Very active", hint: "Hard exercise 6–7 days a week", factor: 1.725 },
  { id: "athlete", label: "Extra active", hint: "Physical job or training twice a day", factor: 1.9 },
];

export function isProfileComplete(p) {
  return !!(p && p.age > 0 && p.heightCm > 0 && p.weightKg > 0 && p.sex && p.activity);
}

export function bmi(p) {
  if (!p?.heightCm || !p?.weightKg) return null;
  const m = p.heightCm / 100;
  return p.weightKg / (m * m);
}

export const BMI_BANDS = { low: 18.5, high: 25, veryHigh: 30, min: 14, max: 40 };

export function bmiCategory(value) {
  if (value == null) return null;
  if (value < BMI_BANDS.low) return { zone: "low", label: "Below the healthy range" };
  if (value < BMI_BANDS.high) return { zone: "ok", label: "In the healthy range" };
  if (value < BMI_BANDS.veryHigh) return { zone: "high", label: "A little above the healthy range" };
  return { zone: "high", label: "Above the healthy range" };
}

export function healthyWeightRange(p) {
  if (!p?.heightCm) return null;
  const m2 = (p.heightCm / 100) ** 2;
  return [BMI_BANDS.low * m2, (BMI_BANDS.high - 0.1) * m2];
}

export function bmr(p) {
  const s = p.sex === "male" ? 5 : p.sex === "female" ? -161 : -78;
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + s;
}

export function dailyCalories(p) {
  if (!isProfileComplete(p)) return 2000;
  const f = ACTIVITY_LEVELS.find((a) => a.id === p.activity)?.factor ?? 1.375;
  return Math.round((bmr(p) * f) / 50) * 50;
}

// Picks a value by sex, averaging when sex isn't male/female.
const bySex = (p, male, female) => (p?.sex === "male" ? male : p?.sex === "female" ? female : (male + female) / 2);

/**
 * Daily targets for every nutrient.
 * Each entry: { kind, target, low, high, basis }
 *  - low:  below this is the "low" zone (for "range"/"target" kinds)
 *  - high: above this is the "high" zone (null = no upper concern)
 */
export function computeTargets(p) {
  const personal = isProfileComplete(p);
  const kcal = dailyCalories(p);
  const age = personal ? p.age : 30;
  const teen = age < 19;
  const t = {};

  t.calories = { kind: "range", target: kcal, low: kcal * 0.9, high: kcal * 1.1,
    basis: personal ? "Estimated from your age, sex, height, weight and activity" : "General 2,000 kcal reference" };

  t.fat = { kind: "range", target: (kcal * 0.3) / 9, low: (kcal * 0.2) / 9, high: (kcal * 0.35) / 9,
    basis: "20–35% of calories" };
  t.satFat = { kind: "limit", target: (kcal * 0.1) / 9, high: (kcal * 0.1) / 9, basis: "Under 10% of calories" };
  t.transFat = { kind: "limit", target: (kcal * 0.01) / 9, high: (kcal * 0.01) / 9, basis: "WHO: under 1% of calories" };
  t.cholesterol = { kind: "limit", target: 300, high: 300, basis: "Label reference value" };
  t.sodium = { kind: "limit", target: 2300, high: 2300, basis: "US Dietary Guidelines" };

  t.carbs = { kind: "range", target: (kcal * 0.5) / 4, low: (kcal * 0.45) / 4, high: (kcal * 0.65) / 4,
    basis: "45–65% of calories" };
  t.fiber = { kind: "target", target: (14 * kcal) / 1000, low: (14 * kcal) / 1000, high: null,
    basis: "14 g per 1,000 calories" };
  t.sugars = { kind: "limit", target: 90, high: 90, basis: "EU/UK reference intake (no US limit)" };
  t.addedSugars = { kind: "limit", target: (kcal * 0.1) / 4, high: (kcal * 0.1) / 4, basis: "Under 10% of calories" };

  const proteinMin = personal ? Math.max(0.8 * p.weightKg, 40) : 50;
  t.protein = { kind: "range", target: proteinMin, low: proteinMin, high: (kcal * 0.35) / 4,
    basis: personal ? "0.8 g per kg body weight, up to 35% of calories" : "Label reference value" };

  const vitD = age > 70 ? 20 : 15;
  t.vitD = { kind: "target", target: vitD, low: vitD, high: 100, basis: "RDA; upper limit 100 mcg" };

  let calcium = teen ? 1300 : 1000;
  if (!teen && ((p?.sex === "female" && age > 50) || (p?.sex === "male" && age > 70) || (p?.sex !== "female" && p?.sex !== "male" && age > 60))) calcium = 1200;
  const calciumUL = teen ? 3000 : age > 50 ? 2000 : 2500;
  t.calcium = { kind: "target", target: calcium, low: calcium, high: calciumUL, basis: `RDA; upper limit ${calciumUL.toLocaleString()} mg` };

  let iron = teen ? bySex(p, 11, 15) : age > 50 ? 8 : bySex(p, 8, 18);
  if (!personal) iron = 18;
  t.iron = { kind: "target", target: iron, low: iron, high: 45, basis: "RDA; upper limit 45 mg" };

  const potassium = teen ? bySex(p, 3000, 2300) : personal ? bySex(p, 3400, 2600) : 3400;
  t.potassium = { kind: "target", target: potassium, low: potassium, high: null, basis: "Adequate intake" };

  return t;
}

/**
 * Where a daily total sits relative to its target.
 * Returns { zone: "low"|"ok"|"high", label }
 * Labels are intentionally gentle.
 */
export function classifyDaily(value, t) {
  if (t.kind === "limit") {
    if (value <= t.high * 0.75) return { zone: "ok", label: "Comfortably under" };
    if (value <= t.high) return { zone: "ok", label: "Close to your limit" };
    if (value <= t.high * 1.3) return { zone: "warn", label: "A bit over" };
    return { zone: "high", label: "Over your limit" };
  }
  if (value < t.low) return { zone: "low", label: t.kind === "target" ? "Room to go" : "Below target" };
  if (t.high != null && value > t.high) return { zone: "high", label: "Above range" };
  return { zone: "ok", label: t.kind === "target" ? "Target reached" : "In range" };
}

/**
 * How one serving of a product compares — follows the FDA 5/20 rule:
 * 5% of daily value or less is "low", 20% or more is "high".
 */
export function classifyServing(id, value, t) {
  const pct = t.target ? (value / t.target) * 100 : 0;
  const good = t.kind === "target" || id === "protein";
  if (id === "calories") return { pct, tone: pct >= 40 ? "yellow" : "neutral", label: pct >= 40 ? "Hearty portion" : pct <= 5 ? "Light" : "Moderate" };
  if (pct >= 20) return { pct, tone: good ? "green" : "orange", label: good ? "Great source" : "High" };
  if (pct <= 5) return { pct, tone: good ? "neutral" : "green", label: good ? "Low" : "Low" };
  return { pct, tone: good ? "green-soft" : "yellow", label: good ? "Some" : "Moderate" };
}

export const cmToFtIn = (cm) => {
  const totalIn = cm / 2.54;
  let ft = Math.floor(totalIn / 12);
  let inch = Math.round(totalIn - ft * 12);
  if (inch === 12) { ft += 1; inch = 0; }
  return { ft, in: inch };
};
export const ftInToCm = (ft, inch) => (ft * 12 + inch) * 2.54;
export const kgToLb = (kg) => kg * 2.20462;
export const lbToKg = (lb) => lb / 2.20462;

/**
 * Zones for a "lab result" range bar. Returns { max, zones: [{ from, to, tone, label }] }.
 * Tones: "soft" (low, pale yellow), "green" (healthy), "yellow" (a bit over), "orange" (high).
 */
export function barZones(value, t) {
  const v = value || 0;
  if (t.kind === "limit") {
    const max = Math.max(t.high * 1.6, v * 1.08);
    return { max, zones: [
      { from: 0, to: t.high, tone: "green", label: "Within" },
      { from: t.high, to: t.high * 1.3, tone: "yellow", label: "A bit over" },
      { from: t.high * 1.3, to: max, tone: "orange", label: "High" },
    ] };
  }
  if (t.kind === "range") {
    const max = Math.max(t.high * 1.35, v * 1.08);
    return { max, zones: [
      { from: 0, to: t.low, tone: "soft", label: "Low" },
      { from: t.low, to: t.high, tone: "green", label: "Healthy" },
      { from: t.high, to: max, tone: "orange", label: "High" },
    ] };
  }
  const max = Math.max(t.low * 1.6, v * 1.08);
  const zones = [{ from: 0, to: t.low, tone: "soft", label: "Low" }];
  if (t.high != null && t.high < max) {
    zones.push({ from: t.low, to: t.high, tone: "green", label: "Good" }, { from: t.high, to: max, tone: "orange", label: "Above limit" });
  } else {
    zones.push({ from: t.low, to: max, tone: "green", label: "Good" });
  }
  return { max, zones };
}

export function bmiZones() {
  const { min, max, low, high, veryHigh } = BMI_BANDS;
  return { min, max, zones: [
    { from: min, to: low, tone: "soft", label: "Low" },
    { from: low, to: high, tone: "green", label: "Healthy" },
    { from: high, to: veryHigh, tone: "yellow", label: "Above" },
    { from: veryHigh, to: max, tone: "orange", label: "High" },
  ] };
}

export function targetText(t, fmt) {
  if (t.kind === "limit") return `Up to ${fmt(t.high)}`;
  if (t.kind === "range") return `${fmt(t.low)} – ${fmt(t.high)}`;
  return t.high != null ? `At least ${fmt(t.low)} (max ${fmt(t.high)})` : `At least ${fmt(t.low)}`;
}

export const TONE_OF_ZONE = { ok: "green", low: "soft", warn: "yellow", high: "orange" };
