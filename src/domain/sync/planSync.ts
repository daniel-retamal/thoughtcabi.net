import type { LocalSyncState, RemoteHead, SyncPlan } from "./types";

function localMoved(local: LocalSyncState): boolean {
  return local.digest !== local.baseDigest;
}

export function planSync(local: LocalSyncState, remote: RemoteHead | null): SyncPlan {
  if (!remote) return "create";

  if (local.baseRevision === null) return local.empty ? "pull" : "reconcile";

  if (remote.revision === local.baseRevision) return localMoved(local) ? "push" : "idle";

  return localMoved(local) ? "diverged" : "pull";
}

export function planMirror(
  local: LocalSyncState,
  remote: RemoteHead | null,
  adopted: boolean,
): SyncPlan {
  if (!remote) return "create";
  if (!adopted) return "reconcile";
  return localMoved(local) ? "push" : "idle";
}

export function planFollow(local: LocalSyncState, remote: RemoteHead | null): SyncPlan {
  const plan = planSync(local, remote);
  return plan === "push" || plan === "create" ? "idle" : plan;
}
