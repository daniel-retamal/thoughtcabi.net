import type { ChildCounts } from "@/domain/library/tree";
import { pluralize } from "@/lib/text";

function join(parts: string[]): string {
  return parts.join(" · ");
}

export function folderTileSummary(counts: ChildCounts): string {
  const parts: string[] = [];
  if (counts.folders) parts.push(pluralize(counts.folders, "folder"));
  if (counts.notes) parts.push(pluralize(counts.notes, "item"));
  return parts.length ? join(parts) : "Empty";
}

export function folderRowSummary(counts: ChildCounts): string {
  const parts: string[] = [];
  if (counts.folders) parts.push(`${counts.folders} folders`);
  if (counts.notes) parts.push(`${counts.notes} items`);
  return parts.length ? join(parts) : "Empty folder";
}
