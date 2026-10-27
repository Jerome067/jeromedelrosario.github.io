// DOCX renderer (port of the original python-docx generator, using the docx package).
// Reuses the PDF fit-to-one-page scale; the bundled fonts are metric-compatible with Word's.

import type { IBorderOptions, ParagraphChild } from "docx";
import { DOCX_FONT } from "./fonts";
import type { Align, Block, PageSpec } from "./layouts";
import type { CoverData } from "./normalize";

const twips = (pt: number) => Math.round(pt * 20);
const cmTwips = (cm: number) => Math.round(cm * 566.929);
const hex = (color: string) => color.replace("#", "").toUpperCase();
const CELL_MARGIN = 108; // twips

export async function renderDocx(data: CoverData, spec: PageSpec, blocks: Block[], scale: number): Promise<Blob> {
  const d = await import("docx");
  const font = DOCX_FONT[spec.font];
  const accent = spec.accent;
  const logo = data.institution.logo;
  const margin = spec.border !== "none" ? 2.54 : 2.0;
  const textW = 21.0 - 2 * margin;
  const ALIGN = { left: d.AlignmentType.LEFT, center: d.AlignmentType.CENTER, right: d.AlignmentType.RIGHT };

  const run = (text: string, size: number, o: { bold?: boolean; italic?: boolean; color?: string } = {}) =>
    new d.TextRun({
      text,
      font: { ascii: font, hAnsi: font, cs: font, eastAsia: font },
      // python-docx truncates to whole half-points; matching it keeps line breaks identical
      size: Math.max(2, Math.floor(size * 2 + 1e-6)),
      bold: o.bold ?? false,
      italics: o.italic ?? false,
      color: hex(o.color ?? "#111827"),
    });

  const paragraph = (children: ParagraphChild[], align: Align = "left", before = 0, after = 0, line = 1.12,
    extra: Partial<ConstructorParameters<typeof d.Paragraph>[0] & object> = {}) =>
    new d.Paragraph({
      alignment: ALIGN[align],
      spacing: { before: twips(before), after: twips(after), line: Math.round(line * 240), lineRule: d.LineRuleType.AUTO },
      children,
      ...extra,
    });

  const border = (style: IBorderOptions["style"], size: number, color: string, space = 0): IBorderOptions =>
    ({ style, size, color: hex(color), space });
  const NIL = border(d.BorderStyle.NIL, 0, "#FFFFFF");

  const table = (widthsCm: number[], rows: InstanceType<typeof d.TableRow>[], bottomColor: string | null, insideH: boolean) =>
    new d.Table({
      alignment: d.AlignmentType.LEFT,
      layout: d.TableLayoutType.FIXED,
      // Word's default cell padding, with the table pulled left so cell text lines up with body text
      margins: { left: CELL_MARGIN, right: CELL_MARGIN },
      indent: { size: -CELL_MARGIN, type: d.WidthType.DXA },
      width: { size: widthsCm.reduce((a, w) => a + cmTwips(w), 0), type: d.WidthType.DXA },
      columnWidths: widthsCm.map(cmTwips),
      borders: {
        top: NIL, left: NIL, right: NIL, insideVertical: NIL,
        bottom: bottomColor ? border(d.BorderStyle.SINGLE, 4, bottomColor) : NIL,
        insideHorizontal: insideH && bottomColor ? border(d.BorderStyle.SINGLE, 4, bottomColor) : NIL,
      },
      rows,
    });

  const cell = (widthCm: number, children: InstanceType<typeof d.Paragraph>[], bottom?: IBorderOptions) =>
    new d.TableCell({
      width: { size: cmTwips(widthCm), type: d.WidthType.DXA },
      children: children.length ? children : [new d.Paragraph({})],
      ...(bottom ? { borders: { bottom } } : {}),
    });

  const cellText = (text: string, size: number, o: { bold?: boolean; color?: string; after?: number } = {}) =>
    paragraph([run(text, size, o)], "left", 0, o.after ?? 1);

  const body: (InstanceType<typeof d.Paragraph> | InstanceType<typeof d.Table>)[] = [];

  for (const b of blocks) {
    switch (b.t) {
      case "spacer":
        body.push(new d.Paragraph({
          spacing: { before: 0, after: 0, line: twips(Math.max(b.h * scale, 1)), lineRule: d.LineRuleType.EXACT },
        }));
        break;
      case "text":
        body.push(paragraph(
          [run(b.caps ? b.text.toUpperCase() : b.text, b.size * scale, b)],
          b.align, b.before * scale, b.after * scale,
        ));
        break;
      case "rule": {
        const gap = textW * (1 - b.width);
        const indent = b.align === "center"
          ? { left: cmTwips(gap / 2), right: cmTwips(gap / 2) }
          : { right: cmTwips(gap) };
        body.push(paragraph([run("", 2)], b.align, b.before * scale, b.after * scale, 1.0, {
          border: { bottom: border(d.BorderStyle.SINGLE, Math.max(2, Math.floor(b.thickness * 8 * scale)), b.color) },
          indent,
        }));
        break;
      }
      case "logo": {
        if (!logo) break;
        let h = b.max_h * scale;
        let w = (h * logo.width) / logo.height;
        if (w > textW * 28.35 * 0.5) {
          w = textW * 28.35 * 0.5;
          h = (w * logo.height) / logo.width;
        }
        // docx sizes images in CSS pixels (96 per inch)
        const image = new d.ImageRun({ type: "png", data: logo.bytes, transformation: { width: (w * 96) / 72, height: (h * 96) / 72 } });
        body.push(paragraph([image], b.align, 0, b.after * scale, 1.0));
        break;
      }
      case "columns": {
        const size = b.size * scale;
        const gap = 0.8;
        const cw = (textW - gap) / 2;
        const cols = b.cols.map((col) => [
          paragraph([run(col.heading.toUpperCase(), size - 1.5 * scale, { bold: true, color: accent })], "left", 0, 3, 1.12, {
            border: { bottom: border(d.BorderStyle.SINGLE, 6, accent, 2) },
          }),
          ...col.lines.map(([text, bold]) => cellText(text, size, { bold })),
        ]);
        body.push(table([cw, gap, cw], [new d.TableRow({ children: [cell(cw, cols[0]), cell(gap, []), cell(cw, cols[1])] })], "#FFFFFF", false));
        break;
      }
      case "members": {
        const size = b.size * scale;
        const hasRole = b.members.some((m) => m.role);
        const head = ["#", "Name", "Student ID", ...(hasRole ? ["Role"] : [])];
        const widths = (hasRole ? [0.07, 0.43, 0.25, 0.25] : [0.08, 0.55, 0.37]).map((f) => textW * f);
        const accentBottom = border(d.BorderStyle.SINGLE, 8, accent);
        const rows = [
          new d.TableRow({ children: head.map((h, i) => cell(widths[i], [cellText(h, size - 1 * scale, { bold: true, color: accent })], accentBottom)) }),
          ...b.members.map((m, mi) => new d.TableRow({
            children: [String(mi + 1), m.name, m.student_id, ...(hasRole ? [m.role] : [])]
              .map((v, i) => cell(widths[i], [cellText(v, size)])),
          })),
        ];
        body.push(table(widths, rows, "#D1D5DB", true));
        break;
      }
      case "kv": {
        const size = b.size * scale;
        const widths = [textW * 0.28, textW * 0.72];
        const rows = b.rows.map(([k, v]) => new d.TableRow({
          children: [
            cell(widths[0], [cellText(k.toUpperCase(), size - 2 * scale, { bold: true, color: accent, after: 2 })]),
            cell(widths[1], [cellText(v, size, { after: 2 })]),
          ],
        }));
        body.push(table(widths, rows, "#E5E7EB", true));
        break;
      }
    }
  }

  const pageBorder = spec.border === "none" ? undefined : (() => {
    const [style, size] = spec.border === "double" ? [d.BorderStyle.DOUBLE, 12] : [d.BorderStyle.SINGLE, 8];
    const edge = border(style, size, accent, 26);
    return {
      pageBorders: { offsetFrom: d.PageBorderOffsetFrom.PAGE },
      pageBorderTop: edge, pageBorderRight: edge, pageBorderBottom: edge, pageBorderLeft: edge,
    };
  })();

  const doc = new d.Document({
    title: spec.title,
    creator: "JCover",
    styles: { default: { document: { run: { font, size: 22 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: cmTwips(21.0), height: cmTwips(29.7) },
          margin: {
            top: cmTwips(margin), left: cmTwips(margin), right: cmTwips(margin),
            bottom: cmTwips(margin + (spec.footer ? 0.3 : 0)),
          },
          ...(pageBorder ? { borders: pageBorder } : {}),
        },
      },
      footers: spec.footer
        ? { default: new d.Footer({ children: [paragraph([run(spec.footer, 9, { color: "#6B7280" })], "center")] }) }
        : undefined,
      children: body,
    }],
  });
  return d.Packer.toBlob(doc);
}
