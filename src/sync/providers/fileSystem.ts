export type GrantState = "granted" | "denied" | "prompt";

export interface GrantDescriptor {
  mode: "readwrite";
}

export interface WritableFile {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

export interface StoredFile {
  readonly size: number;
  readonly lastModified: number;
  text(): Promise<string>;
}

export interface FileEntry {
  getFile(): Promise<StoredFile>;
  createWritable(): Promise<WritableFile>;
}

export interface DirectoryEntry {
  readonly name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileEntry>;
  keys(): AsyncIterableIterator<string>;
  queryPermission?(descriptor: GrantDescriptor): Promise<GrantState>;
  requestPermission?(descriptor: GrantDescriptor): Promise<GrantState>;
}

export interface PickerOptions {
  mode: "readwrite";
  id: string;
  startIn: "documents";
}

export type DirectoryPicker = (options: PickerOptions) => Promise<DirectoryEntry>;

interface PickingWindow {
  showDirectoryPicker?: DirectoryPicker;
}

export function directoryPicker(): DirectoryPicker | null {
  if (typeof window === "undefined") return null;
  const picker = (window as PickingWindow).showDirectoryPicker;
  return picker ? (options) => picker.call(window, options) : null;
}

export function isDirectoryEntry(value: unknown): value is DirectoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<DirectoryEntry>;
  return typeof entry.getFileHandle === "function" && typeof entry.keys === "function";
}

export function errorName(error: unknown): string {
  if (typeof error !== "object" || error === null) return "";
  const named = error as { name?: unknown };
  return typeof named.name === "string" ? named.name : "";
}

export async function grantOf(directory: DirectoryEntry, ask: boolean): Promise<GrantState> {
  try {
    const state = (await directory.queryPermission?.({ mode: "readwrite" })) ?? "granted";
    if (state === "granted" || !ask) return state;
    return (await directory.requestPermission?.({ mode: "readwrite" })) ?? state;
  } catch {
    return "prompt";
  }
}
