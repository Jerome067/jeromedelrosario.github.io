// Template definitions (port of the original backend/templates/layouts.py).
//
// Each template turns the normalised document into a page spec plus a list of
// renderer-independent blocks. The preview, PDF and DOCX renderers all consume
// the same blocks, so layouts stay consistent.

import type { CoverData, Member } from "./normalize";

export type Line = [string, boolean];
export type Align = "left" | "center" | "right";
export type Block =
  | { t: "text"; text: string; size: number; bold: boolean; italic: boolean; align: Align; color: string; before: number; after: number; caps: boolean }
  | { t: "spacer"; h: number }
  | { t: "rule"; color: string; thickness: number; width: number; align: Align; before: number; after: number }
  | { t: "logo"; max_h: number; align: Align; after: number }
  | { t: "columns"; size: number; cols: { heading: string; lines: Line[] }[] }
  | { t: "members"; size: number; heading: string; members: Member[] }
  | { t: "kv"; size: number; rows: [string, string][] };

export type PageSpec = { border: string; accent: string; font: string; footer: string; title: string };

const INK = "#111827";
const MUTED = "#4B5563";
const DENSITY: Record<string, number> = { compact: 0.8, normal: 1.0, relaxed: 1.25 };
const TEMPLATE_BORDER: Record<string, string> = {
  classic: "none", modern_minimal: "none", corporate: "none",
  elegant_border: "double", lab_report: "none", research_thesis: "none",
};

// ---------------------------------------------------------------- helpers
function T(text: string, size: number, o: { bold?: boolean; italic?: boolean; align?: Align; color?: string; before?: number; after?: number; caps?: boolean } = {}): Block[] {
  if (!text) return [];
  return [{
    t: "text", text, size, bold: o.bold ?? false, italic: o.italic ?? false, align: o.align ?? "left",
    color: o.color ?? INK, before: o.before ?? 0, after: o.after ?? 0, caps: o.caps ?? false,
  }];
}

const SP = (h: number): Block[] => [{ t: "spacer", h }];

function RULE(color: string, thickness = 1, width = 1.0, align: Align = "center", before = 0, after = 0): Block[] {
  return [{ t: "rule", color, thickness, width, align, before, after }];
}

function titleSize(title: string, big: number, mid: number, small: number) {
  const n = title.length;
  return n <= 60 ? big : n <= 130 ? mid : small;
}

function logoBlock(data: CoverData, max_h: number, align: Align, after = 8): Block[] {
  return data.design.show_logo && data.institution.logo ? [{ t: "logo", max_h, align, after }] : [];
}

function courseLine(doc: CoverData["document"]) {
  const { course_code: code, course_title: name } = doc;
  return code && name ? `${code} – ${name}` : code || name;
}

function termLine(doc: CoverData["document"]) {
  return [doc.term, doc.section ? `Section ${doc.section}` : "", doc.academic_year].filter(Boolean).join(" · ");
}

function toLines(data: CoverData): Line[] {
  const t = data.submitted_to;
  return [t.name, t.designation, t.department, t.institution].filter(Boolean).map((x, i) => [x, i === 0]);
}

function byLines(data: CoverData): Line[] {
  const by = data.submitted_by;
  const lines: Line[] = [];
  if (by.mode === "individual") {
    const m = by.members[0];
    lines.push([m.name, true], [`ID: ${m.student_id}`, false]);
  } else {
    lines.push([`Group of ${by.members.length}`, true]);
  }
  for (const x of [by.program, by.department, by.term ? `Semester: ${by.term}` : "",
    by.section ? `Section: ${by.section}` : "", by.batch ? `Batch: ${by.batch}` : ""]) {
    if (x) lines.push([x, false]);
  }
  return lines;
}

/** Submitted To / Submitted By, as two columns or stacked. */
function parties(data: CoverData, accent: string, layout: "columns" | "stacked", align: Align = "left", size = 11.5): Block[] {
  const by = data.submitted_by;
  const group = by.mode === "group";
  const out: Block[] = [];
  if (layout === "columns") {
    out.push({ t: "columns", size, cols: [
      { heading: "Submitted To", lines: toLines(data) },
      { heading: "Submitted By", lines: byLines(data) },
    ] });
    if (group) {
      out.push(...SP(10), { t: "members", members: by.members, heading: "Group Members", size: size - 0.5 });
    }
    return out;
  }
  for (const [heading, lines] of [["Submitted To", toLines(data)], ["Submitted By", byLines(data)]] as const) {
    out.push(...T(heading, size - 1, { bold: true, color: accent, align, caps: true, before: 4, after: 3 }));
    for (const [text, bold] of lines) out.push(...T(text, size + (bold ? 0.5 : 0), { bold, align, after: 1 }));
    if (heading === "Submitted By" && group) {
      out.push(...SP(4));
      for (const m of by.members) {
        out.push(...T(`${m.name} (${m.student_id})` + (m.role ? ` – ${m.role}` : ""), size, { align, after: 1 }));
      }
    }
    out.push(...SP(10));
  }
  return out;
}

