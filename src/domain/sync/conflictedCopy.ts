import { splitFileName } from "./conflictName";

function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function markers(stem: string): RegExp[] {
  const name = escaped(stem);
  return [
    new RegExp(`^${name} \\(.*conflicted copy.*\\)$`, "i"),
    new RegExp(`^${name}\\.sync-conflict-\\d{8}-\\d{6}-[a-z0-9]+$`, "i"),
    new RegExp(`^${name}_conflict-\\d{4}-\\d{2}-\\d{2}_\\d{6}$`, "i"),
    new RegExp(`^${name} \\d+$`, "i"),
  ];
}

export function isConflictedCopy(name: string, cabinetName: string): boolean {
  const cabinet = splitFileName(cabinetName);
  const candidate = splitFileName(name);
  if (candidate.extension.toLowerCase() !== cabinet.extension.toLowerCase()) return false;
  return markers(cabinet.stem).some((marker) => marker.test(candidate.stem));
}

export function conflictedCopies(names: readonly string[], cabinetName: string): string[] {
  return names.filter((name) => isConflictedCopy(name, cabinetName));
}
