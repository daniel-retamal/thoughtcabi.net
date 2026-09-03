import { describe, expect, it } from "vitest";
import { planFollow, planMirror, planSync } from "./planSync";
import type { LocalSyncState, RemoteHead } from "./types";

function local(overrides: Partial<LocalSyncState> = {}): LocalSyncState {
  return {
    baseRevision: "rev-1",
    baseDigest: "digest-1",
    digest: "digest-1",
    empty: false,
    ...overrides,
  };
}

function head(revision: string): RemoteHead {
  return { revision, modifiedAt: 1_700_000_000_000 };
}

describe("planSync", () => {
  it("creates when neither side has ever synced", () => {
    expect(planSync(local({ baseRevision: null, baseDigest: null }), null)).toBe("create");
  });

  it("pulls into an empty cabinet that has never synced", () => {
    const state = local({ baseRevision: null, baseDigest: null, empty: true });
    expect(planSync(state, head("rev-9"))).toBe("pull");
  });

  it("reconciles two unrelated cabinets on a first connection", () => {
    const state = local({ baseRevision: null, baseDigest: null, empty: false });
    expect(planSync(state, head("rev-9"))).toBe("reconcile");
  });

  it("recreates a remote that has gone away rather than emptying the cabinet", () => {
    expect(planSync(local(), null)).toBe("create");
    expect(planSync(local({ digest: "digest-2" }), null)).toBe("create");
  });

  it("is idle when neither side moved", () => {
    expect(planSync(local(), head("rev-1"))).toBe("idle");
  });

  it("pushes when only this machine moved", () => {
    expect(planSync(local({ digest: "digest-2" }), head("rev-1"))).toBe("push");
  });

  it("pulls when only the remote moved", () => {
    expect(planSync(local(), head("rev-2"))).toBe("pull");
  });

  it("diverges when both moved", () => {
    expect(planSync(local({ digest: "digest-2" }), head("rev-2"))).toBe("diverged");
  });

  it("treats a lost base digest as a local change rather than as clean", () => {
    expect(planSync(local({ baseDigest: null }), head("rev-1"))).toBe("push");
  });
});

describe("planMirror", () => {
  it("creates a file that is not there yet", () => {
    expect(planMirror(local({ baseRevision: null, baseDigest: null }), null, false)).toBe("create");
  });

  it("asks before it overwrites contents it has not adopted", () => {
    expect(planMirror(local(), head("rev-9"), false)).toBe("reconcile");
  });

  it("pushes once adopted and the digest has moved", () => {
    expect(planMirror(local({ digest: "digest-2" }), head("rev-9"), true)).toBe("push");
  });

  it("is idle once adopted and nothing has moved", () => {
    expect(planMirror(local(), head("rev-9"), true)).toBe("idle");
  });

  it("never pulls, whatever the remote did", () => {
    const plans = [
      planMirror(local(), head("rev-2"), true),
      planMirror(local({ digest: "digest-2" }), head("rev-2"), true),
    ];
    expect(plans).not.toContain("pull");
    expect(plans).not.toContain("diverged");
  });
});

describe("planFollow", () => {
  it("never writes", () => {
    expect(planFollow(local({ digest: "digest-2" }), head("rev-1"))).toBe("idle");
    expect(planFollow(local(), null)).toBe("idle");
  });

  it("still pulls and still diverges", () => {
    expect(planFollow(local(), head("rev-2"))).toBe("pull");
    expect(planFollow(local({ digest: "digest-2" }), head("rev-2"))).toBe("diverged");
  });
});
