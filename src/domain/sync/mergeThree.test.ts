import { describe, expect, it } from "vitest";
import { collectNotes, findFolder, findNode, isCabinetEmpty } from "@/domain/library/tree";
import { isFolder, isNote, type Cabinet, type LibraryNode, type NodeId } from "@/domain/model";
import { TAG_PALETTE } from "@/domain/tags/palette";
import { withFreshIds } from "@/domain/transfer/reidentify";
import { makeFolder, makeNote, makeShelf, makeTag } from "@/test/factories";
import { cabinetDigest } from "./digest";
import { mergeThree, type MergeOptions, type MergeResult } from "./mergeThree";

const [RED, AMBER, YELLOW] = TAG_PALETTE;
const CONFLICTS = "Conflicts";

function options(): MergeOptions {
  let ordinal = 0;
  return {
    conflictsFolder: CONFLICTS,
    createId: (prefix) => {
      ordinal += 1;
      return `${prefix}_fresh_${ordinal}`;
    },
  };
}

function merge(base: Cabinet, local: Cabinet, remote: Cabinet): MergeResult {
  return mergeThree(base, local, remote, options());
}

function cabinet(children: LibraryNode[], tags = [makeTag("To read", RED)]): Cabinet {
  return { library: [makeShelf("Reading", children, "ch1")], tags };
}

function idsIn(result: MergeResult): NodeId[] {
  const ids: NodeId[] = [];
  const walk = (nodes: readonly LibraryNode[]): void => {
    for (const node of nodes) {
      ids.push(node.id);
      if (isFolder(node)) walk(node.children);
    }
  };
  for (const shelf of result.cabinet.library) walk(shelf.children);
  return ids;
}

function titles(result: MergeResult): string[] {
  return result.cabinet.library
    .flatMap((shelf) => collectNotes(shelf))
    .map((note) => note.title)
    .sort();
}

describe("mergeThree, the §7.5 table", () => {
  it("keeps a node neither side touched", () => {
    const note = makeNote({ id: "n1", title: "Kept" });
    const result = merge(cabinet([note]), cabinet([note]), cabinet([note]));
    expect(titles(result)).toEqual(["Kept"]);
  });

  it("takes the local version when only this machine edited it", () => {
    const note = makeNote({ id: "n1", title: "Before" });
    const result = merge(cabinet([note]), cabinet([{ ...note, title: "Mine" }]), cabinet([note]));
    expect(titles(result)).toEqual(["Mine"]);
  });

  it("takes the remote version when only the other machine edited it", () => {
    const note = makeNote({ id: "n1", title: "Before" });
    const result = merge(cabinet([note]), cabinet([note]), cabinet([{ ...note, title: "Theirs" }]));
    expect(titles(result)).toEqual(["Theirs"]);
  });

  it("keeps one copy when both machines made the same edit", () => {
    const note = makeNote({ id: "n1", title: "Before" });
    const edited = { ...note, title: "Same" };
    const result = merge(cabinet([note]), cabinet([edited]), cabinet([edited]));
    expect(titles(result)).toEqual(["Same"]);
    expect(result.report.parked).toHaveLength(0);
  });

  it("deletes a node one machine removed and the other left alone", () => {
    const note = makeNote({ id: "n1", title: "Gone" });
    expect(titles(merge(cabinet([note]), cabinet([note]), cabinet([])))).toEqual([]);
    expect(titles(merge(cabinet([note]), cabinet([]), cabinet([note])))).toEqual([]);
  });

  it("lets an edit beat a deletion, whichever side deleted", () => {
    const note = makeNote({ id: "n1", title: "Before" });
    const edited = { ...note, title: "Edited" };
    expect(titles(merge(cabinet([note]), cabinet([edited]), cabinet([])))).toEqual(["Edited"]);
    expect(titles(merge(cabinet([note]), cabinet([]), cabinet([edited])))).toEqual(["Edited"]);
  });

  it("keeps two different cards saved on the two machines, and duplicates neither", () => {
    const shared = makeNote({ id: "n1", title: "Shared" });
    const result = merge(
      cabinet([shared]),
      cabinet([shared, makeNote({ id: "n-mine", title: "Mine" })]),
      cabinet([shared, makeNote({ id: "n-theirs", title: "Theirs" })]),
    );
    expect(titles(result)).toEqual(["Mine", "Shared", "Theirs"]);
    expect(idsIn(result)).toHaveLength(3);
  });
});

