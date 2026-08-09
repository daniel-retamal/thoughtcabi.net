import { withoutPendingNotes } from "@/domain/library/mutations";
import type { Cabinet } from "@/domain/model";
import { asNumber, asRecord } from "@/lib/json";
import { parseCabinet } from "./parsers";

export const CABINET_FILE_VERSION = 1;

export type CabinetFileProblem = "unreadable" | "newer" | "empty";

export type CabinetFileRead =
  | { ok: true; cabinet: Cabinet; exportedAt: number | null }
  | { ok: false; problem: CabinetFileProblem };

export function serializeCabinet(cabinet: Cabinet, exportedAt: number): string {
  return JSON.stringify(
    {
      version: CABINET_FILE_VERSION,
      exportedAt,
      cabinet: {
        library: withoutPendingNotes(cabinet.library),
        tags: cabinet.tags,
      },
    },
    null,
    2,
  );
}

export function cabinetFileName(exportedAt: number): string {
  return `thoughtcabinet-${new Date(exportedAt).toISOString().slice(0, 10)}.json`;
}

export function readCabinetFile(text: string): CabinetFileRead {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, problem: "unreadable" };
  }

  const record = asRecord(value);
  if (!record) return { ok: false, problem: "unreadable" };

  if (asNumber(record.version, CABINET_FILE_VERSION) > CABINET_FILE_VERSION) {
    return { ok: false, problem: "newer" };
  }

  const cabinet = parseCabinet(asRecord(record.cabinet) ?? record);
  if (!cabinet) return { ok: false, problem: "empty" };

  const exportedAt = asNumber(record.exportedAt, Number.NaN);
  return { ok: true, cabinet, exportedAt: Number.isNaN(exportedAt) ? null : exportedAt };
}
