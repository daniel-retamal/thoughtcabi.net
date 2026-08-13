import { describe, expect, it } from "vitest";
import { makeFolder, makeLibrary, makeNote, makeShelf, makeTag } from "@/test/factories";
import { eachNode } from "@/domain/library/tree";
import type { Cabinet, NodeId } from "@/domain/model";
import { TAG_PALETTE } from "@/domain/tags/palette";
import { withFreshIds } from "./reidentify";

function counter(): (prefix: string) => NodeId {
  let ordinal = 0;
  return (prefix) => {
    ordinal += 1;
    return `${prefix}-fresh-${ordinal}`;
  };
}

function everyId(cabinet: Cabinet): NodeId[] {
  const ids = cabinet.library.map((shelf) => shelf.id);
  eachNode(cabinet.library, (node) => ids.push(node.id));
  return ids;
}

describe("withFreshIds", () => {
  it("gives every shelf, folder and note an id of its own", () => {
    const before: Cabinet = { library: makeLibrary(), tags: [] };
    const after = withFreshIds(before, counter());

    const ids = everyId(after);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => everyId(before).includes(id))).toEqual([]);
  });

  it("uses the prefix that matches what it is renaming", () => {
    const cabinet: Cabinet = {
      library: [makeShelf("One", [makeFolder("Inner", [makeNote()])])],
      tags: [],
    };
    const after = withFreshIds(cabinet, counter());

    expect(after.library[0]?.id).toBe("ch-fresh-1");
    expect(after.library[0]?.children[0]?.id).toBe("f-fresh-2");
  });

  it("keeps the shape, the content and the tags exactly as they were", () => {
    const cabinet: Cabinet = {
      library: [makeShelf("Reading", [makeFolder("Essays", [makeNote({ title: "Kept" })])])],
      tags: [makeTag("To read", TAG_PALETTE[0])],
    };
    const after = withFreshIds(cabinet, counter());

    expect(after.library[0]?.name).toBe("Reading");
    expect(after.library[0]?.children[0]).toMatchObject({ type: "folder", name: "Essays" });
    expect(after.tags).toEqual(cabinet.tags);
  });

  it("leaves the cabinet it was given untouched", () => {
    const cabinet: Cabinet = { library: makeLibrary(), tags: [] };
    const original = everyId(cabinet);

    withFreshIds(cabinet, counter());

    expect(everyId(cabinet)).toEqual(original);
  });
});
