import type { CabinetSummary } from "@/domain/transfer/cabinetSummary";

const CELLS: readonly { key: keyof CabinetSummary; word: string }[] = [
  { key: "channels", word: "channel" },
  { key: "folders", word: "folder" },
  { key: "notes", word: "card" },
  { key: "tags", word: "tag" },
];

function plural(value: number, word: string): string {
  return value === 1 ? word : `${word}s`;
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
          aria-label={`${summary[cell.key]} ${plural(summary[cell.key], cell.word)}`}
        >
          <span className="cab-count-n">{summary[cell.key]}</span>
          <span className="cab-count-k">{plural(summary[cell.key], cell.word)}</span>
        </div>
      ))}
    </div>
  );
}