describe("mergeThree, parking", () => {
  it("gives the remote the id and parks the local version with a fresh one", () => {
    const note = makeNote({ id: "n1", title: "Before" });
    const result = merge(
      cabinet([note]),
      cabinet([{ ...note, title: "Mine" }]),
      cabinet([{ ...note, title: "Theirs" }]),
    );

    expect(findNode(result.cabinet.library, "n1")).toMatchObject({ title: "Theirs" });
    expect(result.report.parked).toHaveLength(1);

    const parkedId = result.report.parked[0] as NodeId;
    expect(parkedId).not.toBe("n1");
    expect(findNode(result.cabinet.library, parkedId)).toMatchObject({ title: "Mine" });
  });

  it("puts the parked copy in a Conflicts folder in the shelf it lived in", () => {
    const note = makeNote({ id: "n1", title: "Before" });
    const result = merge(
      cabinet([note]),
      cabinet([{ ...note, title: "Mine" }]),
      cabinet([{ ...note, title: "Theirs" }]),
    );

    const shelf = result.cabinet.library[0];
    const folder = shelf?.children.find((child) => isFolder(child) && child.name === CONFLICTS);
    expect(folder).toBeDefined();
    expect(collectNotes(folder as never).map((note) => note.title)).toEqual(["Mine"]);
  });

  it("reuses a Conflicts folder that is already there", () => {
    const one = makeNote({ id: "n1", title: "Before one" });
    const two = makeNote({ id: "n2", title: "Before two" });
    const existing = makeFolder(
      CONFLICTS,
      [makeNote({ id: "old", title: "Older" })],
      "f-conflicts",
    );

    const result = merge(
      cabinet([one, two, existing]),
      cabinet([{ ...one, title: "Mine one" }, { ...two, title: "Mine two" }, existing]),
      cabinet([{ ...one, title: "Theirs one" }, { ...two, title: "Theirs two" }, existing]),
    );

    const folders = result.cabinet.library[0]?.children.filter(
      (child) => isFolder(child) && child.name === CONFLICTS,
    );
    expect(folders).toHaveLength(1);
    expect(collectNotes(findFolder(result.cabinet.library, "f-conflicts") as never)).toHaveLength(
      3,
    );
  });

  it("never parks a folder, whose only field is its name", () => {
    const folder = makeFolder("Before", [], "f1");
    const result = merge(
      cabinet([folder]),
      cabinet([{ ...folder, name: "Mine" }]),
      cabinet([{ ...folder, name: "Theirs" }]),
    );

    expect(result.report.parked).toHaveLength(0);
    expect(findFolder(result.cabinet.library, "f1")?.name).toBe("Theirs");
  });
});

describe("mergeThree, placement", () => {
  it("does not read a move as an edit", () => {
    const note = makeNote({ id: "n1", title: "Moved" });
    const folder = makeFolder("Essays", [], "f1");

    const result = merge(
      cabinet([folder, note]),
      cabinet([makeFolder("Essays", [note], "f1")]),
      cabinet([folder, { ...note, title: "Retitled" }]),
    );

    expect(findFolder(result.cabinet.library, "f1")?.children.map((child) => child.id)).toEqual([
      "n1",
    ]);
    expect(titles(result)).toEqual(["Retitled"]);
  });

  it("does not read a folder rename as an edit of everything inside it", () => {
    const note = makeNote({ id: "n1", title: "Inside" });
    const result = merge(
      cabinet([makeFolder("Essays", [note], "f1")]),
      cabinet([makeFolder("Long reads", [note], "f1")]),
      cabinet([makeFolder("Essays", [note], "f1")]),
    );

    expect(findFolder(result.cabinet.library, "f1")?.name).toBe("Long reads");
    expect(titles(result)).toEqual(["Inside"]);
  });

  it("rehomes a card whose folder the other machine deleted", () => {
    const note = makeNote({ id: "n1", title: "Orphan" });
    const result = merge(
      cabinet([makeFolder("Essays", [note], "f1")]),
      cabinet([makeFolder("Essays", [{ ...note, title: "Edited" }], "f1")]),
      cabinet([]),
    );

    expect(findFolder(result.cabinet.library, "f1")).toBeUndefined();
    expect(result.cabinet.library[0]?.children.map((child) => child.id)).toEqual(["n1"]);
  });

  it("keeps the local order of a card the remote has never seen", () => {
    const one = makeNote({ id: "n1", title: "One" });
    const two = makeNote({ id: "n2", title: "Two" });
    const three = makeNote({ id: "n3", title: "Three" });

    const result = merge(cabinet([one, three]), cabinet([one, two, three]), cabinet([one, three]));

    expect(idsIn(result)).toEqual(["n1", "n2", "n3"]);
  });

  it("survives two machines moving folders into each other", () => {
    const outer = makeFolder("Outer", [], "f1");
    const inner = makeFolder("Inner", [], "f2");

    const result = merge(
      cabinet([outer, inner]),
      cabinet([makeFolder("Outer", [inner], "f1")]),
      cabinet([makeFolder("Inner", [outer], "f2")]),
    );

    expect(idsIn(result).sort()).toEqual(["f1", "f2"]);
  });
});

