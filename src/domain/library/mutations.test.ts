import { describe, expect, it } from "vitest";
import { makeFolder, makeLibrary, makeNote, makeShelf } from "@/test/factories";
import { isFolder, type Library } from "@/domain/model";
import {
  addShelf,
  addChild,
  createFolder,
  insertAt,
  insertShelf,
  moveIntoFolder,
  moveToLocation,
  patchNotes,
  removeShelf,
  removeNode,
  renameFolder,
  reorderShelves,
  reorderWithinLocation,
  replaceNode,
  updateShelf,
  withoutPendingNotes,
} from "./mutations";
import { containerAt, findNode, locateNode } from "./tree";

function childIds(library: Library, shelfId: string, path: string[] = []): string[] {
  return containerAt(library, { shelfId, path }).children.map((child) => child.id);
}

describe("addChild", () => {
  it("puts the new node first in the target container", () => {
    const library = makeLibrary();
    const next = addChild(
      library,
      { shelfId: "shelf-reading", path: ["folder-essays"] },
      makeNote({ id: "fresh" }),
    );
    expect(childIds(next, "shelf-reading", ["folder-essays"])).toEqual([
      "fresh",
      "note-a",
      "note-b",
    ]);
  });

  it("leaves the original library untouched", () => {
    const library = makeLibrary();
    const before = JSON.stringify(library);
    addChild(library, { shelfId: "shelf-reading", path: [] }, makeNote({ id: "fresh" }));
    expect(JSON.stringify(library)).toBe(before);
  });

  it("ignores an unknown shelf", () => {
    const library = makeLibrary();
    expect(addChild(library, { shelfId: "ghost", path: [] }, makeNote())).toBe(library);
  });

  it("clamps an out-of-range insertion index", () => {
    const library = makeLibrary();
    const next = insertAt(
      library,
      { shelfId: "shelf-research", path: [] },
      makeNote({ id: "last" }),
      99,
    );
    expect(childIds(next, "shelf-research")).toEqual(["note-c", "last"]);
  });
});

describe("removeNode", () => {
  it("removes a note wherever it lives", () => {
    const next = removeNode(makeLibrary(), "note-a");
    expect(findNode(next, "note-a")).toBeUndefined();
    expect(childIds(next, "shelf-reading", ["folder-essays"])).toEqual(["note-b"]);
  });

  it("removes a folder together with its subtree", () => {
    const next = removeNode(makeLibrary(), "folder-essays");
    expect(findNode(next, "folder-essays")).toBeUndefined();
    expect(findNode(next, "note-a")).toBeUndefined();
  });
});

describe("replaceNode and renameFolder", () => {
  it("swaps a node in place", () => {
    const next = replaceNode(makeLibrary(), "note-a", () => makeNote({ id: "note-a", title: "X" }));
    const node = findNode(next, "note-a");
    expect(node && !isFolder(node) && node.loading !== true && node.title).toBe("X");
  });

  it("renames a folder without touching its children", () => {
    const next = renameFolder(makeLibrary(), "folder-essays", "Long Reads");
    const folder = findNode(next, "folder-essays");
    expect(folder && isFolder(folder) && folder.name).toBe("Long Reads");
    expect(childIds(next, "shelf-reading", ["folder-essays"])).toEqual(["note-a", "note-b"]);
  });
});

describe("patchNotes", () => {
  it("applies a patch to every matching note", () => {
    const next = patchNotes(makeLibrary(), (note) =>
      note.tag === "To read" ? { tag: "Later" } : null,
    );
    const note = findNode(next, "note-a");
    expect(note && !isFolder(note) && note.loading !== true && note.tag).toBe("Later");
  });

  it("never rewrites pending placeholders", () => {
    const library: Library = [
      makeShelf(
        "C",
        [
          {
            id: "pending",
            type: "note",
            url: "https://example.com/x",
            addedAt: 1_700_000_000_000,
            loading: true,
          },
        ],
        "c",
      ),
    ];
    const next = patchNotes(library, () => ({ tag: "x" }));
    expect(next[0]?.children[0]).toEqual({
      id: "pending",
      type: "note",
      url: "https://example.com/x",
      addedAt: 1_700_000_000_000,
      loading: true,
    });
  });
});

describe("moveIntoFolder", () => {
  it("moves a node to the front of the target folder", () => {
    const next = moveIntoFolder(makeLibrary(), "note-loose", "folder-empty");
    expect(childIds(next, "shelf-reading", ["folder-empty"])).toEqual(["note-loose"]);
    expect(childIds(next, "shelf-reading")).toEqual(["folder-essays", "folder-empty"]);
  });

  it("moves a node across shelves", () => {
    const next = moveIntoFolder(
      [...makeLibrary(), makeShelf("Extra", [makeFolder("Box", [], "box")], "extra")],
      "note-c",
      "box",
    );
    expect(childIds(next, "extra", ["box"])).toEqual(["note-c"]);
  });

  it("refuses to move a folder into itself", () => {
    const library = makeLibrary();
    expect(moveIntoFolder(library, "folder-essays", "folder-essays")).toBe(library);
  });

  it("refuses to move a folder into its own descendant", () => {
    const inner = makeFolder("Inner", [], "inner");
    const library: Library = [makeShelf("C", [makeFolder("Outer", [inner], "outer")], "c")];
    expect(moveIntoFolder(library, "outer", "inner")).toBe(library);
  });

  it("ignores unknown ids", () => {
    const library = makeLibrary();
    expect(moveIntoFolder(library, "ghost", "folder-empty")).toBe(library);
    expect(moveIntoFolder(library, "note-a", "ghost")).toBe(library);
  });
});

