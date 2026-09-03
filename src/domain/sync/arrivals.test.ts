import { describe, expect, it } from "vitest";
import type { Cabinet, LibraryNode } from "@/domain/model";
import { makeFolder, makeNote, makePendingNote, makeShelf } from "@/test/factories";
import { arrivals, arrivedIds } from "./arrivals";

function cabinet(children: LibraryNode[]): Cabinet {
  return { library: [makeShelf("Reading", children, "ch1")], tags: [] };
}

describe("arrivals", () => {
  it("names what is new", () => {
    const before = cabinet([makeNote({ id: "n1" })]);
    const after = cabinet([makeNote({ id: "n1" }), makeNote({ id: "n2" })]);
    expect(arrivals(before, after)).toEqual({ added: ["n2"], updated: [] });
  });

  it("names what changed", () => {
    const before = cabinet([makeNote({ id: "n1", title: "Before" })]);
    const after = cabinet([makeNote({ id: "n1", title: "After" })]);
    expect(arrivals(before, after)).toEqual({ added: [], updated: ["n1"] });
  });

  it("says nothing about what was removed", () => {
    const before = cabinet([makeNote({ id: "n1" }), makeNote({ id: "n2" })]);
    const after = cabinet([makeNote({ id: "n1" })]);
    expect(arrivedIds(arrivals(before, after))).toEqual([]);
  });

  it("sees into folders", () => {
    const before = cabinet([makeFolder("Essays", [], "f1")]);
    const after = cabinet([makeFolder("Essays", [makeNote({ id: "n1" })], "f1")]);
    expect(arrivals(before, after)).toEqual({ added: ["n1"], updated: [] });
  });

  it("does not call a move an arrival", () => {
    const note = makeNote({ id: "n1" });
    const before = cabinet([makeFolder("Essays", [note], "f1")]);
    const after = cabinet([makeFolder("Essays", [], "f1"), note]);
    expect(arrivedIds(arrivals(before, after))).toEqual([]);
  });

  it("ignores a pending note on either side", () => {
    const before = cabinet([makePendingNote({ id: "p1" })]);
    const after = cabinet([makePendingNote({ id: "p1" }), makeNote({ id: "n1" })]);
    expect(arrivals(before, after)).toEqual({ added: ["n1"], updated: [] });
  });

  it("is silent when a pull brought nothing", () => {
    const same = cabinet([makeNote({ id: "n1" })]);
    expect(arrivedIds(arrivals(same, same))).toEqual([]);
  });
});
