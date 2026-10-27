import { NUTRIENTS, NUTRIENT_BY_ID } from "./nutrients.js";
import { lookupIngredient, LEVEL_INFO } from "./ingredients.js";
import {
  ACTIVITY_LEVELS, isProfileComplete, bmi, bmiCategory, healthyWeightRange, dailyCalories, computeTargets,
  classifyDaily, classifyServing, barZones, bmiZones, targetText, TONE_OF_ZONE,
  cmToFtIn, ftInToCm, kgToLb, lbToKg,
} from "./health.js";
import { parseNutrition, parseIngredients } from "./parser.js";
import { SAMPLES } from "./samples.js";
import { icon } from "./icons.js";

// ───────────────────────── State ─────────────────────────

const STORE_KEY = "nutrilens:v1";
const KEY_NUTRIENTS = ["calories", "protein", "carbs", "fat", "fiber", "addedSugars", "sodium", "satFat"];

const state = Object.assign({ profile: { units: "metric" }, days: {} }, loadStore());
let viewDate = todayKey();
let draft = null;          // item being reviewed after a scan
let scanTarget = "label";  // which part a photo belongs to: "label" | "ingredients"
let sampleIndex = 0;
let lastAddedId = null;

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch { toast("Couldn't save on this device. Storage may be full.", "warn"); }
}

function todayKey(d = new Date()) {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function shiftDay(key, delta) {
  const [y, m, d] = key.split("-").map(Number);
  return todayKey(new Date(y, m - 1, d + delta));
}
function dayLabel(key) {
  if (key === todayKey()) return "Today";
  if (key === shiftDay(todayKey(), -1)) return "Yesterday";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function longDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

const itemsFor = (key) => state.days[key] || [];

function streak() {
  let key = todayKey();
  if (!itemsFor(key).length) key = shiftDay(key, -1);
  let n = 0;
  while (itemsFor(key).length) { n++; key = shiftDay(key, -1); }
  return n;
}

function totalsFor(items) {
  const totals = {};
  const known = {};
  for (const it of items) {
    for (const n of NUTRIENTS) {
      const v = it.values[n.id];
      if (v == null) continue;
      totals[n.id] = (totals[n.id] || 0) + v * it.servings;
      known[n.id] = true;
    }
  }
  return { totals, known };
}

// ───────────────────────── Helpers ─────────────────────────

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);

function fmtNum(v, unit) {
  if (v == null || Number.isNaN(v)) return "—";
  const a = Math.abs(v);
  const digits = unit === "kcal" || unit === "mg" ? 0 : a < 10 && a % 1 !== 0 ? 1 : 0;
  return v.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
const fmt = (v, unit) => `${fmtNum(v, unit)}${unit === "kcal" ? " kcal" : ` ${unit}`}`;
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (m, a, b) => a + b.toUpperCase());

function rangeBar({ value, max, min = 0, zones, valueText, ariaLabel, compact = false }) {
  const pos = (x) => Math.max(0, Math.min(100, ((x - min) / (max - min)) * 100));
  const zoneHtml = zones.map((z) => `<span class="z z-${z.tone}" style="left:${pos(z.from)}%;width:${pos(z.to) - pos(z.from)}%"></span>`).join("");
  const labels = compact ? "" : `<div class="rbar-labels">${zones
    .filter((z) => pos(z.to) - pos(z.from) >= 13)
    .map((z) => `<span style="left:${(pos(z.from) + pos(z.to)) / 2}%">${z.label}</span>`).join("")}</div>`;
  const marker = value == null ? "" : `<span class="rbar-marker" style="left:${pos(value)}%">${valueText ? `<b>${esc(valueText)}</b>` : ""}</span>`;
  return `<div class="rbar${compact ? " rbar-compact" : ""}" role="img" aria-label="${esc(ariaLabel || "")}">
    <div class="rbar-track">${zoneHtml}${marker}</div>${labels}</div>`;
}

function tag(text, tone) {
  return `<span class="tag tag-${tone}">${esc(text)}</span>`;
}

// ───────────────────────── Router ─────────────────────────

const VIEWS = { today: renderToday, review: renderReview, profile: renderProfile };

function currentView() {
  const v = location.hash.replace("#", "") || "today";
  if (v === "review" && !draft) return "today";
  return VIEWS[v] ? v : "today";
}

function go(view) {
  if (location.hash === `#${view}`) render();
  else location.hash = view;
}

function render() {
  const view = currentView();
  const main = $("#view");
  const open = new Set([...main.querySelectorAll("details[open][data-key]")].map((d) => d.dataset.key));
  main.innerHTML = VIEWS[view]();
  main.dataset.view = view;
  for (const d of main.querySelectorAll("details[data-key]")) if (open.has(d.dataset.key)) d.open = true;
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === view));
  const s = streak();
  $("#streak").innerHTML = s ? `${icon("flame")}<span>${s}-day streak</span>` : "";
  $("#streak").hidden = !s;
}

window.addEventListener("hashchange", () => { render(); window.scrollTo({ top: 0 }); });

// ───────────────────────── Today view ─────────────────────────

