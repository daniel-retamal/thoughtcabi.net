export type PreviewFraming = "fit" | "fill";

export const FRAME_RATIO = 16 / 10;

export function previewFramingFor(ratio: number): PreviewFraming {
  return ratio > FRAME_RATIO ? "fit" : "fill";
}
