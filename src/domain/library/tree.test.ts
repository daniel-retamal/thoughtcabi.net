import { describe, expect, it } from "vitest";
import { makeFolder, makeLibrary, makeNote, makeShelf } from "@/test/factories";
import { isFolder } from "@/domain/model";
import {
  EmptyLibraryError,
  collectNotes,
  containerAt,
  containerAtPath,
  directCounts,
  findShelf,
  findFolder,
  firstShelf,
  folderContains,
  isCabinetEmpty,
  locateFolder,
  locateNode,
  parentContainerName,
  pathToFolder,
  placementOf,
  pendingPlacements,
  requireShelf,
  splitChildren,
} from "./tree";

describe("shelf lookup", () => {
  it("finds a shelf by id and falls back to the first one", () => {
    const library = makeLibrary();
    expect(findShelf(library, "shelf-research")?.name).toBe("Research");
    expect(findShelf(library, "nope")).toBeUndefined();
    expect(requireShelf(library, "nope").name).toBe("Reading");
  });

  it("refuses to pretend an empty library has a shelf", () => {
    expect(() => firstShelf([])).toThrow(EmptyLibraryError);
  });
});

describe("containerAtPath", () => {
  it("walks down a folder path", () => {
    const library = makeLibrary();
    const shelf = requireShelf(library, "shelf-reading");
    expect(containerAtPath(shelf, ["folder-essays"]).name).toBe("Essays");
  });

  it("stops at the deepest segment it can resolve", () => {
    const library = makeLibrary();
    const shelf = requireShelf(library, "shelf-reading");
    expect(containerAtPath(shelf, ["folder-essays", "missing"]).name).toBe("Essays");
    expect(containerAtPath(shelf, []).name).toBe("Reading");
  });

  it("never treats a note id as a folder segment", () => {
    const library = makeLibrary();
    const shelf = requireShelf(library, "shelf-reading");
    expect(containerAtPath(shelf, ["note-loose"]).name).toBe("Reading");
  });

  it("resolves a location against the whole library", () => {
    const library = makeLibrary();
    expect(containerAt(library, { shelfId: "shelf-research", path: [] }).name).toBe("Research");
  });
});

describe("locating nodes", () => {
  it("reports the path to a folder", () => {
    const library = makeLibrary();
    const shelf = requireShelf(library, "shelf-reading");
    expect(pathToFolder(shelf, "folder-essays")).toEqual(["folder-essays"]);
    expect(pathToFolder(shelf, "missing")).toEqual([]);
  });

  it("finds nested folders", () => {
    const inner = makeFolder("Inner", [], "inner");
    const library = [makeShelf("C", [makeFolder("Outer", [inner], "outer")], "c")];
    expect(pathToFolder(library[0]!, "inner")).toEqual(["outer", "inner"]);
  });

  it("locates a node's containing location", () => {
    const library = makeLibrary();
    expect(locateNode(library, "note-a")).toEqual({
      shelfId: "shelf-reading",
      path: ["folder-essays"],
    });
    expect(locateNode(library, "note-loose")).toEqual({
      shelfId: "shelf-reading",
      path: [],
    });
    expect(locateNode(library, "ghost")).toBeUndefined();
  });

  it("locates a folder with its display name", () => {
    const library = makeLibrary();
    expect(locateFolder(library, "folder-essays")).toEqual({
      location: { shelfId: "shelf-reading", path: ["folder-essays"] },
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
    expect(nested?.location).toEqual({ shelfId: "shelf-reading", path: ["folder-essays"] });
    expect(nested?.index).toBe(1);
    expect(nested?.node.id).toBe("note-b");

    const folder = placementOf(library, "folder-empty");
    expect(folder?.location).toEqual({ shelfId: "shelf-reading", path: [] });
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
      {
        id: "pending",
        type: "note",
        url: "https://example.com/x",
        addedAt: 1_700_000_000_000,
        loading: true,
      },
      makeFolder("Nested", [makeNote({ id: "n2" })]),
    ]);
    expect(collectNotes(folder).map((note) => note.id)).toEqual(["n1", "n2"]);
  });

  it("counts direct children only", () => {
    const library = makeLibrary();
    const shelf = requireShelf(library, "shelf-reading");
    expect(directCounts(shelf)).toEqual({ folders: 2, notes: 1 });
    expect(directCounts(containerAtPath(shelf, ["folder-essays"]))).toEqual({
      folders: 0,
      notes: 2,
    });
  });

  it("splits children into folders and notes in order", () => {
    const library = makeLibrary();
    const { folders, notes } = splitChildren(requireShelf(library, "shelf-reading"));
    expect(folders.map((f) => f.name)).toEqual(["Essays", "Empty"]);
    expect(notes.map((n) => n.id)).toEqual(["note-loose"]);
  });

  it("finds every placeholder still in flight, with the location to put it back", () => {
    const library = makeLibrary();
    const pending = {
      id: "pending",
      type: "note",
      url: "https://example.com/x",
      addedAt: 1_700_000_000_000,
      loading: true,
    };
    const nested = {
      id: "nested",
      type: "note",
      url: "https://example.com/y",
      addedAt: 1_700_000_000_000,
      loading: true,
    };

    library[0]?.children.push(pending as never);
    const essays = library[0]?.children.find(isFolder);
    essays?.children.push(nested as never);

    expect(pendingPlacements(library)).toEqual([
      { node: nested, location: { shelfId: "shelf-reading", path: ["folder-essays"] } },
      { node: pending, location: { shelfId: "shelf-reading", path: [] } },
    ]);
  });

  it("finds nothing to carry when no paste is in flight", () => {
    expect(pendingPlacements(makeLibrary())).toEqual([]);
  });

  it("calls a cabinet empty only when no shelf holds anything", () => {
    expect(isCabinetEmpty([makeShelf("Saved")])).toBe(true);
    expect(isCabinetEmpty([makeShelf("Saved"), makeShelf("Later")])).toBe(true);
    expect(
      isCabinetEmpty([makeShelf("Saved"), makeShelf("Later", [makeFolder("Empty")])]),
    ).toBe(false);
    expect(isCabinetEmpty(makeLibrary())).toBe(false);
  });

  it("detects containment at any depth", () => {
    const library = makeLibrary();
    const essays = requireShelf(library, "shelf-reading").children.find(isFolder);
    expect(essays && folderContains(essays, "note-a")).toBe(true);
    expect(essays && folderContains(essays, "note-c")).toBe(false);
  });
});