function renderToday() {
  const items = itemsFor(viewDate);
  const targets = computeTargets(state.profile);
  const isToday = viewDate === todayKey();

  const dateBar = `<div class="date-bar">
    <button class="icon-btn" data-action="day-prev" aria-label="Previous day">${icon("chevron-left")}</button>
    <div class="date-label"><strong>${dayLabel(viewDate)}</strong><span>${longDate(viewDate)}</span></div>
    <button class="icon-btn" data-action="day-next" aria-label="Next day" ${isToday ? "disabled" : ""}>${icon("chevron-right")}</button>
  </div>`;

  if (!items.length) {
    return `${dateBar}
    <section class="card hero-empty">
      <div class="hero-illo">${icon("scan")}</div>
      <h1>${isToday ? "What's on your plate today?" : "Nothing logged this day"}</h1>
      <p class="muted">Snap a nutrition label and we'll explain what's in it in plain language, then add it to your day.</p>
      <div class="cta-stack">
        <button class="btn btn-primary btn-lg" data-action="scan-camera" data-target="label">${icon("camera")} Scan a label</button>
        <div class="cta-row">
          <button class="btn btn-soft" data-action="scan-upload" data-target="label">${icon("image")} Upload photo</button>
          <button class="btn btn-soft" data-action="manual">${icon("keyboard")} Type it in</button>
        </div>
        <button class="btn btn-link" data-action="sample">${icon("sparkles")} No label handy? Try a sample</button>
      </div>
    </section>
    ${!isProfileComplete(state.profile) ? profileNudge() : ""}
    ${disclaimer()}`;
  }

  const { totals, known } = totalsFor(items);
  const cal = totals.calories || 0;
  const calT = targets.calories;
  const calPct = Math.min(1, cal / calT.target);
  const calZone = classifyDaily(cal, calT);
  const left = calT.target - cal;
  const r = 52, c = 2 * Math.PI * r;

  const hero = `<section class="card summary">
    <div class="ring ring-${TONE_OF_ZONE[calZone.zone]}" role="img" aria-label="${fmtNum(cal, "kcal")} of ${fmtNum(calT.target, "kcal")} calories">
      <svg viewBox="0 0 120 120"><circle class="ring-bg" cx="60" cy="60" r="${r}"/><circle class="ring-fg" cx="60" cy="60" r="${r}"
        style="stroke-dasharray:${c};stroke-dashoffset:${c * (1 - calPct)}"/></svg>
      <div class="ring-text"><strong>${fmtNum(cal, "kcal")}</strong><span>of ${fmtNum(calT.target, "kcal")} kcal</span></div>
    </div>
    <div class="summary-text">
      <h1>${left >= 0 ? `${fmtNum(left, "kcal")} kcal to go` : `${fmtNum(-left, "kcal")} kcal over`}</h1>
      <p class="muted">${items.length} item${items.length > 1 ? "s" : ""} logged · ${summaryLine(totals, targets)}</p>
      <div class="summary-actions">
        <button class="btn btn-primary" data-action="scan-camera" data-target="label">${icon("plus")} Add item</button>
        <button class="btn btn-soft" data-action="export">${icon("download")} PDF report</button>
      </div>
    </div>
  </section>`;

  const rows = (ids) => ids.map((id) => dailyRow(id, totals[id], known[id], targets[id], items)).join("");
  const more = NUTRIENTS.map((n) => n.id).filter((id) => !KEY_NUTRIENTS.includes(id));

  const balance = `<section class="card">
    <div class="card-head"><h2>${icon("activity")} Daily balance</h2>
      <span class="muted small">${isProfileComplete(state.profile) ? "Personal targets" : "General 2,000 kcal guide"}</span></div>
    <p class="muted small legend">${legendDots()}</p>
    <div class="rows">${rows(KEY_NUTRIENTS)}</div>
    <details class="more" data-key="more-nutrients"><summary>${icon("chevron-down")} More nutrients</summary>
      <div class="rows">${rows(more)}</div></details>
  </section>`;

  const stack = `<section class="card">
    <div class="card-head"><h2>${icon("layers")} Your stack</h2>
      <button class="btn btn-ghost btn-sm" data-action="scan-upload" data-target="label">${icon("image")} Upload</button></div>
    <ul class="stack-list">${items.map((it) => stackItem(it, targets)).join("")}</ul>
  </section>`;

  return `${dateBar}${hero}${!isProfileComplete(state.profile) ? profileNudge() : ""}${balance}${stack}${dayIngredientNotes(items)}${disclaimer()}`;
}

function summaryLine(totals, targets) {
  // One calm sentence highlighting the most notable thing today.
  const over = ["sodium", "addedSugars", "satFat"].filter((id) => totals[id] > targets[id].high);
  if (over.length) return `${over.map((id) => NUTRIENT_BY_ID[id].short.toLowerCase()).join(" and ")} above your daily guide`;
  if ((totals.fiber || 0) >= targets.fiber.low) return "fiber target reached — nice!";
  if ((totals.protein || 0) >= targets.protein.low) return "protein target reached";
  return "everything within your guides so far";
}

function legendDots() {
  return [["soft", "Low"], ["green", "Healthy"], ["yellow", "A bit over"], ["orange", "High"]]
    .map(([t, l]) => `<span class="dot dot-${t}"></span>${l}`).join("");
}

function dailyRow(id, value, known, t, items) {
  const n = NUTRIENT_BY_ID[id];
  const v = value || 0;
  const cls = classifyDaily(v, t);
  const tone = TONE_OF_ZONE[cls.zone];
  const { max, zones } = barZones(v, t);
  const contributors = items
    .filter((it) => it.values[id])
    .map((it) => ({ name: it.name, v: it.values[id] * it.servings }))
    .sort((a, b) => b.v - a.v).slice(0, 3);
  return `<details class="row" data-key="d-${id}">
    <summary>
      <div class="row-top">
        <span class="row-icon">${icon(n.icon)}</span>
        <span class="row-name">${n.label}</span>
        <span class="row-val">${known ? fmtNum(v, n.unit) : "—"}<small> / ${fmtNum(t.kind === "limit" ? t.high : t.target, n.unit)} ${n.unit}</small></span>
        ${tag(cls.label, tone)}
      </div>
      ${rangeBar({ value: v, max, zones, compact: true, ariaLabel: `${n.label}: ${fmt(v, n.unit)}, ${cls.label}` })}
    </summary>
    <div class="row-body">
      ${rangeBar({ value: v, max, zones, valueText: fmt(v, n.unit), ariaLabel: `${n.label} range` })}
      <dl class="facts">
        <dt>Your daily guide</dt><dd>${targetText(t, (x) => fmt(x, n.unit))} <span class="muted">· ${esc(t.basis)}</span></dd>
        <dt>What it does</dt><dd>${esc(n.does)}</dd>
        ${contributors.length ? `<dt>Biggest sources today</dt><dd>${contributors.map((c) => `${esc(c.name)} <span class="muted">(${fmt(c.v, n.unit)})</span>`).join(", ")}</dd>` : ""}
      </dl>
      <p class="tip">${icon("info")} ${esc(n.tip)}</p>
    </div>
  </details>`;
}