describe("moveToLocation", () => {
  it("relocates a node to a shelf root", () => {
    const next = moveToLocation(makeLibrary(), "note-a", {
      shelfId: "shelf-research",
      path: [],
    });
    expect(childIds(next, "shelf-research")).toEqual(["note-a", "note-c"]);
    expect(locateNode(next, "note-a")).toEqual({ shelfId: "shelf-research", path: [] });
  });

  it("ignores an unknown destination shelf", () => {
    const library = makeLibrary();
    expect(moveToLocation(library, "note-a", { shelfId: "ghost", path: [] })).toBe(library);
  });
});

describe("reorderWithinLocation", () => {
  it("moves a sibling before another", () => {
    const next = reorderWithinLocation(
      makeLibrary(),
      { shelfId: "shelf-reading", path: ["folder-essays"] },
      "note-b",
      "note-a",
    );
    expect(childIds(next, "shelf-reading", ["folder-essays"])).toEqual(["note-b", "note-a"]);
  });

  it("appends when there is nothing to insert before", () => {
    const next = reorderWithinLocation(
      makeLibrary(),
      { shelfId: "shelf-reading", path: ["folder-essays"] },
      "note-a",
      null,
    );
    expect(childIds(next, "shelf-reading", ["folder-essays"])).toEqual(["note-b", "note-a"]);
  });

  it("also works as a move when the node lives elsewhere", () => {
    const next = reorderWithinLocation(
      makeLibrary(),
      { shelfId: "shelf-research", path: [] },
      "note-a",
      "note-c",
    );
    expect(childIds(next, "shelf-research")).toEqual(["note-a", "note-c"]);
    expect(childIds(next, "shelf-reading", ["folder-essays"])).toEqual(["note-b"]);
  });
});

describe("shelves", () => {
  it("adds, updates and reorders shelves", () => {
    const library = makeLibrary();
    const added = addShelf(library, makeShelf("New", [], "new"));
    expect(added.map((c) => c.id)).toEqual(["shelf-reading", "shelf-research", "new"]);

    const renamed = updateShelf(added, "new", { name: "Renamed", icon: "star" });
    expect(renamed.find((c) => c.id === "new")?.name).toBe("Renamed");

    const reordered = reorderShelves(renamed, "new", "shelf-reading");
    expect(reordered.map((c) => c.id)).toEqual(["new", "shelf-reading", "shelf-research"]);

    const appended = reorderShelves(reordered, "new", null);
    expect(appended.map((c) => c.id)).toEqual(["shelf-reading", "shelf-research", "new"]);
  });

  it("never removes the last shelf", () => {
    const only: Library = [makeShelf("Only", [], "only")];
    expect(removeShelf(only, "only")).toBe(only);
    expect(removeShelf(makeLibrary(), "shelf-research")).toHaveLength(1);
  });

  it("puts a shelf back where it was standing", () => {
    const library = makeLibrary();
    const restored = insertShelf(removeShelf(library, "shelf-reading"), 0, library[0]!);
    expect(restored.map((c) => c.id)).toEqual(["shelf-reading", "shelf-research"]);
  });

  it("clamps a restore index that no longer fits", () => {
    const library = makeLibrary();
    expect(insertShelf(library, 99, makeShelf("Late", [], "late")).at(-1)?.id).toBe("late");
    expect(insertShelf(library, -3, makeShelf("Early", [], "early"))[0]?.id).toBe("early");
  });

  it("ignores reordering an unknown shelf", () => {
    const library = makeLibrary();
    expect(reorderShelves(library, "ghost", null)).toBe(library);
  });
});

describe("withoutPendingNotes", () => {
  it("prunes placeholders at every depth and leaves real notes alone", () => {
    const library: Library = [
      makeShelf(
        "C",
        [
          makeNote({ id: "real" }),
          {
            id: "p1",
            type: "note",
            url: "https://example.com/a",
            addedAt: 1_700_000_000_000,
            loading: true,
          },
          makeFolder(
            "F",
            [
              {
                id: "p2",
                type: "note",
                url: "https://example.com/b",
                addedAt: 1_700_000_000_000,
                loading: true,
              },
              makeNote({ id: "nested" }),
            ],
            "folder-f",
          ),
        ],
        "c",
      ),
    ];

    const pruned = withoutPendingNotes(library);
    expect(pruned[0]?.children.map((node) => node.id)).toEqual(["real", "folder-f"]);
    const folder = pruned[0]?.children[1];
    expect(folder && isFolder(folder) ? folder.children.map((n) => n.id) : []).toEqual(["nested"]);
  });

  it("leaves a library with nothing pending untouched in shape", () => {
    const library = makeLibrary();
    expect(withoutPendingNotes(library)).toEqual(library);
  });
});

describe("createFolder", () => {
  it("builds an empty folder", () => {
    expect(createFolder("f1", "Inbox")).toEqual({
      id: "f1",
      type: "folder",
      name: "Inbox",
      children: [],
    });
  });
});
