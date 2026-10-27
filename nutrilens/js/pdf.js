// Builds a clean A4 PDF report with jsPDF (loaded on demand).
import { NUTRIENTS, NUTRIENT_BY_ID } from "./nutrients.js";
import { ACTIVITY_LEVELS, isProfileComplete, bmi, bmiCategory, bmiZones, healthyWeightRange, dailyCalories,
  barZones, classifyDaily, targetText, TONE_OF_ZONE, cmToFtIn, kgToLb } from "./health.js";
import { LEVEL_INFO } from "./ingredients.js";

const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

const C = {
  ink: [38, 52, 46], muted: [110, 124, 117], line: [226, 232, 228], brand: [61, 139, 104], brandSoft: [233, 245, 238],
  green: [124, 194, 155], soft: [246, 226, 160], yellow: [242, 200, 91], orange: [240, 164, 108], grey: [200, 206, 202],
};

function loadJsPdf() {
  if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = JSPDF_URL;
    s.onload = () => resolve(window.jspdf.jsPDF);
    s.onerror = () => reject(new Error("Couldn't load the PDF library"));
    document.head.appendChild(s);
  });
}

// Standard PDF fonts only cover Latin-1 plus a few typographic marks.
const clean = (s) => String(s ?? "").replace(/[^\x20-\x7E\xA0-\xFF–—‘’“”•…]/g, "").trim();

function fmtNum(v, unit) {
  if (v == null || Number.isNaN(v)) return "-";
  const digits = unit === "kcal" || unit === "mg" ? 0 : Math.abs(v) < 10 && v % 1 !== 0 ? 1 : 0;
  return v.toLocaleString("en-US", { maximumFractionDigits: digits });
}
const fmt = (v, unit) => `${fmtNum(v, unit)} ${unit}`;

