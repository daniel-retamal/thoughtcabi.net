export interface ImageSize {
  width: number;
  height: number;
}

export type ImageMeasurement =
  { status: "measured"; size: ImageSize } | { status: "unreachable" } | { status: "unknown" };

export const MIN_SHORT_SIDE = 160;
export const MIN_AREA = 40_000;
export const MAX_ASPECT_RATIO = 3;

export function imageSizeFrom(width: string, height: string): ImageSize | null {
  const parsedWidth = Number.parseInt(width, 10);
  const parsedHeight = Number.parseInt(height, 10);
  if (!Number.isFinite(parsedWidth) || !Number.isFinite(parsedHeight)) return null;
  if (parsedWidth <= 0 || parsedHeight <= 0) return null;
  return { width: parsedWidth, height: parsedHeight };
}

export function isPreviewSized({ width, height }: ImageSize): boolean {
  if (Math.min(width, height) < MIN_SHORT_SIDE) return false;
  if (width * height < MIN_AREA) return false;
  const ratio = width / height;
  return ratio <= MAX_ASPECT_RATIO && ratio >= 1 / MAX_ASPECT_RATIO;
}

export function acceptsPreviewImage(measurement: ImageMeasurement): boolean {
  if (measurement.status === "unreachable") return false;
  if (measurement.status === "unknown") return true;
  return isPreviewSized(measurement.size);
}
