// Validation + normalisation (port of the original backend/validators.py).
// Runs in the browser: nothing the user types leaves their device.

import type { FormState } from "@/lib/form";
import { LogoError, processLogo, type ProcessedLogo } from "./logo";

export const DOCUMENT_TYPES: Record<string, string> = {
  assignment: "Assignment",
  homework: "Homework",
  lab_report: "Lab Report",
  project_report: "Project Report",
  research_paper: "Research Paper",
  internship_report: "Internship Report",
  thesis: "Thesis",
  case_study: "Case Study",
  seminar_report: "Seminar Report",
  other: "Academic Document",
};
export const TEMPLATE_IDS = ["classic", "modern_minimal", "corporate", "elegant_border", "lab_report", "research_thesis"];
export const FONT_NAMES = ["Times New Roman", "Arial", "DejaVu Sans"];
const BORDERS = ["auto", "none", "thin", "double"];
const DENSITIES = ["compact", "normal", "relaxed"];
const MAX_MEMBERS = 12;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const CTRL = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export class ValidationFailure extends Error {
  constructor(public errors: Record<string, string>) {
    super("Validation failed");
  }
}

export type Member = { name: string; student_id: string; role: string };

export type CoverData = {
  document: {
    type: string; type_label: string; title: string; subtitle: string; course_code: string; course_title: string;
    term: string; section: string; academic_year: string; notes: string; submission_date: string; submission_date_text: string;
  };
  institution: { name: string; faculty: string; department: string; program: string; address: string; logo: ProcessedLogo | null };
  submitted_to: { name: string; designation: string; department: string; institution: string };
  submitted_by: { mode: string; members: Member[]; department: string; program: string; term: string; section: string; batch: string };
  design: {
    template_id: string; accent: string; font: string; show_logo: boolean; show_header: boolean;
    border: string; density: string; footer: string;
  };
};

type Src = Record<string, unknown>;

