export const STORAGE_KEYS = {
  cabinet: "thoughtcabinet.cabinet.v1",
  preferences: "thoughtcabinet.prefs.v1",
  quarantine: "thoughtcabinet.cabinet.corrupt.v1",
} as const;

export const LEGACY_KEYS = {
  library: "thoughtcabinet.data.v1",
  tags: "thoughtcabinet.tags.v1",
  view: "thoughtcabinet.view.v1",
  appearance: "thoughtcabinet.azul.v1",
} as const;

export type StorageKey =
  | (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
  | (typeof LEGACY_KEYS)[keyof typeof LEGACY_KEYS];
