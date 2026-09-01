export const REMOTE_FILE_NAME = "thoughtcabinet.json";

const MAX_LABEL = 32;

export interface SplitName {
  stem: string;
  extension: string;
}

export function splitFileName(name: string): SplitName {
  const dot = name.lastIndexOf(".");
  return dot > 0
    ? { stem: name.slice(0, dot), extension: name.slice(dot) }
    : { stem: name, extension: "" };
}

export function labelSlug(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LABEL)
    .replace(/-+$/, "");
  return slug || "device";
}

export function labelledFileName(name: string, label: string): string {
  const { stem, extension } = splitFileName(name);
  return `${stem}-${labelSlug(label)}${extension}`;
}

function stamp(at: number): string {
  return new Date(at).toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

export function conflictFileName(name: string, at: number): string {
  const { stem, extension } = splitFileName(name);
  return `${stem}-conflict-${stamp(at)}${extension}`;
}