describe("mergeThree, tags", () => {
  it("keeps the label on cards from the other machine when a tag was renamed here", () => {
    const mine = makeNote({ id: "n-mine", title: "Mine", tag: "Later" });
    const theirs = makeNote({ id: "n-theirs", title: "Theirs", tag: "To read" });

    const result = merge(
      cabinet([], [makeTag("To read", RED)]),
      { library: [makeShelf("Reading", [mine], "ch1")], tags: [makeTag("Later", RED)] },
      { library: [makeShelf("Reading", [theirs], "ch1")], tags: [makeTag("To read", RED)] },
    );

    expect(result.cabinet.tags).toEqual([makeTag("Later", RED)]);
    const labels = result.cabinet.library[0]?.children.map((child) =>
      isNote(child) ? child.tag : "",
    );
    expect(labels).toEqual(["Later", "Later"]);
  });

  it("adds a tag one machine created", () => {
    const result = merge(
      cabinet([], [makeTag("To read", RED)]),
      cabinet([], [makeTag("To read", RED), makeTag("Recipes", AMBER)]),
      cabinet([], [makeTag("To read", RED)]),
    );
    expect(result.cabinet.tags).toEqual([makeTag("To read", RED), makeTag("Recipes", AMBER)]);
  });

  it("removes a tag one machine deleted and clears the label it left behind", () => {
    const note = makeNote({ id: "n1", title: "Was tagged", tag: "To read" });
    const result = merge(
      cabinet([note], [makeTag("To read", RED)]),
      cabinet([note], [makeTag("To read", RED)]),
      cabinet([note], []),
    );

    expect(result.cabinet.tags).toEqual([]);
    expect(findNode(result.cabinet.library, "n1")).toMatchObject({ tag: "" });
  });

  it("takes the remote name when both machines made a tag on the same colour", () => {
    const result = merge(
      cabinet([], []),
      cabinet([], [makeTag("Mine", RED)]),
      cabinet([], [makeTag("Theirs", RED)]),
    );
    expect(result.cabinet.tags).toEqual([makeTag("Theirs", RED)]);
  });

  it("takes the remote name when both machines renamed the same colour", () => {
    const result = merge(
      cabinet([], [makeTag("To read", RED)]),
      cabinet([], [makeTag("Mine", RED)]),
      cabinet([], [makeTag("Theirs", RED)]),
    );
    expect(result.cabinet.tags).toEqual([makeTag("Theirs", RED)]);
  });

  it("treats colour as the identity, so a recolour is a move and not a fork", () => {
    const result = merge(
      cabinet([], [makeTag("To read", RED)]),
      cabinet([], [makeTag("To read", YELLOW)]),
      cabinet([], [makeTag("To read", RED)]),
    );
    expect(result.cabinet.tags).toEqual([makeTag("To read", YELLOW)]);
  });
});