function clean(value: unknown): string {
  if (value == null) return "";
  const s = String(value).replace(CTRL, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return s.replace(/[ \t]+/g, " ").trim();
}

function parseISODate(raw: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return { y, m: mo, d };
}

export async function normalize(payload: FormState): Promise<CoverData> {
  const errors: Record<string, string> = {};
  const section = (key: string): Src => {
    const v = (payload as unknown as Src)[key];
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Src) : {};
  };
  const text = (src: Src, key: string, path: string, opts: { required?: boolean; max?: number; multiline?: boolean } = {}) => {
    let v = clean(src[key]);
    if (!opts.multiline) v = v.replace(/\s*\n\s*/g, " ");
    if (opts.required && !v) errors[path] = "This field is required.";
    else if (v.length > (opts.max ?? 120)) errors[path] = `Must be at most ${opts.max ?? 120} characters.`;
    return v;
  };

  // document
  const d = section("document");
  const dtype = clean(d.type) || "assignment";
  if (!(dtype in DOCUMENT_TYPES)) errors["document.type"] = "Unsupported document type.";
  const title = text(d, "title", "document.title", { required: true, max: 300 });
  const subtitle = text(d, "subtitle", "document.subtitle", { max: 300 });
  const course_code = text(d, "course_code", "document.course_code", { max: 30 });
  const course_title = text(d, "course_title", "document.course_title", { max: 150 });
  const term = text(d, "term", "document.term", { max: 40 });
  const sectionName = text(d, "section", "document.section", { max: 30 });
  const year = text(d, "academic_year", "document.academic_year", { max: 20 });
  const notes = text(d, "notes", "document.notes", { max: 400, multiline: true });
  const rawDate = clean(d.submission_date);
  let date: { y: number; m: number; d: number } | null = null;
  if (!rawDate) errors["document.submission_date"] = "This field is required.";
  else if (!(date = parseISODate(rawDate))) errors["document.submission_date"] = "Use the format YYYY-MM-DD.";

  // institution
  const i = section("institution");
  const inst: CoverData["institution"] = {
    name: text(i, "name", "institution.name", { required: true, max: 200 }),
    faculty: text(i, "faculty", "institution.faculty", { max: 150 }),
    department: text(i, "department", "institution.department", { required: true, max: 150 }),
    program: text(i, "program", "institution.program", { max: 150 }),
    address: text(i, "address", "institution.address", { max: 250 }),
    logo: null,
  };
  if (i.logo_base64) {
    try {
      inst.logo = await processLogo(String(i.logo_base64));
    } catch (exc) {
      errors["institution.logo"] = exc instanceof LogoError ? exc.message : "Logo is corrupted or not a supported image.";
    }
  }

  // submitted to
  const t = section("submitted_to");
  const to = {
    name: text(t, "name", "submitted_to.name", { required: true, max: 150 }),
    designation: text(t, "designation", "submitted_to.designation", { max: 150 }),
    department: text(t, "department", "submitted_to.department", { max: 150 }),
    institution: text(t, "institution", "submitted_to.institution", { max: 200 }),
  };

  // submitted by
  const b = section("submitted_by");
  const mode = clean(b.mode) || "individual";
  if (mode !== "individual" && mode !== "group") errors["submitted_by.mode"] = "Must be 'individual' or 'group'.";
  const rawMembers = b.members;
  const members: Member[] = [];
  if (!Array.isArray(rawMembers) || !rawMembers.length) {
    errors["submitted_by.members"] = "Add at least one student.";
  } else if (rawMembers.length > MAX_MEMBERS) {
    errors["submitted_by.members"] = `At most ${MAX_MEMBERS} members are allowed.`;
  } else {
    if (mode === "individual" && rawMembers.length !== 1) {
      errors["submitted_by.members"] = "Individual submission must have exactly one student.";
    }
    rawMembers.forEach((m, idx) => {
      if (!m || typeof m !== "object") {
        errors[`submitted_by.members.${idx}`] = "Invalid member.";
        return;
      }
      const p = `submitted_by.members.${idx}`;
      members.push({
        name: text(m as Src, "name", `${p}.name`, { required: true, max: 120 }),
        student_id: text(m as Src, "student_id", `${p}.student_id`, { required: true, max: 40 }),
        role: text(m as Src, "role", `${p}.role`, { max: 60 }),
      });
    });
  }
  const by = {
    mode,
    members,
    department: text(b, "department", "submitted_by.department", { max: 150 }),
    program: text(b, "program", "submitted_by.program", { max: 150 }),
    term: text(b, "term", "submitted_by.term", { max: 40 }),
    section: text(b, "section", "submitted_by.section", { max: 30 }),
    batch: text(b, "batch", "submitted_by.batch", { max: 30 }),
  };

  // design
  const g = section("design");
  const template_id = clean(g.template_id) || "classic";
  if (!TEMPLATE_IDS.includes(template_id)) errors["design.template_id"] = "Unknown template.";
  const accent = clean(g.accent) || "#0E4D92";
  if (!COLOR_RE.test(accent)) errors["design.accent"] = "Use a hex colour like #0E4D92.";
  const font = clean(g.font) || "Times New Roman";
  if (!FONT_NAMES.includes(font)) errors["design.font"] = "Unsupported font.";
  const border = clean(g.border) || "auto";
  if (!BORDERS.includes(border)) errors["design.border"] = "Unsupported border style.";
  const density = clean(g.density) || "normal";
  if (!DENSITIES.includes(density)) errors["design.density"] = "Unsupported density.";
  const design = {
    template_id,
    accent: accent.toUpperCase(),
    font,
    show_logo: g.show_logo === undefined ? true : Boolean(g.show_logo),
    show_header: g.show_header === undefined ? true : Boolean(g.show_header),
    border,
    density,
    footer: text(g, "footer", "design.footer", { max: 150 }),
  };

  if (Object.keys(errors).length || !date) throw new ValidationFailure(errors);

  // Sensible fallbacks, applied only after validation succeeded.
  by.department ||= inst.department;
  by.program ||= inst.program;
  by.term ||= term;
  by.section ||= sectionName;

  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    document: {
      type: dtype, type_label: DOCUMENT_TYPES[dtype], title, subtitle, course_code, course_title,
      term, section: sectionName, academic_year: year, notes,
      submission_date: `${date.y}-${pad(date.m)}-${pad(date.d)}`,
      submission_date_text: `${date.d} ${MONTHS[date.m - 1]} ${date.y}`,
    },
    institution: inst,
    submitted_to: to,
    submitted_by: by,
    design,
  };
}

/** ASCII-only, path-safe filename such as Software_Testing_Assignment_Cover.pdf */
export function safeFilename(title: string, typeLabel: string, ext: string): string {
  const slug = (s: string) =>
    s.normalize("NFKD").replace(/[^\x00-\x7f]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const titleSlug = slug(title).slice(0, 50).replace(/^_+|_+$/g, "");
  const typeSlug = slug(typeLabel);
  let parts = [titleSlug, typeSlug].filter(Boolean);
  if (titleSlug && typeSlug && titleSlug.toLowerCase().includes(typeSlug.toLowerCase())) parts = [titleSlug];
  const base = parts.length ? [...parts, "Cover"].join("_") : "Cover_Page";
  return `${base.slice(0, 80)}.${ext}`;
}
