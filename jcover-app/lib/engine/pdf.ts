// PDF renderer (port of the original ReportLab generator, using jsPDF).
//
// Blocks become "flowables" with a measured height. Content is shrunk through
// SCALES until it fits on one A4 page; the chosen scale is reused by the
// preview and the DOCX renderer so all three match.

import type { jsPDF } from "jspdf";
import { registerFonts, styleOf, type Style } from "./fonts";
import { buildLayout, type Align, type Block, type PageSpec } from "./layouts";
import type { CoverData } from "./normalize";

export const A4 = { w: 595.2756, h: 841.8898 };
const SCALES = [1.0, 0.93, 0.86, 0.79, 0.72, 0.65, 0.58];
const LEADING = 1.28;
const FRAME_PADDING = 6; // ReportLab frames pad their content by 6pt on every side

type Flow = { height: number; draw: (x: number, y: number) => void };
type Ctx = { pdf: jsPDF; family: string; spec: PageSpec; data: CoverData; scale: number; frameW: number };

const noop = () => {};

function setFont(ctx: Ctx, bold: boolean, italic: boolean, size: number) {
  ctx.pdf.setFont(ctx.family, styleOf(bold, italic));
  ctx.pdf.setFontSize(size);
}

/** A wrapped paragraph: first baseline sits fontSize below the top, like ReportLab. */
function para(ctx: Ctx, text: string, size: number, availW: number,
  o: { bold?: boolean; italic?: boolean; align?: Align; color?: string } = {}): Flow {
  const fs = size * ctx.scale;
  const leading = fs * LEADING;
  const bold = o.bold ?? false;
  const italic = o.italic ?? false;
  setFont(ctx, bold, italic, fs);
  const lines: string[] = text ? ctx.pdf.splitTextToSize(text, availW) : [];
  return {
    height: lines.length * leading,
    draw: (x, y) => {
      const { pdf } = ctx;
      setFont(ctx, bold, italic, fs);
      pdf.setTextColor(o.color ?? "#111827");
      const align = o.align ?? "left";
      const tx = align === "center" ? x + availW / 2 : align === "right" ? x + availW : x;
      lines.forEach((line, i) => pdf.text(line, tx, y + fs + i * leading, { align }));
    },
  };
}

function spacer(h: number): Flow {
  return { height: h, draw: noop };
}

function hLine(pdf: jsPDF, x: number, y: number, w: number, thickness: number, color: string) {
  pdf.setFillColor(color);
  pdf.rect(x, y - thickness / 2, w, thickness, "F");
}

/** Height of a stack of flowables, drawn one under another. */
function stack(flows: Flow[]): Flow {
  return {
    height: flows.reduce((sum, f) => sum + f.height, 0),
    draw: (x, y) => {
      let cy = y;
      for (const f of flows) {
        f.draw(x, cy);
        cy += f.height;
      }
    },
  };
}

function flowables(ctx: Ctx, blocks: Block[]): Flow[] {
  const { spec, data, scale: s, frameW } = ctx;
  const availW = frameW - 2 * FRAME_PADDING;
  const accent = spec.accent;
  const logo = data.institution.logo;
  const out: Flow[] = [];

  for (const b of blocks) {
    switch (b.t) {
      case "spacer":
        out.push(spacer(b.h * s));
        break;
      case "text":
        if (b.before) out.push(spacer(b.before * s));
        out.push(para(ctx, b.caps ? b.text.toUpperCase() : b.text, b.size, availW, b));
        if (b.after) out.push(spacer(b.after * s));
        break;
      case "rule": {
        if (b.before) out.push(spacer(b.before * s));
        const w = Math.min(b.width * availW, availW);
        const t = b.thickness * s;
        const offset = b.align === "center" ? (availW - w) / 2 : b.align === "right" ? availW - w : 0;
        // ReportLab strokes the rule along the bottom edge of its box, with round caps
        out.push({
          height: t,
          draw: (x, y) => {
            ctx.pdf.setDrawColor(b.color);
            ctx.pdf.setLineWidth(t);
            ctx.pdf.setLineCap("round");
            ctx.pdf.line(x + offset, y + t, x + offset + w, y + t);
            ctx.pdf.setLineCap("butt");
          },
        });
        if (b.after) out.push(spacer(b.after * s));
        break;
      }
      case "logo": {
        if (!logo) break;
        const ratio = logo.width / logo.height;
        let h = b.max_h * s;
        let w = h * ratio;
        if (w > frameW * 0.5) {
          w = frameW * 0.5;
          h = w / ratio;
        }
        const offset = b.align === "center" ? (availW - w) / 2 : b.align === "right" ? availW - w : 0;
        out.push({ height: h, draw: (x, y) => ctx.pdf.addImage(logo.dataUrl, "PNG", x + offset, y, w, h) });
        out.push(spacer(b.after * s));
        break;
      }
      case "columns": {
        const gap = 24;
        const cw = (frameW - gap) / 2;
        const heads = b.cols.map((c) => para(ctx, c.heading.toUpperCase(), b.size - 1.5, cw, { bold: true, color: accent }));
        const bodies = b.cols.map((c) => stack(c.lines.map(([text, bold]) => para(ctx, text, b.size, cw, { bold }))));
        const row0 = Math.max(...heads.map((h) => h.height)) + 4 * s;
        const row1 = 5 * s + Math.max(...bodies.map((h) => h.height)) + 3;
        out.push({
          height: row0 + row1,
          draw: (x, y) => {
            [0, 1].forEach((i) => {
              const cx = x + i * (cw + gap);
              heads[i].draw(cx, y);
              hLine(ctx.pdf, cx, y + row0, cw, 0.8, accent);
              bodies[i].draw(cx, y + row0 + 5 * s);
            });
          },
        });
        break;
      }
      case "members": {
        const hasRole = b.members.some((m) => m.role);
        const head = ["#", "Name", "Student ID", ...(hasRole ? ["Role"] : [])];
        const widths = (hasRole ? [0.07, 0.43, 0.25, 0.25] : [0.08, 0.55, 0.37]).map((f) => f * frameW);
        const pad = 3.5 * s;
        const rows = [
          head.map((h, i) => para(ctx, h, b.size - 1, widths[i] - 8, { bold: true, color: accent })),
          ...b.members.map((m, mi) =>
            [String(mi + 1), m.name, m.student_id, ...(hasRole ? [m.role] : [])].map((c, i) => para(ctx, c, b.size, widths[i] - 8))),
        ];
        const heights = rows.map((r) => Math.max(...r.map((c) => c.height)) + 2 * pad);
        out.push({
          height: heights.reduce((a, h) => a + h, 0),
          draw: (x, y) => {
            let ry = y;
            const tableW = widths.reduce((a, w) => a + w, 0);
            rows.forEach((row, ri) => {
              let cx = x;
              row.forEach((cell, ci) => {
                // VALIGN MIDDLE
                cell.draw(cx + 4, ry + (heights[ri] - cell.height) / 2);
                cx += widths[ci];
              });
              ry += heights[ri];
              hLine(ctx.pdf, x, ry, tableW, ri === 0 ? 1 : 0.4, ri === 0 ? accent : "#D1D5DB");
            });
          },
        });
        break;
      }
      case "kv": {
        const widths = [0.28 * frameW, 0.72 * frameW];
        const pad = 5 * s;
        const rows = b.rows.map(([k, v]) => [
          para(ctx, k.toUpperCase(), b.size - 2, widths[0] - 4, { bold: true, color: accent }),
          para(ctx, v, b.size, widths[1] - 4),
        ]);
        const heights = rows.map((r) => Math.max(...r.map((c) => c.height)) + 2 * pad);
        out.push({
          height: heights.reduce((a, h) => a + h, 0),
          draw: (x, y) => {
            let ry = y;
            rows.forEach((row, ri) => {
              row[0].draw(x, ry + (heights[ri] - row[0].height) / 2);
              row[1].draw(x + widths[0], ry + (heights[ri] - row[1].height) / 2);
              ry += heights[ri];
              hLine(ctx.pdf, x, ry, frameW, 0.4, "#E5E7EB");
            });
          },
        });
        break;
      }
    }
  }
  return out;
}

