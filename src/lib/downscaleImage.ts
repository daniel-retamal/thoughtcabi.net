import { STORED_QUALITY, storedImageSize } from "@/domain/links/imageCandidate";
import { rememberLoadedImage } from "@/lib/imageOutcomes";

const PREFERRED_TYPE = "image/webp";
const FALLBACK_TYPE = "image/jpeg";

export interface StoredImage {
  dataUrl: string;
  width: number;
  height: number;
}

export type ImageDecoder = (source: string) => Promise<HTMLImageElement>;

function decodeImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("undecodable"));
    image.decoding = "async";
    image.src = source;
  });
}

function encode(canvas: HTMLCanvasElement): string {
  const preferred = canvas.toDataURL(PREFERRED_TYPE, STORED_QUALITY);
  if (preferred.startsWith(`data:${PREFERRED_TYPE}`)) return preferred;
  return canvas.toDataURL(FALLBACK_TYPE, STORED_QUALITY);
}

export async function downscaleImage(
  source: string,
  decode: ImageDecoder = decodeImage,
): Promise<StoredImage> {
  const image = await decode(source);
  const natural = { width: image.naturalWidth, height: image.naturalHeight };
  const size = storedImageSize(natural);

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");
  if (!context) return { dataUrl: source, ...natural };

  context.drawImage(image, 0, 0, size.width, size.height);
  const dataUrl = encode(canvas);

  rememberLoadedImage(dataUrl, size.width, size.height);
  return { dataUrl, ...size };
}
