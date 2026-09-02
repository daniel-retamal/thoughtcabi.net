import type {
  DirectoryEntry,
  FileEntry,
  GrantState,
  StoredFile,
  WritableFile,
} from "@/sync/providers/fileSystem";

function fails(name: string): Error {
  return Object.assign(new Error(name), { name });
}

export class FakeDirectory implements DirectoryEntry {
  grant: GrantState = "granted";
  requests = 0;
  unreachable = false;
  refuse: string | null = null;

  private readonly contents = new Map<string, string>();
  private readonly stamps = new Map<string, number>();
  private clock = 1_000;

  constructor(readonly name = "Cabinet") {}

  put(file: string, text: string): void {
    this.clock += 1;
    this.contents.set(file, text);
    this.stamps.set(file, this.clock);
  }

  textOf(file: string): string | null {
    return this.contents.get(file) ?? null;
  }

  names(): string[] {
    return [...this.contents.keys()];
  }

  getFileHandle(file: string, options: { create?: boolean } = {}): Promise<FileEntry> {
    if (this.unreachable) return Promise.reject(fails("NotFoundError"));
    if (!this.contents.has(file) && !options.create) return Promise.reject(fails("NotFoundError"));
    return Promise.resolve(this.entryFor(file));
  }

  keys(): AsyncIterableIterator<string> {
    if (this.unreachable) throw fails("NotReadableError");
    const names = this.names();

    return (async function* listing() {
      for (const file of names) yield await Promise.resolve(file);
    })();
  }

  queryPermission(): Promise<GrantState> {
    return Promise.resolve(this.grant);
  }

  requestPermission(): Promise<GrantState> {
    this.requests += 1;
    if (this.grant === "prompt") this.grant = "granted";
    return Promise.resolve(this.grant);
  }

  private entryFor(file: string): FileEntry {
    return {
      getFile: (): Promise<StoredFile> => {
        const text = this.contents.get(file);
        if (text === undefined) return Promise.reject(fails("NotFoundError"));
        return Promise.resolve({
          size: new TextEncoder().encode(text).length,
          lastModified: this.stamps.get(file) ?? 0,
          text: () => Promise.resolve(text),
        });
      },
      createWritable: (): Promise<WritableFile> => {
        if (this.refuse) return Promise.reject(fails(this.refuse));
        let written = "";
        return Promise.resolve({
          write: (chunk: string) => {
            written += chunk;
            return Promise.resolve();
          },
          close: () => {
            this.put(file, written);
            return Promise.resolve();
          },
        });
      },
    };
  }
}