export async function exportReport({ dateKey, dateLabel, items, profile, targets, totals, analyse }) {
  const JsPDF = await loadJsPdf();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 16, CW = W - M * 2;
  let y = 0;

  const color = (c) => doc.setTextColor(...c);
  const fill = (c) => doc.setFillColor(...c);
  const text = (s, x, yy, opts) => doc.text(Array.isArray(s) ? s : clean(s), x, yy, opts); // arrays come from wrap(), already cleaned
  const font = (style = "normal", size = 10) => { doc.setFont("helvetica", style); doc.setFontSize(size); };
  const ensure = (h) => { if (y + h > H - 22) { doc.addPage(); y = M; } };
  const wrap = (s, w) => doc.splitTextToSize(clean(s), w);

  function heading(title) {
    ensure(16);
    y += 4;
    font("bold", 13); color(C.brand);
    text(title, M, y);
    y += 2.5;
    doc.setDrawColor(...C.line); doc.setLineWidth(0.4); doc.line(M, y, W - M, y);
    y += 6;
  }

  function bar(x, yy, w, value, min, max, zones) {
    const pos = (v) => x + Math.max(0, Math.min(1, (v - min) / (max - min))) * w;
    for (const z of zones) {
      fill(C[z.tone] || C.grey);
      doc.rect(pos(z.from), yy, Math.max(0.1, pos(z.to) - pos(z.from)), 2.6, "F");
    }
    const mx = pos(value);
    fill(C.ink);
    doc.circle(mx, yy + 1.3, 1.5, "F");
    fill([255, 255, 255]);
    doc.circle(mx, yy + 1.3, 0.7, "F");
  }

  function paragraph(label, body, indent = 0) {
    font("bold", 8.5); color(C.muted);
    const lines = wrap(body, CW - indent - 34);
    ensure(lines.length * 4 + 2);
    text(label, M + indent, y);
    font("normal", 9); color(C.ink);
    text(lines, M + indent + 34, y);
    y += lines.length * 4 + 1.5;
  }

  // ── Header ──
  fill(C.brand); doc.rect(0, 0, W, 30, "F");
  font("bold", 18); color([255, 255, 255]);
  text("NutriLens daily report", M, 14);
  font("normal", 10.5);
  text(dateLabel, M, 22);
  text(`Generated ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`, W - M, 22, { align: "right" });
  y = 40;

  // ── Summary ──
  const cal = totals.totals.calories || 0;
  fill(C.brandSoft); doc.roundedRect(M, y - 6, CW, 18, 3, 3, "F");
  font("bold", 12); color(C.ink);
  text(`${fmtNum(cal, "kcal")} of ${fmtNum(targets.calories.target, "kcal")} kcal`, M + 5, y + 1);
  font("normal", 9.5); color(C.muted);
  text(`${items.length} item${items.length === 1 ? "" : "s"} logged · ${isProfileComplete(profile) ? "personal targets" : "general 2,000 kcal guide (no profile set)"}`, M + 5, y + 7);
  y += 20;

  // ── Profile & BMI ──
  if (isProfileComplete(profile)) {
    heading("Health profile");
    const imperial = profile.units === "imperial";
    const h = imperial ? (() => { const f = cmToFtIn(profile.heightCm); return `${f.ft} ft ${f.in} in`; })() : `${Math.round(profile.heightCm)} cm`;
    const w = imperial ? `${Math.round(kgToLb(profile.weightKg))} lb` : `${profile.weightKg.toFixed(1)} kg`;
    const sex = { male: "Male", female: "Female", other: "Not specified" }[profile.sex];
    const act = ACTIVITY_LEVELS.find((a) => a.id === profile.activity)?.label;
    font("normal", 9.5); color(C.ink);
    text(`Age ${profile.age}  ·  ${sex}  ·  ${h}  ·  ${w}  ·  ${act}`, M, y);
    y += 7;
    const b = bmi(profile);
    const cat = bmiCategory(b);
    const { min, max, zones } = bmiZones();
    font("bold", 10); text(`BMI ${b.toFixed(1)}`, M, y);
    font("normal", 9.5); color(C.muted); text(cat.label, M + 22, y);
    bar(M + 80, y - 2.4, CW - 80, Math.min(max, Math.max(min, b)), min, max, zones);
    y += 6;
    const [lo, hi] = healthyWeightRange(profile);
    const wf = (kg) => (imperial ? `${Math.round(kgToLb(kg))} lb` : `${Math.round(kg)} kg`);
    font("normal", 9); color(C.ink);
    text(`Healthy weight range for your height: ${wf(lo)} – ${wf(hi)}.  Estimated daily energy: ${dailyCalories(profile).toLocaleString("en-US")} kcal.`, M, y);
    y += 4;
  }

  // ── Daily totals ──
  heading("Daily totals vs. your guide");
  font("bold", 8); color(C.muted);
  text("NUTRIENT", M, y); text("TODAY", M + 46, y); text("GUIDE", M + 68, y); text("STATUS", M + 104, y);
  text("Low · Healthy · High", W - M, y, { align: "right" });
  y += 5;
  for (const n of NUTRIENTS) {
    ensure(9);
    const t = targets[n.id];
    const v = totals.totals[n.id] || 0;
    const c = classifyDaily(v, t);
    font("bold", 9.5); color(C.ink); text(n.label, M, y);
    font("normal", 9.5); text(totals.known[n.id] ? fmt(v, n.unit) : "-", M + 46, y);
    // Upper limits are left out here to keep the column narrow; the bar still shows them.
    color(C.muted); font("normal", 8.5); text(targetText({ ...t, high: t.kind === "target" ? null : t.high }, (x) => fmt(x, n.unit)), M + 68, y);
    const tone = TONE_OF_ZONE[c.zone];
    fill(C[tone]); doc.circle(M + 105.5, y - 1.1, 1.3, "F");
    color(C.ink); text(c.label, M + 108.5, y);
    const { max, zones } = barZones(v, t);
    bar(M + 136, y - 2.6, CW - 136, v, 0, max, zones);
    y += 4;
    doc.setDrawColor(...C.line); doc.setLineWidth(0.2); doc.line(M, y, W - M, y);
    y += 4.5;
  }

  // ── Stack ──
  heading("Your stack");
  for (const it of items) {
    const flagged = analyse(it.ingredients || []).filter((a) => a.level === "watch" || a.level === "note");
    const allergens = [...new Set(analyse(it.ingredients || []).map((a) => a.ref?.allergen).filter(Boolean))];
    ensure(22);
    font("bold", 10.5); color(C.ink); text(it.name, M, y);
    font("normal", 8.5); color(C.muted);
    const when = new Date(it.addedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    text(`${when} · ${it.servings} serving${it.servings === 1 ? "" : "s"}${it.servingSize ? ` of ${it.servingSize}` : ""}`, W - M, y, { align: "right" });
    y += 5;
    const vals = ["calories", "protein", "carbs", "fat", "fiber", "addedSugars", "sodium", "satFat"]
      .filter((id) => it.values[id] != null)
      .map((id) => `${NUTRIENT_BY_ID[id].short} ${fmt(it.values[id] * it.servings, NUTRIENT_BY_ID[id].unit)}`).join("   ");
    font("normal", 9); color(C.ink);
    const vl = wrap(vals || "No nutrition values entered", CW);
    text(vl, M, y); y += vl.length * 4;
    if (flagged.length) {
      const fl = wrap(`Ingredient notes: ${flagged.map((f) => `${f.ref.name} (${LEVEL_INFO[f.level].label.toLowerCase()})`).join(", ")}`, CW);
      ensure(fl.length * 4); color(C.muted); text(fl, M, y); y += fl.length * 4;
    }
    if (allergens.length || it.contains) {
      color(C.muted); text(`Allergens: ${it.contains || allergens.join(", ")}`, M, y); y += 4;
    }
    y += 3;
  }

  // ── Ingredient notes ──
  const seen = new Map();
  for (const it of items) for (const a of analyse(it.ingredients || [])) {
    if (a.level !== "watch" && a.level !== "note") continue;
    if (!seen.has(a.ref.name)) seen.set(a.ref.name, { ref: a.ref, level: a.level, items: new Set() });
    seen.get(a.ref.name).items.add(it.name);
  }
  if (seen.size) {
    heading("Ingredient notes");
    const list = [...seen.values()].sort((a, b) => (b.level === "watch") - (a.level === "watch"));
    for (const x of list) {
      ensure(26);
      fill(C[LEVEL_INFO[x.level].tone]); doc.circle(M + 1.5, y - 1.2, 1.5, "F");
      font("bold", 10); color(C.ink); text(x.ref.name, M + 5, y);
      font("normal", 8.5); color(C.muted);
      text(`${LEVEL_INFO[x.level].label} · in ${[...x.items].join(", ")}`, W - M, y, { align: "right", maxWidth: 80 });
      y += 5;
      paragraph("What it is", x.ref.what, 5);
      paragraph("Effects", x.ref.effects, 5);
      paragraph("Safe level", x.ref.safe, 5);
      y += 2;
    }
  }

  // ── Footer on every page ──
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.line); doc.setLineWidth(0.3); doc.line(M, H - 16, W - M, H - 16);
    font("normal", 7.5); color(C.muted);
    text(wrap("For general information only; not medical advice. Values come from label scans and may contain reading errors. Talk to a doctor or registered dietitian about your personal needs.", CW - 20), M, H - 11.5);
    text(`${i} / ${pages}`, W - M, H - 11.5, { align: "right" });
  }

  doc.save(`nutrilens-report-${dateKey}.pdf`);
}
