import { describe, expect, it } from "vitest";
import { makeChannel, makeFolder, makeLibrary, makeNote } from "@/test/factories";
import { isFolder } from "@/domain/model";
import {
  EmptyLibraryError,
  collectNotes,
  containerAt,
  containerAtPath,
  directCounts,
  findChannel,
  findFolder,
  firstChannel,
  folderContains,
  isCabinetEmpty,
  locateFolder,
  locateNode,
  parentContainerName,
  pathToFolder,
  placementOf,
  pendingPlacements,
  requireChannel,
  splitChildren,
} from "./tree";

describe("channel lookup", () => {
  it("finds a channel by id and falls back to the first one", () => {
    const library = makeLibrary();
    expect(findChannel(library, "channel-research")?.name).toBe("Research");
    expect(findChannel(library, "nope")).toBeUndefined();
    expect(requireChannel(library, "nope").name).toBe("Reading");
  });

  it("refuses to pretend an empty library has a channel", () => {
    expect(() => firstChannel([])).toThrow(EmptyLibraryError);
  });
});

describe("containerAtPath", () => {
  it("walks down a folder path", () => {
    const library = makeLibrary();
    const channel = requireChannel(library, "channel-reading");
    expect(containerAtPath(channel, ["folder-essays"]).name).toBe("Essays");
  });

  it("stops at the deepest segment it can resolve", () => {
    const library = makeLibrary();
    const channel = requireChannel(library, "channel-reading");
    expect(containerAtPath(channel, ["folder-essays", "missing"]).name).toBe("Essays");
    expect(containerAtPath(channel, []).name).toBe("Reading");
  });

  it("never treats a note id as a folder segment", () => {
    const library = makeLibrary();
    const channel = requireChannel(library, "channel-reading");
    expect(containerAtPath(channel, ["note-loose"]).name).toBe("Reading");
  });

  it("resolves a location against the whole library", () => {
    const library = makeLibrary();
    expect(containerAt(library, { channelId: "channel-research", path: [] }).name).toBe("Research");
  });
});

describe("locating nodes", () => {
  it("reports the path to a folder", () => {
    const library = makeLibrary();
    const channel = requireChannel(library, "channel-reading");
    expect(pathToFolder(channel, "folder-essays")).toEqual(["folder-essays"]);
    expect(pathToFolder(channel, "missing")).toEqual([]);
  });

  it("finds nested folders", () => {
    const inner = makeFolder("Inner", [], "inner");
    const library = [makeChannel("C", [makeFolder("Outer", [inner], "outer")], "c")];
    expect(pathToFolder(library[0]!, "inner")).toEqual(["outer", "inner"]);
  });

  it("locates a node's containing location", () => {
    const library = makeLibrary();
    expect(locateNode(library, "note-a")).toEqual({
      channelId: "channel-reading",
      path: ["folder-essays"],
    });
    expect(locateNode(library, "note-loose")).toEqual({
      channelId: "channel-reading",
      path: [],
    });
    expect(locateNode(library, "ghost")).toBeUndefined();
  });

  it("locates a folder with its display name", () => {
    const library = makeLibrary();
    expect(locateFolder(library, "folder-essays")).toEqual({
      location: { channelId: "channel-reading", path: ["folder-essays"] },
      name: "Essays",
    });
    expect(locateFolder(library, "ghost")).toBeNull();
  });

  it("names the container a node sits in", () => {
    const library = makeLibrary();
    expect(parentContainerName(library, "note-a")).toBe("Essays");
    expect(parentContainerName(library, "note-loose")).toBe("Reading");
    expect(parentContainerName(library, "ghost")).toBeUndefined();
  });

  it("records where a node sits so it can be put back there", () => {
    const library = makeLibrary();

    const nested = placementOf(library, "note-b");
    expect(nested?.location).toEqual({ channelId: "channel-reading", path: ["folder-essays"] });
    expect(nested?.index).toBe(1);
    expect(nested?.node.id).toBe("note-b");

    const folder = placementOf(library, "folder-empty");
    expect(folder?.location).toEqual({ channelId: "channel-reading", path: [] });
    expect(folder?.index).toBe(1);
    expect(folder?.node.id).toBe("folder-empty");

    expect(placementOf(library, "ghost")).toBeNull();
  });

  it("returns folders only from findFolder", () => {
    const library = makeLibrary();
    expect(findFolder(library, "folder-essays")?.name).toBe("Essays");
    expect(findFolder(library, "note-a")).toBeUndefined();
  });
});

describe("counting and collecting", () => {
  it("collects notes recursively but skips pending placeholders", () => {
    const folder = makeFolder("Root", [
      makeNote({ id: "n1" }),
      { id: "pending", type: "note", url: "https://example.com/x", loading: true },
      makeFolder("Nested", [makeNote({ id: "n2" })]),
    ]);
    expect(collectNotes(folder).map((note) => note.id)).toEqual(["n1", "n2"]);
  });

  it("counts direct children only", () => {
    const library = makeLibrary();
    const channel = requireChannel(library, "channel-reading");
    expect(directCounts(channel)).toEqual({ folders: 2, notes: 1 });
    expect(directCounts(containerAtPath(channel, ["folder-essays"]))).toEqual({
      folders: 0,
      notes: 2,
    });
  });

  it("splits children into folders and notes in order", () => {
    const library = makeLibrary();
    const { folders, notes } = splitChildren(requireChannel(library, "channel-reading"));
    expect(folders.map((f) => f.name)).toEqual(["Essays", "Empty"]);
    expect(notes.map((n) => n.id)).toEqual(["note-loose"]);
  });

  it("finds every placeholder still in flight, with the location to put it back", () => {
    const library = makeLibrary();
    const pending = { id: "pending", type: "note", url: "https://example.com/x", loading: true };
    const nested = { id: "nested", type: "note", url: "https://example.com/y", loading: true };

    library[0]?.children.push(pending as never);
    const essays = library[0]?.children.find(isFolder);
    essays?.children.push(nested as never);

    expect(pendingPlacements(library)).toEqual([
      { node: nested, location: { channelId: "channel-reading", path: ["folder-essays"] } },
      { node: pending, location: { channelId: "channel-reading", path: [] } },
    ]);
  });

  it("finds nothing to carry when no paste is in flight", () => {
    expect(pendingPlacements(makeLibrary())).toEqual([]);
  });

  it("calls a cabinet empty only when no channel holds anything", () => {
    expect(isCabinetEmpty([makeChannel("Saved")])).toBe(true);
    expect(isCabinetEmpty([makeChannel("Saved"), makeChannel("Later")])).toBe(true);
    expect(
      isCabinetEmpty([makeChannel("Saved"), makeChannel("Later", [makeFolder("Empty")])]),
    ).toBe(false);
    expect(isCabinetEmpty(makeLibrary())).toBe(false);
  });

  it("detects containment at any depth", () => {
    const library = makeLibrary();
    const essays = requireChannel(library, "channel-reading").children.find(isFolder);
    expect(essays && folderContains(essays, "note-a")).toBe(true);
    expect(essays && folderContains(essays, "note-c")).toBe(false);
  });
});
