import { describe, expect, it } from "vitest";
import { makeDestination } from "@/test/factories";
import {
  addDestination,
  homeOf,
  mirrorsOf,
  removeDestination,
  repairTopology,
  setHome,
  updateDestination,
} from "./topology";
import type { RemoteState } from "./types";

function state(...destinations: ReturnType<typeof makeDestination>[]): RemoteState {
  return { destinations };
}

const drive = makeDestination({ id: "drive", provider: "drive", direction: "two-way" });
const repo = makeDestination({ id: "repo", provider: "github", direction: "mirror" });
const folder = makeDestination({ id: "folder", provider: "folder", direction: "mirror" });

describe("topology", () => {
  it("finds the home and everything that is not it", () => {
    const current = state(drive, repo, folder);
    expect(homeOf(current)?.id).toBe("drive");
    expect(mirrorsOf(current).map((entry) => entry.id)).toEqual(["repo", "folder"]);
  });

  it("has no home when nothing is two-way", () => {
    expect(homeOf(state(repo, folder))).toBeUndefined();
  });

  it("appends a mirror without disturbing the home", () => {
    const next = addDestination(state(drive), repo);
    expect(next.destinations.map((entry) => entry.direction)).toEqual(["two-way", "mirror"]);
  });

  it("demotes the sitting home when a new two-way destination arrives", () => {
    const next = addDestination(state(drive, repo), { ...folder, direction: "two-way" });
    expect(homeOf(next)?.id).toBe("folder");
    expect(next.destinations.find((entry) => entry.id === "drive")?.direction).toBe("mirror");
  });

  it("replaces a destination reconnected under the same id", () => {
    const next = addDestination(state(drive, repo), { ...repo, label: "Another repo" });
    expect(next.destinations).toHaveLength(2);
    expect(next.destinations[1]?.label).toBe("Another repo");
  });

  it("promotes one destination and demotes every other", () => {
    const next = setHome(state(drive, repo, folder), "repo");
    expect(homeOf(next)?.id).toBe("repo");
    expect(mirrorsOf(next).map((entry) => entry.id)).toEqual(["drive", "folder"]);
  });

  it("ignores a promotion of something that is not connected", () => {
    const current = state(drive, repo);
    expect(setHome(current, "nowhere")).toBe(current);
  });

  it("repairs a stored value carrying two homes by keeping the first", () => {
    const repaired = repairTopology([drive, { ...repo, direction: "two-way" }, folder]);
    expect(repaired.map((entry) => entry.direction)).toEqual(["two-way", "mirror", "mirror"]);
  });

  it("leaves a repaired value that already has one home alone", () => {
    const destinations = [drive, repo, folder];
    expect(repairTopology(destinations)).toEqual(destinations);
  });

  it("patches bookkeeping onto one destination and leaves the rest untouched", () => {
    const next = updateDestination(state(drive, repo), "drive", {
      baseRevision: "rev-2",
      lastSyncedAt: 42,
    });
    expect(next.destinations[0]).toMatchObject({ baseRevision: "rev-2", lastSyncedAt: 42 });
    expect(next.destinations[1]).toBe(repo);
  });

  it("removes one destination and nothing else", () => {
    const next = removeDestination(state(drive, repo, folder), "repo");
    expect(next.destinations.map((entry) => entry.id)).toEqual(["drive", "folder"]);
  });
});
