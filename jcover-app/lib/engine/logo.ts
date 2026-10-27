// Logo validation: verify real PNG/JPEG content, flatten onto white and shrink to at most 600px.

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_SIDE_PX = 4000;
const OUT_MAX_SIDE_PX = 600;

export class LogoError extends Error {}

export type ProcessedLogo = { dataUrl: string; bytes: Uint8Array; width: number; height: number };

const cache = new Map<string, Promise<ProcessedLogo>>();

function decodeBase64(raw: string): Uint8Array {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(raw)) throw new LogoError("Logo data is not valid base64.");
  const bin = atob(raw);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function sniffFormat(bytes: Uint8Array): "png" | "jpeg" | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new LogoError("Logo is corrupted or not a supported image."));
    img.src = src;
  });
}

async function process(input: string): Promise<ProcessedLogo> {
  let raw = input;
  if (raw.startsWith("data:")) {
    const comma = raw.indexOf(",");
    if (raw.slice(0, comma).toLowerCase().includes("svg")) throw new LogoError("SVG logos are not supported. Use PNG or JPEG.");
    raw = raw.slice(comma + 1);
  }
  raw = raw.trim();
  if (raw.length > (MAX_BYTES * 4) / 3 + 16) throw new LogoError("Logo is too large (max 2 MB).");
  const bytes = decodeBase64(raw);
  if (!bytes.length || bytes.length > MAX_BYTES) throw new LogoError("Logo is empty or too large (max 2 MB).");
  const format = sniffFormat(bytes);
  if (!format) throw new LogoError("Only PNG and JPEG logos are supported.");

  const img = await loadImage(`data:image/${format};base64,${raw}`);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (Math.max(w, h) > MAX_SIDE_PX || Math.min(w, h) < 8) throw new LogoError("Logo dimensions must be between 8 and 4000 pixels.");

  const k = Math.min(1, OUT_MAX_SIDE_PX / Math.max(w, h));
  const outW = Math.max(1, Math.round(w * k));
  const outH = Math.max(1, Math.round(h * k));
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new LogoError("Logo is corrupted or not a supported image.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outW, outH);
  ctx.drawImage(img, 0, 0, outW, outH);
  const dataUrl = canvas.toDataURL("image/png");
  return { dataUrl, bytes: decodeBase64(dataUrl.slice(dataUrl.indexOf(",") + 1)), width: outW, height: outH };
}

export function processLogo(input: string): Promise<ProcessedLogo> {
  let hit = cache.get(input);
  if (!hit) {
    hit = process(input);
    hit.catch(() => cache.delete(input));
    cache.set(input, hit);
    if (cache.size > 4) cache.delete(cache.keys().next().value as string);
  }
  return hit;
}
