export const STORAGE_KEYS = {
  library: "thoughtcabi.data.v1",
  tags: "thoughtcabi.tags.v1",
  view: "thoughtcabi.view.v1",
  appearance: "thoughtcabi.azul.v1",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