function geometry(spec: PageSpec) {
  const margin = spec.border !== "none" ? 72 : 57;
  return {
    margin,
    frameW: A4.w - 2 * margin,
    top: margin + FRAME_PADDING,
    bottom: A4.h - margin - (spec.footer ? 8 : 0) - FRAME_PADDING,
  };
}

/** Split flowables into pages (a flowable that does not fit moves to the next page). */
function paginate(flows: Flow[], top: number, bottom: number): { flow: Flow; y: number }[][] {
  const pages: { flow: Flow; y: number }[][] = [[]];
  let y = top;
  for (const flow of flows) {
    if (y + flow.height > bottom + 1e-6 && pages[pages.length - 1].length) {
      pages.push([]);
      y = top;
    }
    pages[pages.length - 1].push({ flow, y });
    y += flow.height;
  }
  return pages;
}

function decorate(ctx: Ctx) {
  const { pdf, spec } = ctx;
  const { w, h } = A4;
  pdf.setDrawColor(spec.accent);
  if (spec.border === "thin") {
    pdf.setLineWidth(1);
    pdf.rect(30, 30, w - 60, h - 60, "S");
  } else if (spec.border === "double") {
    pdf.setLineWidth(2.4);
    pdf.rect(26, 26, w - 52, h - 52, "S");
    pdf.setLineWidth(0.7);
    pdf.rect(32, 32, w - 64, h - 64, "S");
  }
  if (spec.footer) {
    setFont(ctx, false, false, 9);
    pdf.setTextColor("#6B7280");
    pdf.text(spec.footer, w / 2, h - 42, { align: "center" });
  }
}

function stylesUsed(blocks: Block[]): Style[] {
  const styles = new Set<Style>(["normal", "bold"]);
  for (const b of blocks) if (b.t === "text") styles.add(styleOf(b.bold, b.italic));
  return [...styles];
}

export type Rendered = { spec: PageSpec; blocks: Block[]; scale: number; pages: number; pdf: jsPDF };

/** Lay the document out, shrinking until it fits one A4 page (or the smallest scale is reached). */
export async function renderPdf(data: CoverData, draw = true): Promise<Rendered> {
  const { jsPDF } = await import("jspdf");
  const { spec, blocks } = buildLayout(data);
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const family = await registerFonts(pdf, spec.font, stylesUsed(blocks));
  const geo = geometry(spec);

  let ctx: Ctx = { pdf, family, spec, data, scale: SCALES[0], frameW: geo.frameW };
  let pages: { flow: Flow; y: number }[][] = [];
  for (const scale of SCALES) {
    ctx = { ...ctx, scale };
    pages = paginate(flowables(ctx, blocks), geo.top, geo.bottom);
    if (pages.length === 1) break;
  }

  if (!draw) return { spec, blocks, scale: ctx.scale, pages: pages.length, pdf };
  pages.forEach((page, i) => {
    if (i > 0) pdf.addPage();
    decorate(ctx);
    for (const { flow, y } of page) flow.draw(geo.margin + FRAME_PADDING, y);
  });
  pdf.setProperties({ title: spec.title, creator: "JCover" });
  return { spec, blocks, scale: ctx.scale, pages: pages.length, pdf };
}
