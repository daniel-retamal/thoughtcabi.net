import { describe, expect, it } from "vitest";
import { makeLibrary, makeNote, makeTag } from "@/test/factories";
import { containerAt, findNode, locateNode } from "@/domain/library/tree";
import { isFolder, isPendingNote, type Note } from "@/domain/model";
import { TAG_PALETTE } from "@/domain/tags/palette";
import { cabinetReducer, type CabinetAction, type CabinetState } from "./cabinetReducer";

const RED = TAG_PALETTE[0];
const AMBER = TAG_PALETTE[1];

function initialState(): CabinetState {
  return {
    library: makeLibrary(),
    tags: [makeTag("To read", RED), makeTag("Reference", AMBER)],
  };
}

function reduce(state: CabinetState, ...actions: CabinetAction[]): CabinetState {
  return actions.reduce(cabinetReducer, state);
}

function noteAt(state: CabinetState, id: string): Note | undefined {
  const node = findNode(state.library, id);
  return node && !isFolder(node) && node.loading !== true ? node : undefined;
}

const READING_ROOT = { channelId: "channel-reading", path: [] };

describe("pending notes", () => {
  it("adds a placeholder and swaps in the real note", () => {
    const withPlaceholder = reduce(initialState(), {
      type: "note/addPending",
      location: READING_ROOT,
      id: "pending",
      url: "https://example.com/a-page",
    });
    const placeholder = findNode(withPlaceholder.library, "pending");
    expect(placeholder && isPendingNote(placeholder)).toBe(true);

    const resolved = reduce(withPlaceholder, {
      type: "note/resolvePending",
      note: makeNote({ id: "pending", title: "Recognized" }),
    });
    expect(noteAt(resolved, "pending")?.title).toBe("Recognized");
  });

  it("remembers the url so the placeholder can show its domain", () => {
    const state = reduce(initialState(), {
      type: "note/addPending",
      location: READING_ROOT,
      id: "pending",
      url: "https://example.com/a-page",
    });
    expect(findNode(state.library, "pending")).toMatchObject({
      url: "https://example.com/a-page",
    });
  });

  it("ignores a resolution for a placeholder that was already deleted", () => {
    const state = reduce(
      initialState(),
      { type: "note/addPending", location: READING_ROOT, id: "pending", url: "https://a.com/b" },
      { type: "node/remove", id: "pending" },
      { type: "note/resolvePending", note: makeNote({ id: "pending", title: "Too late" }) },
    );
    expect(findNode(state.library, "pending")).toBeFalsy();
  });
});

describe("note commands", () => {
  it("adds a note at the front of its destination", () => {
    const next = reduce(initialState(), {
      type: "note/add",
      location: READING_ROOT,
      note: makeNote({ id: "fresh" }),
    });
    expect(containerAt(next.library, READING_ROOT).children[0]?.id).toBe("fresh");
  });

  it("moves an edited note to its new destination", () => {
    const next = reduce(initialState(), {
      type: "note/move",
      location: { channelId: "channel-research", path: [] },
      note: makeNote({ id: "note-a", title: "Edited" }),
    });
    expect(locateNode(next.library, "note-a")).toEqual({
      channelId: "channel-research",
      path: [],
    });
    expect(noteAt(next, "note-a")?.title).toBe("Edited");
  });

  it("removes a node", () => {
    const next = reduce(initialState(), { type: "node/remove", id: "note-a" });
    expect(findNode(next.library, "note-a")).toBeUndefined();
  });
});

describe("folder commands", () => {
  it("creates and renames folders", () => {
    const created = reduce(initialState(), {
      type: "folder/add",
      location: READING_ROOT,
      id: "f-new",
      name: "Inbox",
    });
    const folder = findNode(created.library, "f-new");
    expect(folder && isFolder(folder) && folder.name).toBe("Inbox");

    const renamed = reduce(created, { type: "folder/rename", id: "f-new", name: "Later" });
    const updated = findNode(renamed.library, "f-new");
    expect(updated && isFolder(updated) && updated.name).toBe("Later");
  });
});

describe("channel commands", () => {
  it("adds, updates, reorders and removes channels", () => {
    const state = reduce(
      initialState(),
      { type: "channel/add", channel: { id: "new", name: "New", icon: "star", children: [] } },
      { type: "channel/update", id: "new", name: "Renamed", icon: "heart" },
      { type: "channel/reorder", id: "new", beforeId: "channel-reading" },
    );
    expect(state.library.map((channel) => channel.id)).toEqual([
      "new",
      "channel-reading",
      "channel-research",
    ]);
    expect(state.library[0]?.name).toBe("Renamed");

    const removed = reduce(state, { type: "channel/remove", id: "new" });
    expect(removed.library.map((channel) => channel.id)).toEqual([
      "channel-reading",
      "channel-research",
    ]);
  });
});

describe("tag commands", () => {
  it("assigns a tag to one note only", () => {
    const next = reduce(initialState(), {
      type: "tag/assign",
      noteId: "note-b",
      tag: "Reference",
    });
    expect(noteAt(next, "note-b")?.tag).toBe("Reference");
    expect(noteAt(next, "note-a")?.tag).toBe("To read");
  });

  it("adds a tag within the palette rules", () => {
    const added = reduce(initialState(), { type: "tag/add", name: "Later", color: TAG_PALETTE[2] });
    expect(added.tags.map((tag) => tag.name)).toEqual(["To read", "Reference", "Later"]);

    const duplicate = reduce(added, { type: "tag/add", name: "Another", color: RED });
    expect(duplicate.tags).toHaveLength(3);
  });

  it("renames a tag and re-labels every note carrying it", () => {
    const next = reduce(initialState(), { type: "tag/rename", from: "To read", to: "Later" });
    expect(next.tags.map((tag) => tag.name)).toEqual(["Later", "Reference"]);
    expect(noteAt(next, "note-a")?.tag).toBe("Later");
  });

  it("recolours a tag without touching notes", () => {
    const next = reduce(initialState(), { type: "tag/recolor", name: "To read", color: RED });
    expect(next.tags[0]?.color).toBe(RED);
    expect(noteAt(next, "note-a")?.tag).toBe("To read");
  });

  it("deletes a tag and clears it from its notes", () => {
    const next = reduce(initialState(), { type: "tag/remove", name: "To read" });
    expect(next.tags.map((tag) => tag.name)).toEqual(["Reference"]);
    expect(noteAt(next, "note-a")?.tag).toBe("");
  });
});

describe("reducer discipline", () => {
  it("never mutates the state it is given", () => {
    const state = initialState();
    const snapshot = JSON.stringify(state);
    reduce(
      state,
      { type: "node/remove", id: "note-a" },
      { type: "tag/remove", name: "To read" },
      { type: "node/moveIntoFolder", id: "note-loose", folderId: "folder-empty" },
    );
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it("returns the same state object when nothing changes", () => {
    const state = initialState();
    expect(cabinetReducer(state, { type: "node/remove", id: "ghost" }).library).toEqual(
      state.library,
    );
    expect(cabinetReducer(state, { type: "node/moveIntoFolder", id: "x", folderId: "y" })).toBe(
      state,
    );
  });
});