const dateText = (doc: CoverData["document"]) => `Date of Submission: ${doc.submission_date_text}`;
const notesBlock = (doc: CoverData["document"], align: Align) => T(doc.notes, 10, { italic: true, color: MUTED, align, before: 14 });

function instHeader(data: CoverData, align: Align, nameSize: number, accent = INK, logoH = 80): Block[] {
  const { institution: inst, design: d } = data;
  const out = logoBlock(data, logoH, align);
  if (d.show_header) {
    out.push(
      ...T(inst.name, nameSize, { bold: true, align, caps: true, color: accent, after: 3 }),
      ...T(inst.faculty, nameSize - 7, { align, after: 1 }),
      ...T(inst.department, nameSize - 6, { bold: true, align, after: 1 }),
      ...T(inst.address, 10, { color: MUTED, align, after: 1 }),
    );
  }
  return out;
}

// -------------------------------------------------------------- templates
function classic(data: CoverData, a: string): Block[] {
  const doc = data.document;
  return [
    ...SP(6), ...instHeader(data, "center", 20, a),
    ...RULE(a, 1.2, 1.0, "center", 12, 26),
    ...T(doc.type_label, 13, { bold: true, color: a, align: "center", caps: true, after: 10 }),
    ...T(doc.title, titleSize(doc.title, 26, 21, 17), { bold: true, align: "center", after: 6 }),
    ...T(doc.subtitle, 14, { italic: true, align: "center", color: MUTED, after: 16 }),
    ...T(courseLine(doc), 14, { bold: true, align: "center", before: 6, after: 3 }),
    ...T(termLine(doc), 12, { align: "center", color: MUTED }),
    ...SP(44), ...parties(data, a, "columns", "left", 12), ...SP(36),
    ...T(dateText(doc), 12, { bold: true, align: "center" }),
    ...notesBlock(doc, "center"),
  ];
}

function minimal(data: CoverData, a: string): Block[] {
  const doc = data.document;
  const b = logoBlock(data, 46, "left", 6);
  if (data.design.show_header) {
    b.push(...T(data.institution.name, 12, { bold: true, after: 1 }), ...T(data.institution.department, 10.5, { color: MUTED }));
  }
  return [
    ...b, ...SP(80),
    ...T(doc.type_label, 11, { bold: true, color: a, caps: true, after: 10 }),
    ...T(doc.title, titleSize(doc.title, 34, 26, 20), { bold: true, after: 8 }),
    ...T(doc.subtitle, 14, { color: MUTED, after: 12 }),
    ...RULE(a, 3, 0.15, "left", 6, 14),
    ...T(courseLine(doc), 12.5, { bold: true, after: 2 }),
    ...T(termLine(doc), 11, { color: MUTED }),
    ...SP(60), ...parties(data, a, "columns", "left", 11),
    ...SP(30), ...T(dateText(doc), 11, { color: MUTED }),
    ...notesBlock(doc, "left"),
  ];
}

function corporate(data: CoverData, a: string): Block[] {
  const { document: doc, institution: inst } = data;
  const b = [...RULE(a, 12, 1.0, "center", 0, 16), ...logoBlock(data, 56, "left", 6)];
  if (data.design.show_header) {
    b.push(...T(inst.name, 15, { bold: true, after: 2 }), ...T(inst.faculty, 10.5, { color: MUTED, after: 1 }), ...T(inst.department, 11, { color: MUTED }));
  }
  const rows: [string, string][] = [
    ["Course", courseLine(doc)], ["Term", doc.term], ["Section", doc.section],
    ["Academic Year", doc.academic_year], ["Submission Date", doc.submission_date_text],
  ];
  return [
    ...b, ...SP(48),
    ...T(doc.type_label, 12, { bold: true, color: a, caps: true, after: 6 }),
    ...T(doc.title, titleSize(doc.title, 28, 22, 18), { bold: true, after: 6 }),
    ...T(doc.subtitle, 14, { color: MUTED, after: 4 }),
    ...RULE("#D1D5DB", 1, 1.0, "left", 10, 12),
    { t: "kv", rows: rows.filter((r) => r[1]), size: 11.5 },
    ...SP(30), ...parties(data, a, "columns", "left", 11.5),
    ...notesBlock(doc, "left"),
  ];
}

function elegant(data: CoverData, a: string): Block[] {
  const doc = data.document;
  return [
    ...SP(14), ...instHeader(data, "center", 18, a, 76),
    ...RULE(a, 1, 0.25, "center", 10, 30),
    ...T(doc.type_label, 14, { italic: true, color: a, align: "center", after: 10 }),
    ...T(doc.title, titleSize(doc.title, 25, 20, 16), { bold: true, align: "center", after: 6 }),
    ...T(doc.subtitle, 13, { italic: true, color: MUTED, align: "center", after: 8 }),
    ...RULE(a, 1, 0.25, "center", 6, 10),
    ...T(courseLine(doc), 13, { bold: true, align: "center", after: 2 }),
    ...T(termLine(doc), 11.5, { color: MUTED, align: "center" }),
    ...SP(30), ...parties(data, a, "stacked", "center", 12),
    ...T(dateText(doc), 12, { italic: true, align: "center", before: 8 }),
    ...notesBlock(doc, "center"),
  ];
}

