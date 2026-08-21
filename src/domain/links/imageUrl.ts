import { canonicalUrl } from "./url";

const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;
const DATA_IMAGE = /^data:image\//i;

export function imageUrlFrom(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  if (DATA_IMAGE.test(trimmed)) return trimmed;

  const url = canonicalUrl(trimmed);
  if (!url) return null;

  try {
    return IMAGE_EXTENSION.test(new URL(url).pathname) ? url : null;
  } catch {
    return null;
  }
}
