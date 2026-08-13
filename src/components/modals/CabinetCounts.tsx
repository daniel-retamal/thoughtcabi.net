import type { CabinetSummary } from "@/domain/transfer/cabinetSummary";

const CELLS: readonly { key: keyof CabinetSummary; one: string; many: string }[] = [
  { key: "shelves", one: "shelf", many: "shelves" },
  { key: "folders", one: "folder", many: "folders" },
  { key: "notes", one: "card", many: "cards" },
  { key: "tags", one: "tag", many: "tags" },
];

function plural(value: number, cell: (typeof CELLS)[number]): string {
  return value === 1 ? cell.one : cell.many;
}

export interface CabinetCountsProps {
  summary: CabinetSummary;
}

export function CabinetCounts({ summary }: CabinetCountsProps) {
  return (
    <div className="cab-counts" role="list">
      {CELLS.map((cell) => (
        <div
          className="cab-count"
          key={cell.key}
          role="listitem"
          aria-label={`${summary[cell.key]} ${plural(summary[cell.key], cell)}`}
        >
          <span className="cab-count-n">{summary[cell.key]}</span>
          <span className="cab-count-k">{plural(summary[cell.key], cell)}</span>
        </div>
      ))}
    </div>
  );
}
