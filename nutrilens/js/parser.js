// Turns OCR text from a nutrition label / ingredient list into structured data.
// Handles US-style "Nutrition Facts" panels and EU/Asia-style "per serving" tables,
// and tolerates common OCR slips (O→0, l→1, "Omg", "9g" read as "g" etc.).

import { LABEL_DV } from "./nutrients.js";

// Order matters: specific names must be tried before the general ones they contain.
const PATTERNS = [
  ["addedSugars", /added\s*sugars?|sugars?\s*added/],
  ["satFat", /sat(urated|\.)?\s*fat|saturates/],
  ["transFat", /trans\s*-?\s*fat/],
  ["fiber", /(dietary\s*)?fib(er|re)/],
  ["sugars", /(total\s*)?sugars?\b|of\s*which\s*sugars/],
  ["carbs", /(total\s*)?carb(o|0)hydrate?s?|carbs\b|total\s*carb/],
  ["cholesterol", /chol(e|o)ster(o|0)l/],
  ["sodium", /s(o|0)dium/],
  ["salt", /^\s*salt\b/],
  ["fat", /(total\s*)?fat\b|^\s*fats?\b|lipids?/],
  ["protein", /pr(o|0)tein/],
  ["vitD", /vit(amin|\.)?\s*d\b/],
  ["calcium", /calc(i|l)um/],
  ["iron", /\biron\b/],
  ["potassium", /p(o|0)tass(i|l)um/],
  ["calories", /calor(ies|ie)|energy|kcal/],
];

const NUM = String.raw`(\d+(?:[.,]\d+)?|<\s*\d+(?:[.,]\d+)?)`;
const UNIT = String.raw`(kcal|kj|mcg|µg|ug|mg|g)?`;

