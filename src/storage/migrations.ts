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
import { LEGACY_KEYS, STORAGE_KEYS } from "./keys";
import type { CabinetNames } from "./names";
import { clearKey, readJson, readRaw, writeJson } from "./localStore";
import { parseLibrary, parsePreferences, parseTags, parseViewMode } from "./parsers";

export function migrateCabinet(names: CabinetNames): Cabinet | null {
  const library = readJson(LEGACY_KEYS.library, (value) => parseLibrary(value, names));
  const tags = readJson(LEGACY_KEYS.tags, parseTags);
  if (!library && !tags) return null;

  const starter = createStarterCabinet(names.seedShelf);
  const cabinet: Cabinet = {
    library: library ?? starter.library,
    tags: tags ?? starter.tags,
  };

  if (writeJson(STORAGE_KEYS.cabinet, cabinet) === "ok") {
    clearKey(LEGACY_KEYS.library);
    clearKey(LEGACY_KEYS.tags);
  }

  return cabinet;
}

export function migratePreferences(): Preferences | null {
  const appearance = readJson(LEGACY_KEYS.appearance, parsePreferences);
  const view = parseViewMode(readRaw(LEGACY_KEYS.view));
  if (!appearance && !view) return null;

  const preferences: Preferences = {
    view: view ?? DEFAULT_VIEW_MODE,
    color: appearance?.color ?? DEFAULT_APPEARANCE.color,
    cards: appearance?.cards ?? DEFAULT_APPEARANCE.cards,
    sidebar: DEFAULT_SIDEBAR_MODE,
    sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
    language: DEFAULT_LOCALE,
    onboarded: false,
  };

  if (writeJson(STORAGE_KEYS.preferences, preferences) === "ok") {
    clearKey(LEGACY_KEYS.appearance);
    clearKey(LEGACY_KEYS.view);
  }

  return preferences;
}
