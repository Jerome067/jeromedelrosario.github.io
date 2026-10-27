// On-device text recognition with Tesseract.js. The library (~3 MB with
// English data) is only downloaded the first time someone scans, then cached
// by the browser. Photos never leave the device.

const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

let workerPromise = null;
let progressCb = () => {};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Couldn't load the text reader. Check your connection and try again."));
    document.head.appendChild(s);
  });
}

function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      await loadScript(TESSERACT_URL);
      const worker = await window.Tesseract.createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") progressCb(0.35 + m.progress * 0.65, "Reading the label…");
          else if (m.status?.includes("load")) progressCb(Math.min(0.3, (m.progress || 0) * 0.3), "Getting the reader ready…");
        },
      });
      await worker.setParameters({ preserve_interword_spaces: "1" });
      return worker;
    })().catch((e) => { workerPromise = null; throw e; });
  }
  return workerPromise;
}

/** Load an image file into a canvas, scaled, greyscaled and contrast-boosted for OCR. */
export async function prepareImage(file) {
  const bitmap = await (window.createImageBitmap
    ? createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null)
    : null) || await loadViaImg(file);
  const maxSide = 2200;
  const minSide = 1200;
  let scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (Math.max(bitmap.width, bitmap.height) < minSide) scale = minSide / Math.max(bitmap.width, bitmap.height);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);

  // Greyscale + simple contrast stretch helps with glossy packaging.
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  let min = 255, max = 0;
  const grey = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    grey[j] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = Math.max(1, max - min);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const v = ((grey[j] - min) / range) * 255;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);

  // Small thumbnail for the stack list.
  const thumb = document.createElement("canvas");
  const ts = 96 / Math.max(bitmap.width, bitmap.height);
  thumb.width = Math.round(bitmap.width * ts);
  thumb.height = Math.round(bitmap.height * ts);
  thumb.getContext("2d").drawImage(bitmap, 0, 0, thumb.width, thumb.height);

  return { canvas, thumb: thumb.toDataURL("image/jpeg", 0.7) };
}

function loadViaImg(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That file doesn't look like an image we can read."));
    img.src = URL.createObjectURL(file);
  });
}

export async function recognize(file, onProgress = () => {}) {
  progressCb = onProgress;
  onProgress(0.02, "Preparing your photo…");
  const { canvas, thumb } = await prepareImage(file);
  const worker = await getWorker();
  onProgress(0.35, "Reading the label…");
  const { data } = await worker.recognize(canvas);
  onProgress(1, "Done");
  return { text: data.text || "", confidence: data.confidence ?? 0, thumb };
}

/** Start downloading the reader in the background so the first scan feels quick. */
export function warmUp() {
  getWorker().catch(() => {});
}
