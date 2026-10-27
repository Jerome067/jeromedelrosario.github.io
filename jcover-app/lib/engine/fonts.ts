// Bundled TrueType fonts (metric-compatible with Times New Roman / Arial), loaded on demand.

import type { jsPDF } from "jspdf";

export type Style = "normal" | "bold" | "italic" | "bolditalic";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const FAMILIES: Record<string, { pdf: string; files: Record<Style, string> }> = {
  "Times New Roman": {
    pdf: "LiberationSerif",
    files: { normal: "LiberationSerif-Regular", bold: "LiberationSerif-Bold", italic: "LiberationSerif-Italic", bolditalic: "LiberationSerif-BoldItalic" },
  },
  Arial: {
    pdf: "LiberationSans",
    files: { normal: "LiberationSans-Regular", bold: "LiberationSans-Bold", italic: "LiberationSans-Italic", bolditalic: "LiberationSans-BoldItalic" },
  },
  "DejaVu Sans": {
    pdf: "DejaVuSans",
    files: { normal: "DejaVuSans", bold: "DejaVuSans-Bold", italic: "DejaVuSans-Oblique", bolditalic: "DejaVuSans-BoldOblique" },
  },
};

/** Font used inside .docx when the chosen face may be missing on the user's machine. */
export const DOCX_FONT: Record<string, string> = { "Times New Roman": "Times New Roman", Arial: "Arial", "DejaVu Sans": "Verdana" };

export const styleOf = (bold: boolean, italic: boolean): Style =>
  bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal";

const loaded = new Map<string, Promise<string>>();

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Fetch a font file once (as base64) and reuse it for every document. */
function fetchFont(file: string): Promise<string> {
  let hit = loaded.get(file);
  if (!hit) {
    hit = fetch(`${BASE_PATH}/fonts/${file}.ttf`).then((res) => {
      if (!res.ok) throw new Error(`Font ${file} failed to load (${res.status})`);
      return res.arrayBuffer();
    }).then(toBase64);
    hit.catch(() => loaded.delete(file));
    loaded.set(file, hit);
  }
  return hit;
}

/** Register the styles a document needs with a jsPDF instance. */
export async function registerFonts(doc: jsPDF, family: string, styles: Iterable<Style>) {
  const fam = FAMILIES[family] ?? FAMILIES.Arial;
  await Promise.all([...new Set(styles)].map(async (style) => {
    const file = fam.files[style];
    const data = await fetchFont(file);
    doc.addFileToVFS(`${file}.ttf`, data);
    doc.addFont(`${file}.ttf`, fam.pdf, style);
  }));
  return fam.pdf;
}
