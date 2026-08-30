import type { CabinetSummary } from "@/domain/transfer/cabinetSummary";
import { useCopy } from "@/i18n/I18nContext";
import { counted, plural } from "@/i18n/format";
import type { Copy } from "@/i18n/copy";

const CELLS: readonly { key: keyof CabinetSummary; forms: keyof Copy["counts"] }[] = [
  { key: "shelves", forms: "shelves" },
  { key: "folders", forms: "folders" },
  { key: "notes", forms: "cards" },
  { key: "tags", forms: "tags" },
];

export interface CabinetCountsProps {
  summary: CabinetSummary;
}

export function CabinetCounts({ summary }: CabinetCountsProps) {
  const copy = useCopy();

  return (
    <div className="cab-counts" role="list">
      {CELLS.map((cell) => {
        const value = summary[cell.key];
        return (
          <div
            className="cab-count"
            key={cell.key}
            role="listitem"
            aria-label={counted(copy.counts[cell.forms], value)}
          >
            <span className="cab-count-n">{value}</span>
            <span className="cab-count-k">{plural(copy.counts[cell.forms], value)}</span>
          </div>
        );
      })}
    </div>
  );
}
