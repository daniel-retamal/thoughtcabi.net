export type ImageOutcome = "ok" | "broken";

interface ImageRecord {
  outcome: ImageOutcome;
  edge: number;
}

const records = new Map<string, ImageRecord>();

export function imageOutcomeOf(src: string): ImageOutcome | null {
  return records.get(src)?.outcome ?? null;
}

export function naturalEdgeOf(src: string): number {
  return records.get(src)?.edge ?? 0;
}

export function rememberLoadedImage(src: string, naturalWidth: number, naturalHeight: number): void {
  if (src) records.set(src, { outcome: "ok", edge: Math.max(naturalWidth, naturalHeight) });
}

export function rememberBrokenImage(src: string): void {
  if (src) records.set(src, { outcome: "broken", edge: 0 });
}

export function forgetImageOutcomes(): void {
  records.clear();
}
