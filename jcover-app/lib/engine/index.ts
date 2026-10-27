// JCover's document engine. Everything runs in the browser.

import type { FormState } from "@/lib/form";
import { renderDocx } from "./docx";
import { normalize, safeFilename } from "./normalize";
import { renderPdf } from "./pdf";

export { ValidationFailure } from "./normalize";
export type { Block, PageSpec } from "./layouts";

/** Layout for the on-screen preview: same blocks and fit-to-page scale as the downloads. */
export async function previewLayout(form: FormState) {
  const data = await normalize(form);
  const { spec, blocks, scale, pages } = await renderPdf(data, false);
  return { spec, blocks, scale, pages };
}

/** Build the PDF or DOCX file. Throws ValidationFailure when fields need fixing. */
export async function generate(form: FormState, kind: "pdf" | "docx"): Promise<{ blob: Blob; filename: string }> {
  const data = await normalize(form);
  const rendered = await renderPdf(data);
  const filename = safeFilename(data.document.title, data.document.type_label, kind);
  if (kind === "pdf") {
    return { blob: rendered.pdf.output("blob"), filename };
  }
  return { blob: await renderDocx(data, rendered.spec, rendered.blocks, rendered.scale), filename };
}
