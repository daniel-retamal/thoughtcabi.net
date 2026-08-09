export type ImageOutcome = "ok" | "broken";

export interface ImageSize {
  width: number;
  height: number;
}

interface ImageRecord {
  outcome: ImageOutcome;
  edge: number;
  size: ImageSize | null;
}

const records = new Map<string, ImageRecord>();

export function imageOutcomeOf(src: string): ImageOutcome | null {
  return records.get(src)?.outcome ?? null;
}

export function naturalEdgeOf(src: string): number {
  return records.get(src)?.edge ?? 0;
}

export function naturalSizeOf(src: string): ImageSize | null {
  return records.get(src)?.size ?? null;
}

export function rememberLoadedImage(src: string, naturalWidth: number, naturalHeight: number): void {
  if (!src) return;
  records.set(src, {
    outcome: "ok",
    edge: Math.max(naturalWidth, naturalHeight),
    size: { width: naturalWidth, height: naturalHeight },
  });
}

export function rememberBrokenImage(src: string): void {
  if (src) records.set(src, { outcome: "broken", edge: 0, size: null });
}

export function forgetImageOutcomes(): void {
  records.clear();
}
