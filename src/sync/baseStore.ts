import { BASE_SHELF, browserFactory, settled, shelfRunner } from "./idb";

export interface BaseCopy {
  text: string;
  revision: string;
}

export interface BaseStore {
  read(id: string): Promise<BaseCopy | null>;
  write(id: string, copy: BaseCopy): Promise<boolean>;
  forget(id: string): Promise<void>;
}

function isBaseCopy(value: unknown): value is BaseCopy {
  if (typeof value !== "object" || value === null) return false;
  const { text, revision } = value as Partial<BaseCopy>;
  return typeof text === "string" && typeof revision === "string";
}

export function indexedDbBaseStore(factory: IDBFactory | undefined): BaseStore {
  const withShelf = shelfRunner(factory, BASE_SHELF);

  return {
    read: async (id) => {
      const value: unknown = await withShelf("readonly", (shelf) => settled(shelf.get(id)));
      return isBaseCopy(value) ? value : null;
    },
    write: async (id, copy) => {
      const done = await withShelf("readwrite", async (shelf) => {
        await settled(shelf.put(copy, id));
        return true;
      });
      return done === true;
    },
    forget: async (id) => {
      await withShelf("readwrite", (shelf) => settled(shelf.delete(id)));
    },
  };
}

export function memoryBaseStore(): BaseStore {
  const copies = new Map<string, BaseCopy>();
  return {
    read: (id) => Promise.resolve(copies.get(id) ?? null),
    write: (id, copy) => {
      copies.set(id, copy);
      return Promise.resolve(true);
    },
    forget: (id) => {
      copies.delete(id);
      return Promise.resolve();
    },
  };
}

export function browserBaseStore(): BaseStore {
  return indexedDbBaseStore(browserFactory());
}
