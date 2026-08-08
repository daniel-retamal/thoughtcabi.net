import type { StorageKey } from "./keys";
import { storageArea } from "./localStore";

export function watchStorage(key: StorageKey, onChange: (raw: string | null) => void): () => void {
  const handler = (event: StorageEvent): void => {
    if (event.storageArea !== storageArea()) return;
    if (event.key !== null && event.key !== key) return;
    onChange(event.key === null ? null : event.newValue);
  };

  globalThis.addEventListener("storage", handler);
  return () => globalThis.removeEventListener("storage", handler);
}
