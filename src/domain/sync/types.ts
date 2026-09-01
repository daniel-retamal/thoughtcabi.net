export const PROVIDER_IDS = ["folder", "github", "drive", "onedrive", "webdav", "s3"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export function isKnownProvider(provider: string): provider is ProviderId {
  return PROVIDER_IDS.some((id) => id === provider);
}

export const DIRECTIONS = ["two-way", "mirror", "follow"] as const;

export type Direction = (typeof DIRECTIONS)[number];

export const CADENCES = ["live", "hourly", "manual"] as const;

export type Cadence = (typeof CADENCES)[number];

export const SYNC_PROBLEMS = [
  "newer",
  "unreadable",
  "empty",
  "auth",
  "permission",
  "denied",
  "offline",
  "cors",
  "mixedContent",
  "tooLarge",
  "readonly",
  "gone",
  "failed",
] as const;

export type SyncProblem = (typeof SYNC_PROBLEMS)[number];

export type SyncPlan = "idle" | "create" | "push" | "pull" | "reconcile" | "diverged";

export interface RemoteHead {
  revision: string;
  modifiedAt: number | null;
}

export interface LocalSyncState {
  baseRevision: string | null;
  baseDigest: string | null;
  digest: string;
  empty: boolean;
}

export type RemoteLocator = Readonly<Record<string, string>>;

export interface Destination {
  id: string;
  provider: string;
  locator: RemoteLocator;
  label: string;
  direction: Direction;
  cadence: Cadence;
  adopted: boolean;
  baseRevision: string | null;
  baseDigest: string | null;
  lastSyncedAt: number | null;
  lastProblem: SyncProblem | null;
  secret: string | null;
}

export interface RemoteState {
  destinations: readonly Destination[];
}

export const EMPTY_REMOTE_STATE: RemoteState = { destinations: [] };