describe("mergeThree, the rules that must not break", () => {
  it("never changes an id, which is §5.1 and the whole feature", () => {
    const note = makeNote({ id: "n1", title: "Before" });
    const before = cabinet([makeFolder("Essays", [note], "f1")]);
    const after = cabinet([makeFolder("Essays", [{ ...note, title: "Theirs" }], "f1")]);

    const result = merge(before, before, after);

    expect(idsIn(result)).toEqual(["f1", "n1"]);
    expect(result.cabinet.library.map((shelf) => shelf.id)).toEqual(["ch1"]);
    expect(result.report.parked).toHaveLength(0);
  });

  it("is not withFreshIds, which is the mistake §5.1 exists to forbid", () => {
    const before = cabinet([makeFolder("Essays", [makeNote({ id: "n1" })], "f1")]);
    const reidentified = withFreshIds(before, (prefix) => `${prefix}_fresh`);

    expect(idsIn(merge(before, before, before))).toEqual(["f1", "n1"]);
    expect(idsIn({ cabinet: reidentified, report: merge(before, before, before).report })).toEqual([
      "f_fresh",
      "n_fresh",
    ]);
  });

  it("is stable, so running it twice on settled inputs changes nothing", () => {
    const one = makeNote({ id: "n1", title: "One" });
    const two = makeNote({ id: "n2", title: "Two" });
    const settled = cabinet([makeFolder("Essays", [one], "f1"), two]);

    const once = merge(settled, settled, settled);
    const twice = merge(settled, once.cabinet, once.cabinet);

    expect(cabinetDigest(once.cabinet)).toBe(cabinetDigest(settled));
    expect(cabinetDigest(twice.cabinet)).toBe(cabinetDigest(settled));
    expect(twice.report).toMatchObject({ added: [], updated: [], deleted: 0, parked: [] });
  });

  it("does not resurrect what was deleted while a machine was away", () => {
    const stale = cabinet([
      makeNote({ id: "n1", title: "Old" }),
      makeNote({ id: "n2", title: "Also old" }),
    ]);
    const away = stale;
    const moved = cabinet([makeNote({ id: "n2", title: "Also old" })]);

    expect(titles(merge(stale, away, moved))).toEqual(["Also old"]);
  });

  it("never returns an empty library", () => {
    const result = merge(
      { library: [makeShelf("Reading", [], "ch1")], tags: [] },
      { library: [makeShelf("Reading", [], "ch1")], tags: [] },
      { library: [makeShelf("Reading", [], "ch1")], tags: [] },
    );
    expect(result.cabinet.library.length).toBeGreaterThan(0);
    expect(isCabinetEmpty(result.cabinet.library)).toBe(true);
  });

  it("merges shelves by id and adds one the other machine made", () => {
    const base: Cabinet = { library: [makeShelf("Reading", [], "ch1")], tags: [] };
    const result = merge(base, base, {
      library: [makeShelf("Reading", [], "ch1"), makeShelf("Recipes", [], "ch2")],
      tags: [],
    });
    expect(result.cabinet.library.map((shelf) => shelf.id)).toEqual(["ch1", "ch2"]);
  });

  it("settles the seed shelf's name the ordinary way when two machines speak different languages", () => {
    const base: Cabinet = { library: [makeShelf("Saved", [], "ch1")], tags: [] };
    const result = merge(base, base, {
      library: [makeShelf("Guardados", [], "ch1")],
      tags: [],
    });
    expect(result.cabinet.library[0]?.name).toBe("Guardados");
  });

  it("reports what arrived so a pulled card can land with the same pop as a saved one", () => {
    const shared = makeNote({ id: "n1", title: "Shared" });
    const result = merge(
      cabinet([shared]),
      cabinet([shared]),
      cabinet([{ ...shared, title: "Retitled" }, makeNote({ id: "n2", title: "New" })]),
    );

    expect(result.report.added).toEqual(["n2"]);
    expect(result.report.updated).toEqual(["n1"]);
    expect(result.report.deleted).toBe(0);
  });

  it("counts what the merge removed from this machine", () => {
    const one = makeNote({ id: "n1", title: "One" });
    const two = makeNote({ id: "n2", title: "Two" });
    const result = merge(cabinet([one, two]), cabinet([one, two]), cabinet([one]));
    expect(result.report.deleted).toBe(1);
  });
});
