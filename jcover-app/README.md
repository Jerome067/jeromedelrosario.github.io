# JCover

An academic cover page generator: fill in your details, preview the A4 page live,
and download a print-ready PDF or an editable Word (DOCX) file.

JCover is a team project, first released as CoverCraft. This version runs entirely
in the browser — the preview, PDF and DOCX are all generated on the visitor's device,
so no server is needed and no student data is uploaded. It is published as static
files in the portfolio's `jcover/` folder.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000/jeromedelrosario.github.io/jcover/
```

## Publish

```bash
npm run deploy     # builds and replaces ../jcover with the new static site
```

Then commit both `jcover-app/` and `jcover/`.

`BASE_PATH` must match where the site is served. It defaults to
`/jeromedelrosario.github.io/jcover` (GitHub Pages project site). If the portfolio
moves to a custom domain or a `<user>.github.io` repository, build with e.g.
`BASE_PATH=/jcover npm run deploy`.

## How it works

- `lib/engine/normalize.ts` — validates and normalises the form.
- `lib/engine/layouts.ts` — the six templates, as renderer-independent blocks.
- `lib/engine/pdf.ts` — lays the blocks out with jsPDF and shrinks them to fit one A4 page.
- `lib/engine/docx.ts` — builds the Word file from the same blocks and scale.
- `public/fonts/` — Liberation and DejaVu fonts, metric-compatible with Times New Roman and Arial.
