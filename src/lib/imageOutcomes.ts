export type ImageOutcome = "ok" | "broken";

interface ImageRecord {
  outcome: ImageOutcome;
  width: number;
  height: number;
}

const records = new Map<string, ImageRecord>();

export function imageOutcomeOf(src: string): ImageOutcome | null {
  return records.get(src)?.outcome ?? null;
}

export function naturalEdgeOf(src: string): number {
  const record = records.get(src);
  return record ? Math.max(record.width, record.height) : 0;
}

export function naturalRatioOf(src: string): number {
  const record = records.get(src);
  return record && record.height > 0 ? record.width / record.height : 0;
}

export function rememberLoadedImage(
  src: string,
  naturalWidth: number,
  naturalHeight: number,
): void {
  if (!src) return;
  records.set(src, { outcome: "ok", width: naturalWidth, height: naturalHeight });
}

export function rememberBrokenImage(src: string): void {
  if (src) records.set(src, { outcome: "broken", width: 0, height: 0 });
}

export function forgetImageOutcomes(): void {
  records.clear();
}
