import type { CabinetSummary } from "@/domain/transfer/cabinetSummary";

function counted(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function writeMessage(summary: CabinetSummary): string {
  const counts = [
    counted(summary.shelves, "shelf", "shelves"),
    counted(summary.folders, "folder", "folders"),
    counted(summary.notes, "card", "cards"),
  ];

  return `Cabinet: ${counts.join(", ")}`;
}
