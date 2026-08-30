import { withoutPendingNotes } from "@/domain/library/mutations";
import {
  DEFAULT_LOCALE,
  DEFAULT_SIDEBAR_MODE,
  DEFAULT_SIDEBAR_WIDTH,
  DEFAULT_VIEW_MODE,
  type Cabinet,
  type Preferences,
} from "@/domain/model";
import { createStarterCabinet } from "@/domain/seed/starterCabinet";
import { DEFAULT_APPEARANCE } from "@/theme/colors";
import { STORAGE_KEYS } from "./keys";
import type { CabinetNames } from "./names";
import { parseJson, readRaw, writeJson, writeRaw, type WriteOutcome } from "./localStore";
import { migrateCabinet, migratePreferences } from "./migrations";
import { parseCabinet, parsePreferences } from "./parsers";

export const DEFAULT_PREFERENCES: Preferences = {
  view: DEFAULT_VIEW_MODE,
  sidebar: DEFAULT_SIDEBAR_MODE,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  language: DEFAULT_LOCALE,
  onboarded: false,
  ...DEFAULT_APPEARANCE,
};

export function loadCabinet(names: CabinetNames): Cabinet {
  const raw = readRaw(STORAGE_KEYS.cabinet);
  if (raw === null) return migrateCabinet(names) ?? createStarterCabinet(names.seedShelf);

  const cabinet = parseJson(raw, (value) => parseCabinet(value, names));
  if (cabinet) return cabinet;

  writeRaw(STORAGE_KEYS.quarantine, raw);
  return createStarterCabinet(names.seedShelf);
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
