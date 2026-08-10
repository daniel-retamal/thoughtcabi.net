import { describe, expect, it } from "vitest";
import { makeChannel, makeLibrary, makeNote, makeTag } from "@/test/factories";
import { containerAt, findNode, locateNode, placementOf } from "@/domain/library/tree";
import { isFolder, isPendingNote, type Cabinet, type Note } from "@/domain/model";
import { TAG_PALETTE } from "@/domain/tags/palette";
import { cabinetReducer, type CabinetAction } from "./cabinetReducer";

const RED = TAG_PALETTE[0];
const AMBER = TAG_PALETTE[1];

function initialState(): Cabinet {
  return {
    library: makeLibrary(),
    tags: [makeTag("To read", RED), makeTag("Reference", AMBER)],
  };
}

function reduce(state: Cabinet, ...actions: CabinetAction[]): Cabinet {
  return actions.reduce(cabinetReducer, state);
}

function noteAt(state: Cabinet, id: string): Note | undefined {
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

  it("puts a removed node back at the index it held", () => {
    const state = initialState();
    const placement = placementOf(state.library, "note-b")!;

    const removed = reduce(state, { type: "node/remove", id: "note-b" });
    const restored = reduce(removed, { type: "node/restore", placement });

    expect(containerAt(restored.library, placement.location).children.map((c) => c.id)).toEqual([
      "note-a",
      "note-b",
    ]);
  });

  it("puts a whole folder back, with everything that was inside it", () => {
    const state = initialState();
    const placement = placementOf(state.library, "folder-essays")!;

    const removed = reduce(state, { type: "node/remove", id: "folder-essays" });
    expect(findNode(removed.library, "note-a")).toBeUndefined();

    const restored = reduce(removed, { type: "node/restore", placement });
    expect(noteAt(restored, "note-a")?.title).toBe("On Rereading");
    expect(containerAt(restored.library, READING_ROOT).children[0]?.id).toBe("folder-essays");
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

  it("puts a deleted channel back where it stood, contents and all", () => {
    const state = initialState();
    const channel = state.library[0]!;

    const removed = reduce(state, { type: "channel/remove", id: channel.id });
    const restored = reduce(removed, { type: "channel/restore", index: 0, channel });

    expect(restored.library.map((entry) => entry.id)).toEqual([
      "channel-reading",
      "channel-research",
    ]);
    expect(noteAt(restored, "note-a")?.title).toBe("On Rereading");
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

  it("recolors a tag without touching notes", () => {
    const next = reduce(initialState(), { type: "tag/recolor", name: "To read", color: RED });
    expect(next.tags[0]?.color).toBe(RED);
    expect(noteAt(next, "note-a")?.tag).toBe("To read");
  });

  it("deletes a tag and clears it from its notes", () => {
    const next = reduce(initialState(), { type: "tag/remove", name: "To read" });
    expect(next.tags.map((tag) => tag.name)).toEqual(["Reference"]);
    expect(noteAt(next, "note-a")?.tag).toBe("");
  });

  it("puts a deleted tag back in its place, and back on its notes", () => {
    const removed = reduce(initialState(), { type: "tag/remove", name: "To read" });
    const restored = reduce(removed, {
      type: "tag/restore",
      index: 0,
      tag: makeTag("To read", RED),
      noteIds: ["note-a"],
    });

    expect(restored.tags).toEqual([makeTag("To read", RED), makeTag("Reference", AMBER)]);
    expect(noteAt(restored, "note-a")?.tag).toBe("To read");
    expect(noteAt(restored, "note-b")?.tag).toBe("");
  });
});

describe("adopting another tab's cabinet", () => {
  function remoteCabinet(): Cabinet {
    return {
      library: [makeChannel("Remote", [makeNote({ id: "remote-note" })], "channel-remote")],
      tags: [makeTag("Remote tag", RED)],
    };
  }

  it("replaces both halves with the incoming pair", () => {
    const next = reduce(initialState(), { type: "cabinet/adopt", cabinet: remoteCabinet() });

    expect(next.library.map((channel) => channel.id)).toEqual(["channel-remote"]);
    expect(next.tags.map((tag) => tag.name)).toEqual(["Remote tag"]);
    expect(findNode(next.library, "note-a")).toBeUndefined();
  });

  it("carries a still-loading paste across the adopt", () => {
    const pasted = reduce(initialState(), {
      type: "note/addPending",
      location: READING_ROOT,
      id: "pending",
      url: "https://example.com/in-flight",
    });

    const adopted = reduce(pasted, { type: "cabinet/adopt", cabinet: initialState() });

    const placeholder = findNode(adopted.library, "pending");
    expect(placeholder && isPendingNote(placeholder)).toBe(true);
    expect(locateNode(adopted.library, "pending")?.channelId).toBe("channel-reading");
  });

  it("drops a placeholder whose channel the other tab deleted", () => {
    const pasted = reduce(initialState(), {
      type: "note/addPending",
      location: READING_ROOT,
      id: "pending",
      url: "https://example.com/in-flight",
    });

    const adopted = reduce(pasted, { type: "cabinet/adopt", cabinet: remoteCabinet() });

    expect(findNode(adopted.library, "pending")).toBeUndefined();
  });
});

describe("importing a cabinet file", () => {
  const imported: Cabinet = {
    library: [
      makeChannel("Reading", [makeNote({ id: "arrived", title: "Arrived" })], "ch-file"),
      makeChannel("Recipes", [], "ch-recipes"),
    ],
    tags: [makeTag("Later", TAG_PALETTE[2])],
  };

  it("merges into the channel that already carries the name", () => {
    const next = reduce(initialState(), { type: "cabinet/merge", cabinet: imported });

    expect(next.library.map((channel) => channel.name)).toEqual(["Reading", "Research", "Recipes"]);
    expect(locateNode(next.library, "arrived")?.channelId).toBe("channel-reading");
    expect(next.tags.map((tag) => tag.name)).toEqual(["To read", "Reference", "Later"]);
  });

  it("keeps what is already here when merging", () => {
    const next = reduce(initialState(), { type: "cabinet/merge", cabinet: imported });

    expect(findNode(next.library, "note-a")).toBeDefined();
  });

  it("swaps the whole cabinet when replacing", () => {
    const next = reduce(initialState(), { type: "cabinet/replace", cabinet: imported });

    expect(next.library.map((channel) => channel.id)).toEqual(["ch-file", "ch-recipes"]);
    expect(next.tags.map((tag) => tag.name)).toEqual(["Later"]);
  });

  it("carries a still-loading paste across a replace", () => {
    const pasted = reduce(initialState(), {
      type: "note/addPending",
      location: READING_ROOT,
      id: "pending",
      url: "https://example.com/in-flight",
    });

    const next = reduce(pasted, {
      type: "cabinet/replace",
      cabinet: { ...imported, library: [makeChannel("Kept", [], "channel-reading")] },
    });

    expect(findNode(next.library, "pending")).toBeDefined();
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
