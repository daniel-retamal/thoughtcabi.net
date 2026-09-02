import type { Rhythm } from "@/domain/sync/rhythm";
import type {
  Cadence,
  Direction,
  ProviderId,
  RemoteHead,
  RemoteLocator,
  SyncProblem,
} from "@/domain/sync/types";

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export class RemoteError extends Error {
  constructor(readonly problem: SyncProblem) {
    super(problem);
    this.name = "RemoteError";
  }
}

export function problemOf(error: unknown): SyncProblem {
  return error instanceof RemoteError ? error.problem : "failed";
}

export interface RemoteSnapshot {
  text: string;
  revision: string;
}

export type PushFailure =
  | "conflict"
  | "auth"
  | "permission"
  | "offline"
  | "denied"
  | "quota"
  | "readonly"
  | "too-large"
  | "failed";

export type PushOutcome = { ok: true; revision: string } | { ok: false; reason: PushFailure };

export interface RemoteStore {
  readonly provider: ProviderId;
  head(): Promise<RemoteHead | null>;
  pull(): Promise<RemoteSnapshot>;
  push(text: string, expected: string | null, message: string): Promise<PushOutcome>;
  sibling(name: string, text: string): Promise<string | null>;
  siblings?(): Promise<readonly string[]>;
  pullFrom?(name: string): Promise<RemoteSnapshot>;
  writable?(): Promise<boolean>;
}

export type ConnectProblem = "cancelled" | "invalid" | "auth" | "gone" | "public" | "failed";

export type ConnectResult =
  { ok: true; connection: RemoteConnection } | { ok: false; reason: ConnectProblem };

export interface RemoteConnection {
  locator: RemoteLocator;
  label: string;
  secret: string | null;
  store: RemoteStore;
}

export type ReopenMode = "quiet" | "gesture";

export type ReopenResult =
  | { ok: true; store: RemoteStore }
  | { ok: false; reason: "needs-permission" | "auth" | "gone" | "failed" };

export interface ConnectOptions {
  fields: Readonly<Record<string, string>>;
}

export interface ProviderAvailability {
  ok: boolean;
  reason: "chromium-only" | null;
}

export interface ProviderDefaults {
  takesHome: boolean;
  cadence: Cadence;
  rhythm: Rhythm;
}

export function directionFor(defaults: ProviderDefaults, hasHome: boolean): Direction {
  return defaults.takesHome && !hasHome ? "two-way" : "mirror";
}

export interface RemoteProvider {
  readonly id: ProviderId;
  readonly defaults: ProviderDefaults;
  available(): ProviderAvailability;
  connect(options: ConnectOptions): Promise<ConnectResult>;
  reopen(locator: RemoteLocator, secret: string | null, mode: ReopenMode): Promise<ReopenResult>;
  disconnect(locator: RemoteLocator, secret: string | null): Promise<void>;
}

export function providerById(
  providers: readonly RemoteProvider[],
  id: string,
): RemoteProvider | undefined {
  return providers.find((provider) => provider.id === id);
}
