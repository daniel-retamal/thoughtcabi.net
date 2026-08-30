import type { ChildCounts } from "@/domain/library/tree";
import type { Copy } from "@/i18n/copy";
import { counted, format } from "@/i18n/format";

function join(parts: string[]): string {
  return parts.join(" · ");
}

export function folderTileSummary(counts: ChildCounts, copy: Copy): string {
  const parts: string[] = [];
  if (counts.folders) parts.push(counted(copy.counts.folders, counts.folders));
  if (counts.notes) parts.push(counted(copy.counts.items, counts.notes));
  return parts.length ? join(parts) : copy.folder.empty;
}

export function folderRowSummary(counts: ChildCounts, copy: Copy): string {
  const parts: string[] = [];
  if (counts.folders) parts.push(format(copy.folder.foldersFlat, { n: counts.folders }));
  if (counts.notes) parts.push(format(copy.folder.itemsFlat, { n: counts.notes }));
  return parts.length ? join(parts) : copy.folder.emptyFolder;
}
