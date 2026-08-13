import { describe, expect, it } from "vitest";
import { makeFolder, makeLibrary, makeShelf } from "@/test/factories";
import { destinationKey, flattenDestinations, sameDestination } from "./destinations";

describe("flattenDestinations", () => {
  it("lists every shelf and folder in reading order with its depth", () => {
    const options = flattenDestinations(makeLibrary());
    expect(options.map((option) => [option.label, option.depth])).toEqual([
      ["Reading", 0],
      ["Essays", 1],
      ["Empty", 1],
      ["Research", 0],
    ]);
  });

  it("descends into nested folders", () => {
    const library = [
      makeShelf("C", [makeFolder("Outer", [makeFolder("Inner", [], "inner")], "outer")], "c"),
    ];
    expect(flattenDestinations(library).map((o) => o.depth)).toEqual([0, 1, 2]);
  });

  it("uses the shelf icon at the top level and a folder icon below", () => {
    const options = flattenDestinations(makeLibrary());
    expect(options[0]?.icon).toBe("hash");
    expect(options[1]?.icon).toBe("folder");
  });
});

describe("destination identity", () => {
  it("compares shelf and path together", () => {
    const a = { shelfId: "c", path: ["x"] };
    expect(sameDestination(a, { shelfId: "c", path: ["x"] })).toBe(true);
    expect(sameDestination(a, { shelfId: "c", path: [] })).toBe(false);
    expect(sameDestination(a, { shelfId: "d", path: ["x"] })).toBe(false);
    expect(sameDestination(a, null)).toBe(false);
  });

  it("builds a stable key", () => {
    expect(destinationKey({ shelfId: "c", path: ["a", "b"] })).toBe("c/a/b");
  });
});
