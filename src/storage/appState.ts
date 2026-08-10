import { withoutPendingNotes } from "@/domain/library/mutations";
import { DEFAULT_VIEW_MODE, type Cabinet, type Preferences } from "@/domain/model";
import { createStarterCabinet } from "@/domain/seed/starterCabinet";
import { DEFAULT_APPEARANCE } from "@/theme/colors";
import { STORAGE_KEYS } from "./keys";
import { parseJson, readRaw, writeJson, writeRaw, type WriteOutcome } from "./localStore";
import { migrateCabinet, migratePreferences } from "./migrations";
import { parseCabinet, parsePreferences } from "./parsers";

export const DEFAULT_PREFERENCES: Preferences = {
  view: DEFAULT_VIEW_MODE,
  onboarded: false,
  ...DEFAULT_APPEARANCE,
};

export function loadCabinet(): Cabinet {
  const raw = readRaw(STORAGE_KEYS.cabinet);
  if (raw === null) return migrateCabinet() ?? createStarterCabinet();

  const cabinet = parseJson(raw, parseCabinet);
  if (cabinet) return cabinet;

  writeRaw(STORAGE_KEYS.quarantine, raw);
  return createStarterCabinet();
}

export function saveCabinet(cabinet: Cabinet): WriteOutcome {
  return writeJson(STORAGE_KEYS.cabinet, {
    library: withoutPendingNotes(cabinet.library),
    tags: cabinet.tags,
  });
}

export function loadPreferences(): Preferences {
  const stored = parseJson(readRaw(STORAGE_KEYS.preferences), parsePreferences);
  return stored ?? migratePreferences() ?? { ...DEFAULT_PREFERENCES };
}

export function savePreferences(preferences: Preferences): WriteOutcome {
  return writeJson(STORAGE_KEYS.preferences, preferences);
}
