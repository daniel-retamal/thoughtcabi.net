import type { StorageKey } from "./keys";

function withStorage<T>(action: (store: Storage) => T, fallback: T): T {
  try {
    const store = globalThis.localStorage;
    return store ? action(store) : fallback;
  } catch {
    return fallback;
  }
}

export function readRaw(key: StorageKey): string | null {
  return withStorage((store) => store.getItem(key), null);
}

export function writeRaw(key: StorageKey, value: string): boolean {
  return withStorage((store) => {
    store.setItem(key, value);
    return true;
  }, false);
}

export function clearKey(key: StorageKey): boolean {
  return withStorage((store) => {
    store.removeItem(key);
    return true;
  }, false);
}

export function readJson<T>(key: StorageKey, parse: (value: unknown) => T | null): T | null {
  const raw = readRaw(key);
  if (raw === null) return null;
  try {
    return parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeJson(key: StorageKey, value: unknown): boolean {
  try {
    return writeRaw(key, JSON.stringify(value));
  } catch {
    return false;
  }
}
