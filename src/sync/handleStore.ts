import { browserFactory, HANDLE_SHELF, settled, shelfRunner } from "./idb";
import { isDirectoryEntry, type DirectoryEntry } from "./providers/fileSystem";

export interface HandleStore {
  read(key: string): Promise<DirectoryEntry | null>;
  write(key: string, directory: DirectoryEntry): Promise<boolean>;
  forget(key: string): Promise<void>;
}

export function indexedDbHandleStore(factory: IDBFactory | undefined): HandleStore {
  const withShelf = shelfRunner(factory, HANDLE_SHELF);

  return {
    read: async (key) => {
      const value: unknown = await withShelf("readonly", (shelf) => settled(shelf.get(key)));
      return isDirectoryEntry(value) ? value : null;
    },
    write: async (key, directory) => {
      const done = await withShelf("readwrite", async (shelf) => {
        await settled(shelf.put(directory, key));
        return true;
      });
      return done === true;
    },
    forget: async (key) => {
      await withShelf("readwrite", (shelf) => settled(shelf.delete(key)));
    },
  };
}

export function memoryHandleStore(): HandleStore {
  const handles = new Map<string, DirectoryEntry>();
  return {
    read: (key) => Promise.resolve(handles.get(key) ?? null),
    write: (key, directory) => {
      handles.set(key, directory);
      return Promise.resolve(true);
    },
    forget: (key) => {
      handles.delete(key);
      return Promise.resolve();
    },
  };
}

export function browserHandleStore(): HandleStore {
  return indexedDbHandleStore(browserFactory());
}
