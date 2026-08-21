import { imageUrlFrom } from "@/domain/links/imageUrl";
import { downscaleImage } from "./downscaleImage";

const HTML_IMG_SRC = /<img[^>]+src\s*=\s*["']([^"']+)["']/i;
const DATA_URL = /^data:/i;

function readFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function urlFromTransfer(transfer: DataTransfer): string | null {
  const listed = transfer.getData("text/uri-list").split("\n")[0];
  const direct = imageUrlFrom(listed);
  if (direct) return direct;

  const html = transfer.getData("text/html");
  const embedded = HTML_IMG_SRC.exec(html)?.[1];
  return imageUrlFrom(embedded) ?? imageUrlFrom(transfer.getData("text"));
}

function imageFileIn(transfer: DataTransfer): File | null {
  return Array.from(transfer.files).find((entry) => entry.type.startsWith("image")) ?? null;
}

async function stored(raw: string): Promise<string> {
  const shrunk = await downscaleImage(raw).catch(() => null);
  return shrunk?.dataUrl ?? raw;
}

export function carriesImage(transfer: DataTransfer | null): boolean {
  if (!transfer) return false;
  if (Array.from(transfer.items).some((item) => item.type.startsWith("image"))) return true;
  return Array.from(transfer.types).some(
    (type) => type === "text/uri-list" || type === "text/html",
  );
}

export function hasImagePayload(transfer: DataTransfer | null): boolean {
  if (!transfer) return false;
  return imageFileIn(transfer) !== null || urlFromTransfer(transfer) !== null;
}

export async function readDroppedImage(transfer: DataTransfer): Promise<string | null> {
  const url = urlFromTransfer(transfer);
  if (url) return DATA_URL.test(url) ? stored(url) : url;

  const file = imageFileIn(transfer);
  if (!file) return null;

  const raw = await readFile(file);
  return raw ? stored(raw) : null;
}