// Fix OCR confusions only inside things that look like numbers with units.
function cleanLine(line) {
  return line
    .toLowerCase()
    .replace(/[|]/g, "1")
    .replace(/(\d)\s+(?=\d*\s*(mg|g|mcg)\b)/g, "$1") // "1 2g" → "12g" only when unit follows
    .replace(/\b[o](?=\s*(mg|g|mcg|%))/g, "0")
    .replace(/\b([0-9]*)[o]([0-9]*)\s*(mg|g|mcg)\b/g, "$10$2$3")
    .replace(/\b[il](?=\d)/g, "1")
    .replace(/(\d)[il]\b/g, "$11")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(s) {
  if (!s) return null;
  const lt = s.includes("<");
  const n = parseFloat(s.replace(/[<\s]/g, "").replace(",", "."));
  if (Number.isNaN(n)) return null;
  return lt ? n / 2 : n; // "<1g" → 0.5 g, a reasonable estimate
}

function convert(value, fromUnit, toUnit) {
  if (value == null) return null;
  const f = (fromUnit || "").replace("µg", "mcg").replace("ug", "mcg");
  if (!f || f === toUnit) return value;
  const scale = { g: 1, mg: 1e-3, mcg: 1e-6 };
  if (f === "kj" && toUnit === "kcal") return value / 4.184;
  if (scale[f] && scale[toUnit]) return (value * scale[f]) / scale[toUnit];
  return value;
}

const UNIT_OF = {
  calories: "kcal", fat: "g", satFat: "g", transFat: "g", cholesterol: "mg", sodium: "mg", salt: "g",
  carbs: "g", fiber: "g", sugars: "g", addedSugars: "g", protein: "g", vitD: "mcg", calcium: "mg",
  iron: "mg", potassium: "mg",
};

// OCR often reads a trailing "g" as "9": "Protein 4g" → "Protein 49", "4.5g" → "4.59".
// Real values almost always keep their unit, so a unit-less gram value ending in 9 is
// treated as a misread unit (a lone "9" is left alone).
function fixTrailingNine(raw, unit, id) {
  if (unit || !raw || UNIT_OF[id] !== "g") return raw;
  return /^[\d.,]*\d9$/.test(raw) ? raw.slice(0, -1).replace(/[.,]$/, "") : raw;
}

function extractValue(id, line, keywordMatch) {
  const after = line.slice(keywordMatch.index + keywordMatch[0].length);
  const before = line.slice(0, keywordMatch.index);

  if (id === "calories") {
    // Prefer an explicit kcal number; otherwise first number after keyword.
    const kcal = line.match(new RegExp(`${NUM}\\s*kcal`));
    if (kcal) return { value: toNumber(kcal[1]), pct: null };
    const kj = line.match(new RegExp(`${NUM}\\s*kj`));
    const m = after.match(new RegExp(`${NUM}`));
    if (m) return { value: toNumber(m[1]), pct: null };
    if (kj) return { value: toNumber(kj[1]) / 4.184, pct: null };
    return null;
  }

  // "Includes 10g Added Sugars" – the number comes before the keyword.
  let m = after.match(new RegExp(`^[^\\d<%]*?${NUM}(?![\\d.,])\\s*${UNIT}(?!\\s*%)`));
  if (!m && id === "addedSugars") m = before.match(new RegExp(`${NUM}\\s*${UNIT}\\s*$`));
  const pctM = after.match(/(\d+(?:[.,]\d+)?)\s*%/);
  const pct = pctM ? parseFloat(pctM[1].replace(",", ".")) : null;

  if (m && !(pctM && m.index === pctM.index && !m[2])) {
    const raw = fixTrailingNine(m[1], m[2], id);
    return { value: convert(toNumber(raw), m[2], UNIT_OF[id]), pct };
  }
  if (pct != null) return { value: null, pct };
  return null;
}

export function parseNutrition(text) {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const values = {};
  const pcts = {};
  const meta = {};

  for (const line of lines) {
    const serv = line.match(/servings?\s*per\s*(container|package|pack)\D*?(about\s*)?(\d+(?:[.,]\d+)?)/) ||
      line.match(/(\d+(?:[.,]\d+)?)\s*servings?\s*per/);
    if (serv) meta.servingsPerContainer = toNumber(serv[3] ?? serv[1]);
    const size = line.match(/serving\s*size[:\s]*(.+)/);
    if (size) meta.servingSize = size[1].replace(/\s+/g, " ").trim();
    if (/ingredients?\s*[:.]/.test(line)) break; // stop before ingredient list

    for (const [id, re] of PATTERNS) {
      const km = line.match(re);
      if (!km) continue;
      if (values[id] != null) continue;
      // Avoid "calories from fat" being read as fat; "fat free" as fat, etc.
      if (id === "fat" && /calories\s*from\s*fat|fat\s*cal/.test(line)) continue;
      if (id === "calories" && /calories\s*from\s*fat|per\s*\d+\s*calorie|calories? a day|2,?000\s*calorie/.test(line)) continue;
      if (id === "sugars" && /added|sugar\s*alcohol/.test(line)) continue;
      const res = extractValue(id, line, km);
      if (!res) continue;
      if (res.value != null) values[id] = res.value;
      if (res.pct != null) pcts[id] = res.pct;
      break; // one nutrient per line
    }
  }

  // Salt → sodium (EU labels list salt; sodium = salt / 2.5)
  if (values.sodium == null && values.salt != null) values.sodium = values.salt * 400;
  delete values.salt;

  // Fall back to %DV when the amount wasn't readable.
  for (const [id, pct] of Object.entries(pcts)) {
    if (values[id] == null && LABEL_DV[id]) values[id] = (pct / 100) * LABEL_DV[id];
  }

  // Sanity: drop impossible values (OCR noise).
  const MAX = { calories: 3000, fat: 200, satFat: 100, transFat: 50, cholesterol: 2000, sodium: 10000,
    carbs: 400, fiber: 100, sugars: 300, addedSugars: 300, protein: 200, vitD: 200, calcium: 3000, iron: 100, potassium: 10000 };
  for (const [id, v] of Object.entries(values)) {
    if (!(v >= 0) || v > (MAX[id] ?? Infinity)) delete values[id];
    else values[id] = Math.round(v * 10) / 10;
  }

  return { values, meta, found: Object.keys(values).length };
}

/** Pulls the ingredient paragraph out of OCR text (or uses the whole text). */
export function extractIngredientText(text) {
  const flat = text.replace(/\r?\n/g, " ").replace(/\s+/g, " ");
  const m = flat.match(/ingred[il1]ents?\s*[:.;]?\s*(.+)/i);
  let body = m ? m[1] : flat;
  // Stop at common end markers.
  const stop = body.search(/\b(allergy (advice|information)|allergens?\s*:|distributed by|manufactured (by|for)|made in|produced (by|in)|nutrition facts|best before|store in|keep refrigerated|net (wt|weight))\b/i);
  if (stop > 0) body = body.slice(0, stop);
  return body.trim();
}

/** Splits an ingredient paragraph at top-level commas, keeping sub-ingredients. */
export function parseIngredients(text) {
  const body = extractIngredientText(text);
  let contains = null;
  let main = body;
  const cm = body.match(/\b(contains|may contain)(?!\s*(less than\s*)?\d)\s*:?\s*([^.]+)\.?\s*$/i);
  if (cm && cm.index > 0) {
    contains = cm[3].trim();
    main = body.slice(0, cm.index);
  }

  const items = [];
  let depth = 0;
  let cur = "";
  const push = () => { const s = cur.trim(); if (s) items.push(s); cur = ""; };
  for (let i = 0; i < main.length; i++) {
    const ch = main[i];
    if ("([{".includes(ch)) depth++;
    if (")]}".includes(ch)) depth = Math.max(0, depth - 1);
    if ((ch === "," || ch === ";") && depth === 0) { push(); continue; }
    // A full stop ends an item, but not a decimal point like "2.5%".
    if (ch === "." && depth === 0 && !/\d/.test(main[i + 1] ?? "")) { push(); continue; }
    cur += ch;
  }
  push();

  const result = [];
  for (const raw of items) {
    // "Vitamin E (mixed tocopherols) added for freshness" → name + children; trailing words dropped.
    const sub = raw.match(/^([^([]+)[([](.*?)(?:[)\]](.*))?$/);
    const clean = (s) => s.replace(/[)\]}]+$/, "")
      .replace(/^\s*(and|&|or)\s+/i, "")
      .replace(/^\s*(contains|less than)\s*(less than\s*)?\d+(\.\d+)?\s*%\s*(or less\s*)?(of\s*)?(each of\s*)?(the following)?\s*:?\s*/i, "")
      .trim();
    if (sub) {
      const children = sub[2].split(/,|;/).map(clean).filter((c) => c.length > 1);
      result.push({ name: clean(sub[1]), children });
    } else {
      const name = clean(raw);
      if (name.length > 1) result.push({ name, children: [] });
    }
  }
  return { items: result.slice(0, 80), contains };
}
