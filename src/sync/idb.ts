const DATABASE = "thoughtcabinet";
const VERSION = 2;

export const BASE_SHELF = "sync";
export const HANDLE_SHELF = "handles";

const SHELVES: readonly string[] = [BASE_SHELF, HANDLE_SHELF];

export function settled<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb"));
  });
}

export function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      for (const shelf of SHELVES) {
        if (!request.result.objectStoreNames.contains(shelf))
          request.result.createObjectStore(shelf);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb"));
    request.onblocked = () => reject(new Error("blocked"));
  });
}

export function shelfRunner(factory: IDBFactory | undefined, shelf: string) {
  return async <T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T | null> => {
    if (!factory) return null;
    try {
      const database = await openDatabase(factory);
      try {
        return await run(database.transaction(shelf, mode).objectStore(shelf));
      } finally {
        database.close();
      }
    } catch {
      return null;
    }
  };
}

export function browserFactory(): IDBFactory | undefined {
  return typeof indexedDB === "undefined" ? undefined : indexedDB;
}