function lab(data: CoverData, a: string): Block[] {
  const doc = data.document;
  const b = logoBlock(data, 58, "center", 6);
  if (data.design.show_header) {
    b.push(...T(data.institution.name, 15, { bold: true, align: "center", after: 1 }), ...T(data.institution.department, 11, { color: MUTED, align: "center" }));
  }
  return [
    ...b,
    ...RULE(a, 3, 1.0, "center", 12, 26),
    ...T(doc.course_code, 40, { bold: true, color: a, align: "center", after: 2 }),
    ...T(doc.course_title, 18, { bold: true, align: "center", after: 14 }),
    ...T(doc.type_label, 12, { bold: true, color: MUTED, align: "center", caps: true, after: 8 }),
    ...RULE("#9CA3AF", 1, 1.0, "center", 2, 12),
    ...T(doc.title, titleSize(doc.title, 21, 18, 15), { bold: true, align: "center", after: 4 }),
    ...T(doc.subtitle, 13, { color: MUTED, align: "center", after: 6 }),
    ...RULE("#9CA3AF", 1, 1.0, "center", 6, 10),
    ...T(termLine(doc), 11.5, { color: MUTED, align: "center" }),
    ...SP(34), ...parties(data, a, "columns", "left", 11.5), ...SP(24),
    ...T(dateText(doc), 12, { bold: true, align: "center" }),
    ...notesBlock(doc, "center"),
  ];
}

function thesis(data: CoverData, a: string): Block[] {
  const { document: doc, institution: inst, submitted_by: by, submitted_to: to } = data;
  const art = "aeiou".includes(doc.type_label[0].toLowerCase()) ? "An" : "A";
  const b = [
    ...instHeader(data, "center", 18, a, 92), ...SP(46),
    ...T(`${art} ${doc.type_label}`, 12, { italic: true, color: a, align: "center", after: 10 }),
    ...T(doc.title, titleSize(doc.title, 25, 21, 17), { bold: true, align: "center", after: 6 }),
    ...T(doc.subtitle, 14, { italic: true, align: "center", color: MUTED, after: 10 }),
    ...T(`submitted to the Department of ${inst.department}`, 12, { align: "center", color: MUTED, after: 2 }),
    ...T(courseLine(doc), 12, { align: "center", color: MUTED }),
    ...SP(34), ...T("by", 12, { italic: true, align: "center", after: 8 }),
  ];
  for (const m of by.members) {
    b.push(
      ...T(m.name, 14, { bold: true, align: "center", after: 1 }),
      ...T(`ID: ${m.student_id}` + (m.role ? ` – ${m.role}` : ""), 11, { align: "center", color: MUTED, after: 5 }),
    );
  }
  const extra = [by.program, by.term, by.section ? `Section ${by.section}` : "", by.batch ? `Batch ${by.batch}` : ""].filter(Boolean).join(" · ");
  return [
    ...b,
    ...T(extra, 11, { align: "center", color: MUTED, before: 4 }),
    ...SP(30),
    ...T("Supervisor", 11, { bold: true, color: a, align: "center", caps: true, after: 4 }),
    ...T(to.name, 14, { bold: true, align: "center", after: 1 }),
    ...T(to.designation, 11.5, { align: "center", after: 1 }),
    ...T(to.department || inst.department, 11.5, { align: "center", after: 1 }),
    ...T(to.institution, 11.5, { align: "center" }),
    ...SP(30), ...T(doc.submission_date_text, 12, { bold: true, align: "center" }),
    ...notesBlock(doc, "center"),
  ];
}

const BUILDERS: Record<string, (data: CoverData, accent: string) => Block[]> = {
  classic, modern_minimal: minimal, corporate, elegant_border: elegant, lab_report: lab, research_thesis: thesis,
};

/** Return the page spec and blocks for a normalised document. */
export function buildLayout(data: CoverData): { spec: PageSpec; blocks: Block[] } {
  const d = data.design;
  const blocks = BUILDERS[d.template_id](data, d.accent);
  // density scales vertical spacing only
  const f = DENSITY[d.density];
  for (const blk of blocks) {
    if ("before" in blk) blk.before *= f;
    if ("after" in blk) blk.after *= f;
    if ("h" in blk) blk.h *= f;
  }
  const border = d.border === "auto" ? TEMPLATE_BORDER[d.template_id] : d.border;
  return { spec: { border, accent: d.accent, font: d.font, footer: d.footer, title: data.document.title }, blocks };
}
