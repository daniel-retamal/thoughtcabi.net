import { createId } from "@/domain/ids";
import { REMOTE_FILE_NAME, splitFileName } from "@/domain/sync/conflictName";
import { FOLDER_RHYTHM } from "@/domain/sync/rhythm";
import type { RemoteHead, RemoteLocator } from "@/domain/sync/types";
import { browserHandleStore, type HandleStore } from "../handleStore";
import type {
  ConnectOptions,
  ProviderAvailability,
  PushFailure,
  PushOutcome,
  RemoteConnection,
  RemoteProvider,
  RemoteSnapshot,
  RemoteStore,
  ReopenMode,
  ReopenResult,
} from "../types";
import {
  directoryPicker,
  errorName,
  grantOf,
  type DirectoryEntry,
  type DirectoryPicker,
  type PickerOptions,
  type StoredFile,
} from "./fileSystem";

const PICKER: PickerOptions = { mode: "readwrite", id: "thoughtcabinet", startIn: "documents" };

const FAILURE_FOR: Readonly<Record<string, PushFailure>> = {
  NotAllowedError: "permission",
  SecurityError: "permission",
  NoModificationAllowedError: "denied",
  QuotaExceededError: "quota",
};

const FREE_NAME_TRIES = 20;

function revisionOf(file: StoredFile): string {
  return `${file.lastModified}:${file.size}`;
}

function failureFor(error: unknown): PushFailure {
  return FAILURE_FOR[errorName(error)] ?? "failed";
}

async function readable(directory: DirectoryEntry): Promise<void> {
  await directory.keys().next();
}

async function fileAt(directory: DirectoryEntry, name: string): Promise<StoredFile | null> {
  try {
    return await (await directory.getFileHandle(name)).getFile();
  } catch (error) {
    if (errorName(error) !== "NotFoundError") throw error;
    await readable(directory);
    return null;
  }
}

async function writeTo(directory: DirectoryEntry, name: string, text: string): Promise<string> {
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
  return revisionOf(await handle.getFile());
}

async function freeName(directory: DirectoryEntry, name: string): Promise<string> {
  const { stem, extension } = splitFileName(name);
  for (let ordinal = 1; ordinal <= FREE_NAME_TRIES; ordinal += 1) {
    const candidate = ordinal === 1 ? name : `${stem}-${ordinal}${extension}`;
    if ((await fileAt(directory, candidate)) === null) return candidate;
  }
  return `${stem}-${Date.now()}${extension}`;
}

async function snapshotOf(directory: DirectoryEntry, name: string): Promise<RemoteSnapshot> {
  const file = await (await directory.getFileHandle(name)).getFile();
  return { text: await file.text(), revision: revisionOf(file) };
}

export function folderStore(directory: DirectoryEntry, name: string): RemoteStore {
  return {
    provider: "folder",

    async head(): Promise<RemoteHead | null> {
      const file = await fileAt(directory, name);
      return file ? { revision: revisionOf(file), modifiedAt: file.lastModified } : null;
    },

    pull: () => snapshotOf(directory, name),

    pullFrom: (sibling) => snapshotOf(directory, sibling),

    async push(text: string, expected: string | null): Promise<PushOutcome> {
      try {
        const current = await fileAt(directory, name);
        if ((current === null ? null : revisionOf(current)) !== expected) {
          return { ok: false, reason: "conflict" };
        }
        return { ok: true, revision: await writeTo(directory, name, text) };
      } catch (error) {
        return { ok: false, reason: failureFor(error) };
      }
    },

    async sibling(wanted: string, text: string): Promise<string | null> {
      try {
        const free = await freeName(directory, wanted);
        await writeTo(directory, free, text);
        return free;
      } catch {
        return null;
      }
    },

    async siblings(): Promise<readonly string[]> {
      const names: string[] = [];
      for await (const entry of directory.keys()) names.push(entry);
      return names;
    },

    writable: async () => (await grantOf(directory, false)) === "granted",
  };
}

export interface FolderProviderOptions {
  picker?: DirectoryPicker | null;
  handles?: HandleStore;
}

export function folderProvider(options: FolderProviderOptions = {}): RemoteProvider {
  const pickerNow = (): DirectoryPicker | null =>
    options.picker === undefined ? directoryPicker() : options.picker;
  const handles = options.handles ?? browserHandleStore();

  const openable = async (locator: RemoteLocator, mode: ReopenMode): Promise<ReopenResult> => {
    const key = locator.key;
    const directory = key ? await handles.read(key) : null;
    if (!directory) return { ok: false, reason: "gone" };

    const grant = await grantOf(directory, mode === "gesture");
    if (grant !== "granted") return { ok: false, reason: "needs-permission" };

    return { ok: true, store: folderStore(directory, locator.name ?? REMOTE_FILE_NAME) };
  };

  return {
    id: "folder",

    defaults: { takesHome: true, cadence: "live", rhythm: FOLDER_RHYTHM },

    available: (): ProviderAvailability =>
      pickerNow() ? { ok: true, reason: null } : { ok: false, reason: "chromium-only" },

    async connect(_options: ConnectOptions): Promise<RemoteConnection | null> {
      const picker = pickerNow();
      if (!picker) return null;

      const directory = await picker(PICKER).catch(() => null);
      if (!directory) return null;

      const key = createId("h");
      await handles.write(key, directory);

      return {
        locator: { key, name: REMOTE_FILE_NAME, folder: directory.name },
        label: directory.name,
        secret: null,
        store: folderStore(directory, REMOTE_FILE_NAME),
      };
    },

    reopen: (locator: RemoteLocator, _secret: string | null, mode: ReopenMode) =>
      openable(locator, mode),

    async disconnect(locator: RemoteLocator): Promise<void> {
      if (locator.key) await handles.forget(locator.key);
    },
  };
}
