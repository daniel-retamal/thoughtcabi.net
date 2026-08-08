export const STORAGE_KEYS = {
  cabinet: "thoughtcabi.cabinet.v1",
  preferences: "thoughtcabi.prefs.v1",
  quarantine: "thoughtcabi.cabinet.corrupt.v1",
} as const;

export const LEGACY_KEYS = {
  library: "thoughtcabi.data.v1",
  tags: "thoughtcabi.tags.v1",
  view: "thoughtcabi.view.v1",
  appearance: "thoughtcabi.azul.v1",
} as const;

export type StorageKey =
  | (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
  | (typeof LEGACY_KEYS)[keyof typeof LEGACY_KEYS];