function stackItem(it, targets) {
  const kcal = (it.values.calories || 0) * it.servings;
  const flags = analyseIngredients(it.ingredients || []).filter((x) => x.level === "watch" || x.level === "note");
  const watch = flags.filter((f) => f.level === "watch").length;
  const time = new Date(it.addedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `<li class="stack-item${it.id === lastAddedId ? " just-added" : ""}">
    <details data-key="i-${it.id}">
      <summary>
        <span class="thumb">${it.thumb ? `<img src="${it.thumb}" alt="">` : icon("leaf")}</span>
        <span class="stack-main"><strong>${esc(it.name)}</strong>
          <span class="muted small">${time} · ${fmtServ(it.servings)} · ${fmtNum(kcal, "kcal")} kcal${watch ? ` · <span class="txt-orange">${watch} to watch</span>` : ""}</span></span>
        <span class="chev">${icon("chevron-down")}</span>
      </summary>
      <div class="stack-body">
        <div class="stepper" aria-label="Servings">
          <button class="icon-btn" data-action="item-serv" data-id="${it.id}" data-delta="-0.5" aria-label="Less">${icon("minus")}</button>
          <span>${fmtServ(it.servings)}${it.servingSize ? ` <small class="muted">(${esc(it.servingSize)} each)</small>` : ""}</span>
          <button class="icon-btn" data-action="item-serv" data-id="${it.id}" data-delta="0.5" aria-label="More">${icon("plus")}</button>
        </div>
        <div class="mini-grid">${KEY_NUTRIENTS.map((id) => {
          const n = NUTRIENT_BY_ID[id];
          const v = it.values[id];
          return `<div><span class="muted small">${n.short}</span><strong>${v == null ? "—" : fmt(v * it.servings, n.unit)}</strong></div>`;
        }).join("")}</div>
        ${flags.length ? `<p class="small">${flags.map((f) => `<span class="pill pill-${LEVEL_INFO[f.level].tone}">${esc(f.ref.name)}</span>`).join(" ")}</p>` : ""}
        <button class="btn btn-ghost btn-sm danger" data-action="remove-item" data-id="${it.id}">${icon("trash")} Remove</button>
      </div>
    </details>
  </li>`;
}

const fmtServ = (s) => `${s % 1 ? s.toFixed(1) : s} serving${s === 1 ? "" : "s"}`;

function dayIngredientNotes(items) {
  const seen = new Map();
  const allergens = new Set();
  for (const it of items) {
    for (const a of analyseIngredients(it.ingredients || [])) {
      if (a.ref?.allergen) allergens.add(a.ref.allergen);
      if (a.level !== "watch" && a.level !== "note") continue;
      const key = a.ref.name;
      if (!seen.has(key)) seen.set(key, { ref: a.ref, level: a.level, items: new Set() });
      seen.get(key).items.add(it.name);
    }
  }
  if (!seen.size) return "";
  const list = [...seen.values()].sort((a, b) => (a.level === "watch" ? -1 : 0) - (b.level === "watch" ? -1 : 0));
  return `<section class="card">
    <div class="card-head"><h2>${icon("list")} Ingredient notes</h2></div>
    ${allergens.size ? `<p class="small"><strong>Allergens today:</strong> ${[...allergens].map(esc).join(", ")}</p>` : ""}
    <div class="rows">${list.map((x) => `<details class="row" data-key="n-${esc(x.ref.name)}">
      <summary><div class="row-top"><span class="dot dot-${LEVEL_INFO[x.level].tone}"></span>
        <span class="row-name">${esc(x.ref.name)}</span>${tag(LEVEL_INFO[x.level].label, LEVEL_INFO[x.level].tone)}</div>
        <span class="muted small">In ${[...x.items].map(esc).join(", ")}</span></summary>
      <div class="row-body">${ingredientFacts(x.ref)}</div></details>`).join("")}</div>
  </section>`;
}

function profileNudge() {
  return `<a class="card nudge" href="#profile">${icon("user")}
    <span><strong>Make these numbers yours</strong><span class="muted small">Add your age, height and activity for personal targets and a BMI check.</span></span>
    ${icon("chevron-right")}</a>`;
}

function disclaimer() {
  return `<p class="disclaimer">${icon("shield")} NutriLens is for general information only and isn't medical advice. Label reading can make mistakes, so check important values. Talk to a doctor or dietitian about your own needs.</p>`;
}

// ───────────────────────── Review (scan result) view ─────────────────────────

function renderReview() {
  const d = draft;
  if (d.status === "reading") {
    return `<section class="card reading">
      ${d.thumb ? `<img class="reading-img" src="${d.thumb}" alt="">` : `<div class="hero-illo pulse">${icon("scan")}</div>`}
      <h1>${esc(d.progressText || "Reading your label…")}</h1>
      <div class="progress"><span style="width:${Math.round((d.progress || 0) * 100)}%"></span></div>
      <p class="muted small">Everything happens on your device. The first scan downloads the text reader, so it may take a moment.</p>
      <button class="btn btn-ghost" data-action="discard">Cancel</button>
    </section>`;
  }

  const targets = computeTargets(state.profile);
  const found = NUTRIENTS.filter((n) => d.values[n.id] != null);
  const poor = found.length < 3;

  const header = `<section class="card review-head">
    <div class="review-title">
      <span class="thumb lg">${d.thumb ? `<img src="${d.thumb}" alt="">` : icon("leaf")}</span>
      <label class="name-field"><span class="muted small">Item name</span>
        <input id="draft-name" type="text" value="${esc(d.name)}" placeholder="e.g. Granola bar" autocomplete="off"></label>
    </div>
    ${d.source === "scan" ? (poor
      ? `<div class="notice notice-yellow">${icon("info")}<div><strong>We couldn't read much from that photo.</strong> Try again closer up with even light and the label flat, or type the numbers in.
          <div class="cta-row"><button class="btn btn-soft btn-sm" data-action="scan-camera" data-target="label">${icon("camera")} Retake</button>
          <button class="btn btn-soft btn-sm" data-action="edit-toggle">${icon("pencil")} Type values</button></div></div></div>`
      : `<div class="notice notice-green">${icon("check")}<div><strong>Found ${found.length} nutrients.</strong> Give them a quick look; tap <em>Edit values</em> if anything looks off.</div></div>`) : ""}
    <div class="stepper big" aria-label="Servings">
      <span class="muted">How much did you have?</span>
      <div>
        <button class="icon-btn" data-action="draft-serv" data-delta="-0.5" aria-label="Less">${icon("minus")}</button>
        <strong>${fmtServ(d.servings)}</strong>
        <button class="icon-btn" data-action="draft-serv" data-delta="0.5" aria-label="More">${icon("plus")}</button>
      </div>
      ${d.servingSize ? `<span class="muted small">1 serving = ${esc(d.servingSize)}</span>` : ""}
    </div>
  </section>`;

  const highlights = servingHighlights(d, targets);
  const glance = highlights.length ? `<section class="card">
    <div class="card-head"><h2>${icon("sparkles")} At a glance</h2><span class="muted small">for ${fmtServ(d.servings)}</span></div>
    <div class="chips">${highlights.join("")}</div>
  </section>` : "";

  const nutrients = `<section class="card">
    <div class="card-head"><h2>${icon("list")} Nutrition breakdown</h2>
      <button class="btn btn-ghost btn-sm" data-action="edit-toggle">${icon(d.editing ? "check" : "pencil")} ${d.editing ? "Done" : "Edit values"}</button></div>
    ${d.editing ? editGrid(d) : `<p class="muted small">Tap any nutrient to learn what it does. Bars show how much of your daily guide this covers.</p>
    <div class="rows">${found.map((n) => servingRow(n, d, targets[n.id])).join("") || `<p class="muted">No values yet.</p>`}</div>`}
  </section>`;

  const ing = ingredientSection(d);

  return `${header}${glance}${nutrients}${ing}
    <div class="sticky-actions">
      <button class="btn btn-ghost" data-action="discard">Discard</button>
      <button class="btn btn-primary btn-lg" data-action="add-to-stack" ${found.length || d.ingredients?.items.length ? "" : "disabled"}>${icon("plus")} Add to ${viewDate === todayKey() ? "today" : dayLabel(viewDate)}</button>
    </div>
    ${disclaimer()}`;
}

function servingHighlights(d, targets) {
  const chips = [];
  const scored = NUTRIENTS.filter((n) => d.values[n.id] != null && n.id !== "calories")
    .map((n) => ({ n, c: classifyServing(n.id, d.values[n.id] * d.servings, targets[n.id]) }));
  for (const { n, c } of scored.filter((x) => x.c.tone === "orange").sort((a, b) => b.c.pct - a.c.pct)) {
    chips.push(`<span class="chip chip-orange">${icon(n.icon)} Higher in ${n.short.toLowerCase()} <small>${Math.round(c.pct)}% of daily</small></span>`);
  }
  for (const { n, c } of scored.filter((x) => x.c.label === "Great source")) {
    chips.push(`<span class="chip chip-green">${icon(n.icon)} Good source of ${n.short.toLowerCase()} <small>${Math.round(c.pct)}%</small></span>`);
  }
  for (const id of ["addedSugars", "sodium", "satFat"]) {
    const x = scored.find((s) => s.n.id === id);
    if (x && x.c.pct <= 5) chips.push(`<span class="chip chip-green">${icon("check")} Low in ${x.n.short.toLowerCase()}</span>`);
  }
  const kcal = d.values.calories;
  if (kcal != null) chips.unshift(`<span class="chip">${icon("flame")} ${fmtNum(kcal * d.servings, "kcal")} kcal <small>${Math.round((kcal * d.servings / targets.calories.target) * 100)}% of your day</small></span>`);
  return chips.slice(0, 6);
}

function servingRow(n, d, t) {
  const v = d.values[n.id] * d.servings;
  const c = classifyServing(n.id, v, t);
  const pct = Math.round(c.pct);
  const goal = t.kind === "limit" ? "limit" : "target";
  const toneMap = { green: "green", "green-soft": "green", yellow: "yellow", orange: "orange", neutral: "grey" };
  return `<details class="row" data-key="s-${n.id}">
    <summary>
      <div class="row-top">
        <span class="row-icon">${icon(n.icon)}</span>
        <span class="row-name">${n.label}</span>
        <span class="row-val">${fmt(v, n.unit)}</span>
        ${tag(c.label, toneMap[c.tone])}
      </div>
      <div class="pctbar pct-${toneMap[c.tone]}"><span style="width:${Math.min(100, pct)}%"></span><em>${pct}%</em></div>
    </summary>
    <div class="row-body">
      <dl class="facts">
        <dt>What it is</dt><dd>${esc(n.what)}</dd>
        <dt>What it does in your body</dt><dd>${esc(n.does)}</dd>
        <dt>Recommended daily intake</dt><dd>${targetText(t, (x) => fmt(x, n.unit))} <span class="muted">· ${esc(t.basis)}</span></dd>
        <dt>This item</dt><dd><strong>${fmt(v, n.unit)}</strong> is <strong>${pct}%</strong> of your daily ${goal}.
          ${n.id === "calories" ? "" : `<span class="muted">As a rule of thumb, 5% or less is low and 20% or more is high.</span>`}</dd>
      </dl>
      <p class="tip">${icon("info")} ${esc(n.tip)}</p>
    </div>
  </details>`;
}

function editGrid(d) {
  return `<p class="muted small">Values are <strong>per serving</strong>, as printed on the label. Leave blank if not listed.</p>
  <div class="edit-grid">
    <label class="span-2"><span>Serving size</span><input data-field="servingSize" type="text" value="${esc(d.servingSize || "")}" placeholder="e.g. 1 cup (240 ml)"></label>
    ${NUTRIENTS.map((n) => `<label><span>${n.label} <small>(${n.unit})</small></span>
      <input data-nutrient="${n.id}" type="number" inputmode="decimal" min="0" step="any" value="${d.values[n.id] ?? ""}"></label>`).join("")}
  </div>`;
}

// ───────────────────────── Ingredients ─────────────────────────

// Flattens an ingredient list into rows. Sub-ingredients that carry a note
// (e.g. TBHQ inside "palm oil (TBHQ)") get their own row right after the parent.
function analyseIngredients(list) {
  const out = [];
  for (const item of list) {
    const ref = lookupIngredient(item.name);
    const children = (item.children || []).map((c) => ({ name: c, ref: lookupIngredient(c) }));
    out.push({ name: item.name, ref, level: ref?.level || "unknown", children });
    for (const c of children) {
      if (c.ref && c.ref.level !== "ok") out.push({ name: c.name, ref: c.ref, level: c.ref.level, children: [], childOf: item.name });
    }
  }
  return out;
}

function ingredientFacts(ref) {
  if (!ref) return `<p class="muted">We don't have notes on this ingredient yet. Ingredients are listed from most to least by weight, so ones near the end are present in small amounts.</p>`;
  return `<dl class="facts">
    <dt>What it is</dt><dd>${esc(ref.what)}</dd>
    <dt>What it does</dt><dd>${esc(ref.does)}</dd>
    <dt>Effects on the body</dt><dd>${esc(ref.effects)}</dd>
    <dt>Safe consumption level</dt><dd>${esc(ref.safe)}</dd>
    ${ref.allergen ? `<dt>Allergen</dt><dd>${esc(ref.allergen)}</dd>` : ""}
  </dl>`;
}

function ingredientSection(d) {
  const ing = d.ingredients;
  if (d.ingTyping) {
    return `<section class="card">
      <div class="card-head"><h2>${icon("list")} Ingredients</h2></div>
      <label class="name-field"><span class="muted small">Paste or type the ingredient list</span>
      <textarea id="ing-text" rows="5" placeholder="Ingredients: whole grain oats, sugar, salt…">${esc(d.ingRaw || "")}</textarea></label>
      <div class="cta-row"><button class="btn btn-primary btn-sm" data-action="ing-parse">${icon("check")} Analyse</button>
      <button class="btn btn-ghost btn-sm" data-action="ing-cancel">Cancel</button></div>
    </section>`;
  }
  if (d.ingStatus === "reading") {
    return `<section class="card"><div class="card-head"><h2>${icon("list")} Ingredients</h2></div>
      <p>${esc(d.ingProgressText || "Reading ingredients…")}</p>
      <div class="progress"><span style="width:${Math.round((d.ingProgress || 0) * 100)}%"></span></div></section>`;
  }
  if (!ing || !ing.items.length) {
    return `<section class="card add-ing">
      <div class="card-head"><h2>${icon("list")} Ingredients</h2><span class="muted small">Optional</span></div>
      <p class="muted">Add the ingredient list to see what each one does and anything worth knowing.</p>
      <div class="cta-row">
        <button class="btn btn-soft" data-action="scan-camera" data-target="ingredients">${icon("camera")} Scan</button>
        <button class="btn btn-soft" data-action="scan-upload" data-target="ingredients">${icon("image")} Upload</button>
        <button class="btn btn-soft" data-action="ing-type">${icon("keyboard")} Type</button>
      </div>
    </section>`;
  }

  const analysed = analyseIngredients(ing.items);
  const top = analysed.filter((a) => !a.childOf);
  const counts = { watch: 0, note: 0 };
  analysed.forEach((a) => { if (counts[a.level] != null) counts[a.level]++; });
  const allergens = new Set(analysed.map((a) => a.ref?.allergen).filter(Boolean));
  const flaggedOnly = d.flaggedOnly;
  const visible = flaggedOnly ? analysed.filter((a) => a.level === "watch" || a.level === "note") : analysed;

  return `<section class="card">
    <div class="card-head"><h2>${icon("list")} Ingredients</h2>
      <button class="btn btn-ghost btn-sm" data-action="ing-type">${icon("pencil")} Edit</button></div>
    <p class="ing-summary">${top.length} ingredients
      ${counts.watch ? ` · <span class="txt-orange">${counts.watch} worth limiting</span>` : ""}
      ${counts.note ? ` · <span class="txt-yellow">${counts.note} good to know</span>` : ""}
      ${!counts.watch && !counts.note ? ` · ${icon("check")} nothing that stands out` : ""}</p>
    ${allergens.size || ing.contains ? `<div class="notice notice-yellow">${icon("info")}<div><strong>Allergens:</strong> ${esc(ing.contains ? titleCase(ing.contains) : [...allergens].join(", "))}</div></div>` : ""}
    <div class="seg small">
      <button class="${!flaggedOnly ? "on" : ""}" data-action="ing-filter" data-flagged="0">All</button>
      <button class="${flaggedOnly ? "on" : ""}" data-action="ing-filter" data-flagged="1">Only notes</button>
    </div>
    <div class="rows">${visible.map((a, i) => {
      const info = LEVEL_INFO[a.level];
      return `<details class="row ing" data-key="g-${i}-${esc(a.name)}">
        <summary><div class="row-top">
          <span class="dot dot-${info.tone}"></span>
          <span class="row-name">${esc(titleCase(a.name))}${a.childOf ? ` <small class="muted">in ${esc(titleCase(a.childOf))}</small>` : ""}
            ${a.ref ? `<small class="muted block">${esc(a.ref.group)}</small>` : ""}</span>
          ${a.level === "ok" || a.level === "unknown" ? "" : tag(info.label, info.tone)}
        </div></summary>
        <div class="row-body">${ingredientFacts(a.ref)}
          ${a.children.length ? `<p class="small"><strong>Contains:</strong> ${a.children.map((c) => `<span class="pill pill-${LEVEL_INFO[c.ref?.level || "unknown"].tone}">${esc(titleCase(c.name))}</span>`).join(" ")}</p>` : ""}
        </div></details>`;
    }).join("") || `<p class="muted">Nothing flagged. 🌿</p>`}</div>
    <p class="muted small">Listed from most to least by weight. Flags are general guidance, not a judgement of the whole food.</p>
  </section>`;
}

// ───────────────────────── Profile view ─────────────────────────

function renderProfile() {
  const p = state.profile;
  const imperial = p.units === "imperial";
  const ftin = p.heightCm ? cmToFtIn(p.heightCm) : { ft: "", in: "" };
  const num = (v, d = 0) => (v == null || v === "" ? "" : Number(v).toFixed(d).replace(/\.0$/, ""));

  return `<section class="card">
    <div class="card-head"><h1>${icon("user")} Your profile</h1>
      <div class="seg small" role="group" aria-label="Units">
        <button class="${!imperial ? "on" : ""}" data-action="units" data-units="metric">kg / cm</button>
        <button class="${imperial ? "on" : ""}" data-action="units" data-units="imperial">lb / ft</button>
      </div></div>
    <p class="muted small">Saved only on this device. Used to personalise your daily targets.</p>
    <form id="profile-form" class="form-grid" autocomplete="off" onsubmit="return false">
      <label><span>Age</span><input name="age" type="number" inputmode="numeric" min="14" max="110" value="${num(p.age)}" placeholder="years"></label>
      <fieldset class="span-2"><legend>Sex <small class="muted">(used in energy and nutrient formulas)</small></legend>
        <div class="seg">${[["female", "Female"], ["male", "Male"], ["other", "Prefer not to say"]].map(([v, l]) =>
          `<label class="${p.sex === v ? "on" : ""}"><input type="radio" name="sex" value="${v}" ${p.sex === v ? "checked" : ""}>${l}</label>`).join("")}</div></fieldset>
      ${imperial
        ? `<label><span>Height</span><div class="pair"><input name="ft" type="number" inputmode="numeric" min="3" max="8" value="${ftin.ft}" placeholder="ft"><input name="in" type="number" inputmode="numeric" min="0" max="11" value="${ftin.in}" placeholder="in"></div></label>
           <label><span>Weight</span><input name="lb" type="number" inputmode="decimal" min="50" max="700" value="${p.weightKg ? num(kgToLb(p.weightKg)) : ""}" placeholder="lb"></label>`
        : `<label><span>Height</span><input name="cm" type="number" inputmode="decimal" min="100" max="250" value="${num(p.heightCm)}" placeholder="cm"></label>
           <label><span>Weight</span><input name="kg" type="number" inputmode="decimal" min="25" max="300" step="0.1" value="${num(p.weightKg, 1)}" placeholder="kg"></label>`}
      <fieldset class="span-2"><legend>Activity level</legend>
        <div class="choice-list">${ACTIVITY_LEVELS.map((a) => `<label class="choice ${p.activity === a.id ? "on" : ""}">
          <input type="radio" name="activity" value="${a.id}" ${p.activity === a.id ? "checked" : ""}>
          <strong>${a.label}</strong><span class="muted small">${a.hint}</span></label>`).join("")}</div></fieldset>
    </form>
  </section>
  <div id="profile-results">${profileResults()}</div>
  <section class="card">
    <div class="card-head"><h2>${icon("shield")} Your data</h2></div>
    <p class="muted small">Your profile and food log stay in this browser. Nothing is uploaded.</p>
    <button class="btn btn-ghost btn-sm danger" data-action="clear-data">${icon("trash")} Clear all data</button>
  </section>
  ${disclaimer()}`;
}

function profileResults() {
  const p = state.profile;
  if (!isProfileComplete(p)) {
    return `<section class="card muted-card"><p>${icon("info")} Fill in all fields above to see your BMI and personal daily targets. Until then we use the general 2,000 kcal guide.</p></section>`;
  }
  const b = bmi(p);
  const cat = bmiCategory(b);
  const { min, max, zones } = bmiZones();
  const [wLo, wHi] = healthyWeightRange(p);
  const imperial = p.units === "imperial";
  const w = (kg) => (imperial ? `${Math.round(kgToLb(kg))} lb` : `${Math.round(kg)} kg`);
  const targets = computeTargets(p);
  const { totals } = totalsFor(itemsFor(todayKey()));

  return `<section class="card">
    <div class="card-head"><h2>${icon("activity")} Body check</h2></div>
    <div class="metric">
      <div><span class="muted small">BMI</span><strong class="big-num">${b.toFixed(1)}</strong>${tag(cat.label, TONE_OF_ZONE[cat.zone])}</div>
      ${rangeBar({ value: Math.min(max, Math.max(min, b)), min, max, zones, valueText: b.toFixed(1), ariaLabel: `BMI ${b.toFixed(1)}, ${cat.label}` })}
      <p class="small">A healthy weight range for your height is about <strong>${w(wLo)} – ${w(wHi)}</strong>.</p>
      <p class="muted small">BMI is a quick screening number. It doesn't account for muscle, frame or where weight is carried, and isn't designed for pregnancy or under-18s.</p>
    </div>
    <div class="metric">
      <div><span class="muted small">Estimated daily energy</span><strong class="big-num">${dailyCalories(p).toLocaleString()} <small>kcal</small></strong></div>
      <p class="muted small">To maintain your current weight at your activity level (Mifflin-St Jeor equation).</p>
    </div>
  </section>
  <section class="card">
    <div class="card-head"><h2>${icon("list")} Your daily targets</h2><span class="muted small">vs. today so far</span></div>
    <div class="rows">${NUTRIENTS.map((n) => {
      const t = targets[n.id];
      const v = totals[n.id] || 0;
      const { max: m, zones: z } = barZones(v, t);
      const c = classifyDaily(v, t);
      return `<div class="row static"><div class="row-top"><span class="row-icon">${icon(n.icon)}</span>
        <span class="row-name">${n.label}<small class="muted block">${esc(t.basis)}</small></span>
        <span class="row-val">${targetText(t, (x) => fmt(x, n.unit))}</span></div>
        ${rangeBar({ value: v, max: m, zones: z, compact: true, ariaLabel: `${n.label} today ${fmt(v, n.unit)}, ${c.label}` })}</div>`;
    }).join("")}</div>
  </section>`;
}

function readProfileForm(form) {
  const f = new FormData(form);
  const p = state.profile;
  const numOrNull = (k) => { const v = parseFloat(f.get(k)); return Number.isFinite(v) ? v : null; };
  p.age = numOrNull("age");
  p.sex = f.get("sex") || p.sex;
  p.activity = f.get("activity") || p.activity;
  if (p.units === "imperial") {
    const ft = numOrNull("ft"), inch = numOrNull("in") ?? 0;
    p.heightCm = ft ? ftInToCm(ft, inch) : null;
    const lb = numOrNull("lb");
    p.weightKg = lb ? lbToKg(lb) : null;
  } else {
    p.heightCm = numOrNull("cm");
    p.weightKg = numOrNull("kg");
  }
  save();
}

// ───────────────────────── Scanning ─────────────────────────

function newDraft(extra = {}) {
  return { id: uid(), name: "", servings: 1, servingSize: "", values: {}, ingredients: null, thumb: null,
    status: "ready", editing: false, source: "manual", ...extra };
}

function applyText(d, text) {
  const nut = parseNutrition(text);
  d.values = nut.values;
  d.servingSize = nut.meta.servingSize || d.servingSize;
  const ing = parseIngredients(text);
  if (/ingred/i.test(text) && ing.items.length) { d.ingredients = ing; d.ingRaw = text; }
}

async function handleFile(file) {
  if (!file) return;
  const { recognize } = await import("./ocr.js");
  if (scanTarget === "ingredients" && draft) {
    const d = draft;
    d.ingStatus = "reading";
    render();
    try {
      const res = await recognize(file, (p, t) => { d.ingProgress = p; d.ingProgressText = t; updateProgress(p); });
      const parsed = parseIngredients(res.text);
      d.ingStatus = "done";
      if (!parsed.items.length) {
        toast("We couldn't find an ingredient list in that photo. You can type it instead.", "warn");
      } else {
        d.ingredients = parsed;
        d.ingRaw = res.text;
        toast(`Found ${parsed.items.length} ingredients`);
      }
    } catch (e) {
      d.ingStatus = "done";
      toast(e.message || "Something went wrong reading that photo.", "warn");
    }
    if (draft === d) render();
    return;
  }

  draft = newDraft({ status: "reading", source: "scan", progress: 0 });
  const d = draft;
  go("review");
  try {
    const res = await recognize(file, (p, t) => {
      if (draft !== d) return;
      d.progress = p;
      if (t !== d.progressText) { d.progressText = t; render(); } else updateProgress(p);
    });
    if (draft !== d) return;
    d.thumb = res.thumb;
    applyText(d, res.text);
    d.status = "ready";
    if (Object.keys(d.values).length >= 3) celebrate($("#view"), 6);
  } catch (e) {
    if (draft !== d) return;
    d.status = "ready";
    d.editing = true;
    toast(e.message || "Something went wrong reading that photo. You can type the values in.", "warn");
  }
  render();
}

// Only one progress bar is on screen at a time; update it without a full re-render.
function updateProgress(p) {
  const bar = $("#view .progress span");
  if (bar) bar.style.width = `${Math.round(p * 100)}%`;
}

function startSample() {
  const s = SAMPLES[sampleIndex++ % SAMPLES.length];
  draft = newDraft({ name: s.name, source: "sample" });
  applyText(draft, s.text);
  go("review");
  toast("Here's a sample label. Tap any row to learn more.");
}

function addDraftToStack() {
  const d = draft;
  const name = d.name.trim() || (d.ingredients?.items[0] ? `Item with ${titleCase(d.ingredients.items[0].name)}` : "Scanned item");
  const item = { id: d.id, name, addedAt: Date.now(), servings: d.servings, servingSize: d.servingSize,
    values: d.values, ingredients: d.ingredients?.items || [], contains: d.ingredients?.contains || null, thumb: d.thumb };
  const before = streak();
  (state.days[viewDate] ||= []).push(item);
  save();
  draft = null;
  lastAddedId = item.id;
  const count = itemsFor(viewDate).length;
  const after = streak();
  const msgs = [
    after > before && after > 1 ? `${after}-day streak! Keep it going 🌱` : null,
    count === 1 ? "First item logged today. Nice start! 🌿" : null,
    count === 3 ? "Three items in. You're building a clear picture 🌼" : null,
  ].filter(Boolean);
  toast(msgs[0] || `Added. ${count} items today ✓`, "good");
  go("today");
  requestAnimationFrame(() => celebrate($(".summary .ring") || $("#view"), 14));
  setTimeout(() => { lastAddedId = null; }, 1500);
}

// ───────────────────────── Feedback ─────────────────────────

let toastTimer;
function toast(msg, tone = "") {
  const el = $("#toast");
  el.textContent = msg;
  el.className = `toast show ${tone}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = "toast"; }, 3200);
}

function celebrate(anchor, count = 12) {
  if (!anchor || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = anchor.getBoundingClientRect();
  const colors = ["#7cc29b", "#f2c85b", "#f0a46c", "#9fd3c7"];
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.className = "spark";
    s.style.left = `${r.left + r.width / 2}px`;
    s.style.top = `${r.top + Math.min(r.height / 2, 120)}px`;
    s.style.background = colors[i % colors.length];
    const a = (Math.PI * 2 * i) / count;
    s.style.setProperty("--dx", `${Math.cos(a) * (50 + Math.random() * 40)}px`);
    s.style.setProperty("--dy", `${Math.sin(a) * (50 + Math.random() * 40) - 30}px`);
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }
}

// ───────────────────────── Events ─────────────────────────

const camInput = $("#in-camera");
const fileInput = $("#in-file");
for (const inp of [camInput, fileInput]) {
  inp.addEventListener("change", () => { const f = inp.files[0]; inp.value = ""; handleFile(f); });
}

document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || el.disabled) return;
  const a = el.dataset.action;
  switch (a) {
    case "scan-camera":
    case "scan-upload":
      scanTarget = el.dataset.target || "label";
      if (scanTarget === "label" && draft && currentView() === "review" && draft.status === "reading") return;
      (a === "scan-camera" ? camInput : fileInput).click();
      import("./ocr.js").then((m) => m.warmUp());
      break;
    case "sample": startSample(); break;
    case "manual":
      draft = newDraft({ editing: true });
      go("review");
      break;
    case "discard": draft = null; go("today"); break;
    case "edit-toggle": draft.editing = !draft.editing; render(); break;
    case "draft-serv":
      draft.servings = Math.max(0.5, Math.min(20, draft.servings + parseFloat(el.dataset.delta)));
      render();
      break;
    case "add-to-stack": addDraftToStack(); break;
    case "ing-type": draft.ingTyping = true; render(); $("#ing-text")?.focus(); break;
    case "ing-cancel": draft.ingTyping = false; render(); break;
    case "ing-parse": {
      const text = $("#ing-text").value;
      draft.ingRaw = text;
      draft.ingredients = text.trim() ? parseIngredients(text) : null;
      draft.ingTyping = false;
      render();
      break;
    }
    case "ing-filter": draft.flaggedOnly = el.dataset.flagged === "1"; render(); break;
    case "item-serv": {
      const it = itemsFor(viewDate).find((x) => x.id === el.dataset.id);
      if (!it) break;
      it.servings = Math.max(0.5, Math.min(20, it.servings + parseFloat(el.dataset.delta)));
      save(); render();
      break;
    }
    case "remove-item": {
      const list = itemsFor(viewDate);
      const i = list.findIndex((x) => x.id === el.dataset.id);
      if (i < 0) break;
      const [removed] = list.splice(i, 1);
      if (!list.length) delete state.days[viewDate];
      save(); render();
      toast(`Removed ${removed.name}`);
      break;
    }
    case "day-prev": viewDate = shiftDay(viewDate, -1); render(); break;
    case "day-next": if (viewDate < todayKey()) { viewDate = shiftDay(viewDate, 1); render(); } break;
    case "units": state.profile.units = el.dataset.units; save(); render(); break;
    case "clear-data":
      if (confirm("Clear your profile and every logged item on this device? This can't be undone.")) {
        state.profile = { units: "metric" };
        state.days = {};
        save(); render();
        toast("All data cleared");
      }
      break;
    case "export": {
      const items = itemsFor(viewDate);
      if (!items.length) { toast("Add something to your stack first"); break; }
      el.disabled = true;
      try {
        const { exportReport } = await import("./pdf.js");
        await exportReport({
          dateKey: viewDate, dateLabel: longDate(viewDate), items, profile: state.profile,
          targets: computeTargets(state.profile), totals: totalsFor(items),
          analyse: analyseIngredients,
        });
        toast("Report downloaded ✓", "good");
      } catch (err) {
        console.error(err);
        toast("Couldn't create the PDF. Check your connection and try again.", "warn");
      } finally { el.disabled = false; }
      break;
    }
  }
});

document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.id === "draft-name" && draft) draft.name = t.value;
  if (t.form?.id === "profile-form") {
    readProfileForm(t.form);
    for (const l of t.form.querySelectorAll(".seg label, .choice")) l.classList.toggle("on", l.querySelector("input").checked);
    $("#profile-results").innerHTML = profileResults();
  }
});

document.addEventListener("change", (e) => {
  const t = e.target;
  if (!draft) return;
  if (t.dataset.nutrient) {
    const v = parseFloat(t.value);
    if (Number.isFinite(v) && v >= 0) draft.values[t.dataset.nutrient] = v;
    else delete draft.values[t.dataset.nutrient];
    // Keep the "Add" button state in sync without losing focus.
    const btn = $('[data-action="add-to-stack"]');
    if (btn) btn.disabled = !Object.keys(draft.values).length && !draft.ingredients?.items.length;
  }
  if (t.dataset.field === "servingSize") draft.servingSize = t.value;
});

render();
