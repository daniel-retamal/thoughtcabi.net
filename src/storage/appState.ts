import type { Library, Tag, ViewMode } from "@/domain/model";
import { createSeedLibrary, createSeedTags } from "@/domain/seed/seedLibrary";
import { STORAGE_KEYS } from "./keys";
import { readJson, readRaw, writeJson, writeRaw } from "./localStore";
import { parseLibrary, parseTags, parseViewMode } from "./parsers";

export const DEFAULT_VIEW_MODE: ViewMode = "grid";

export function loadLibrary(): Library {
  return readJson(STORAGE_KEYS.library, parseLibrary) ?? createSeedLibrary();
}

export function saveLibrary(library: Library): void {
  writeJson(STORAGE_KEYS.library, library);
}

export function loadTags(): Tag[] {
  return readJson(STORAGE_KEYS.tags, parseTags) ?? createSeedTags();
}

export function saveTags(tags: Tag[]): void {
  writeJson(STORAGE_KEYS.tags, tags);
}

export function loadViewMode(): ViewMode {
  return parseViewMode(readRaw(STORAGE_KEYS.view)) ?? DEFAULT_VIEW_MODE;
}

export function saveViewMode(view: ViewMode): void {
  writeRaw(STORAGE_KEYS.view, view);
}
