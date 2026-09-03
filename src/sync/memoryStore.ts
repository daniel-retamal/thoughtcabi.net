import { FOLDER_RHYTHM, type Rhythm } from "@/domain/sync/rhythm";
import type { ProviderId, RemoteHead, RemoteLocator } from "@/domain/sync/types";
import type {
  ConnectOptions,
  ProviderAvailability,
  PushFailure,
  PushOutcome,
  ConnectResult,
  RemoteProvider,
  RemoteSnapshot,
  RemoteStore,
  ReopenMode,
  ReopenResult,
} from "./types";

export interface MemoryFile {
  text: string;
  revision: string;
  modifiedAt: number;
}

export interface MemoryScript {
  head: PushFailure | null;
  push: PushFailure | null;
  writable: boolean;
}

export class MemoryRemote {
  readonly files = new Map<string, MemoryFile>();
  readonly script: MemoryScript = { head: null, push: null, writable: true };
  pushes = 0;
  pulls = 0;
  private ordinal = 0;

  constructor(readonly name = "thoughtcabinet.json") {}

  put(text: string, at = Date.now()): string {
    this.ordinal += 1;
    const revision = `rev-${this.ordinal}`;
    this.files.set(this.name, { text, revision, modifiedAt: at });
    return revision;
  }

  text(): string | null {
    return this.files.get(this.name)?.text ?? null;
  }

  siblingNames(): string[] {
    return [...this.files.keys()].filter((name) => name !== this.name);
  }

  fail(where: keyof Omit<MemoryScript, "writable">, reason: PushFailure | null): void {
    this.script[where] = reason;
  }

  nextRevision(): string {
    this.ordinal += 1;
    return `rev-${this.ordinal}`;
  }
}

class MemoryStore implements RemoteStore {
  constructor(
    readonly provider: ProviderId,
    private readonly remote: MemoryRemote,
  ) {}

  head(): Promise<RemoteHead | null> {
    if (this.remote.script.head) return Promise.reject(new Error(this.remote.script.head));
    const file = this.remote.files.get(this.remote.name);
    return Promise.resolve(file ? { revision: file.revision, modifiedAt: file.modifiedAt } : null);
  }

  pull(): Promise<RemoteSnapshot> {
    const file = this.remote.files.get(this.remote.name);
    if (!file) return Promise.reject(new Error("gone"));
    this.remote.pulls += 1;
    return Promise.resolve({ text: file.text, revision: file.revision });
  }

  push(text: string, expected: string | null): Promise<PushOutcome> {
    if (this.remote.script.push) {
      return Promise.resolve({ ok: false, reason: this.remote.script.push });
    }

    const current = this.remote.files.get(this.remote.name)?.revision ?? null;
    if (current !== expected) return Promise.resolve({ ok: false, reason: "conflict" });

    this.remote.pushes += 1;
    return Promise.resolve({ ok: true, revision: this.remote.put(text) });
  }

  pullFrom(name: string): Promise<RemoteSnapshot> {
    const file = this.remote.files.get(name);
    if (!file) return Promise.reject(new Error("gone"));
    this.remote.pulls += 1;
    return Promise.resolve({ text: file.text, revision: file.revision });
  }

  sibling(name: string, text: string): Promise<string | null> {
    this.remote.files.set(name, {
      text,
      revision: this.remote.nextRevision(),
      modifiedAt: Date.now(),
    });
    return Promise.resolve(name);
  }

  siblings(): Promise<readonly string[]> {
    return Promise.resolve([...this.remote.files.keys()]);
  }

  writable(): Promise<boolean> {
    return Promise.resolve(this.remote.script.writable);
  }
}

export interface MemoryProviderOptions {
  id?: ProviderId;
  label?: string;
  takesHome?: boolean;
  rhythm?: Rhythm;
  availability?: ProviderAvailability;
}

export function memoryProvider(
  remote: MemoryRemote,
  options: MemoryProviderOptions = {},
): RemoteProvider {
  const id = options.id ?? "folder";
  const label = options.label ?? "A folder";
  const store = new MemoryStore(id, remote);

  return {
    id,
    defaults: {
      takesHome: options.takesHome ?? true,
      cadence: "live",
      rhythm: options.rhythm ?? FOLDER_RHYTHM,
    },
    available: () => options.availability ?? { ok: true, reason: null },
    connect: (_options: ConnectOptions): Promise<ConnectResult> =>
      Promise.resolve({
        ok: true,
        connection: { locator: { name: remote.name }, label, secret: null, store },
      }),
    reopen: (
      _locator: RemoteLocator,
      _secret: string | null,
      _mode: ReopenMode,
    ): Promise<ReopenResult> => Promise.resolve({ ok: true, store }),
    disconnect: () => Promise.resolve(),
  };
}
