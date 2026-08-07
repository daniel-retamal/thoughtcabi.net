import { describe, expect, it } from "vitest";
import { makeChannel, makeFolder, makeLibrary } from "@/test/factories";
import { destinationKey, flattenDestinations, sameDestination } from "./destinations";

describe("flattenDestinations", () => {
  it("lists every channel and folder in reading order with its depth", () => {
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
      makeChannel("C", [makeFolder("Outer", [makeFolder("Inner", [], "inner")], "outer")], "c"),
    ];
    expect(flattenDestinations(library).map((o) => o.depth)).toEqual([0, 1, 2]);
  });

  it("uses the channel icon at the top level and a folder icon below", () => {
    const options = flattenDestinations(makeLibrary());
    expect(options[0]?.icon).toBe("hash");
    expect(options[1]?.icon).toBe("folder");
  });
});

describe("destination identity", () => {
  it("compares channel and path together", () => {
    const a = { channelId: "c", path: ["x"] };
    expect(sameDestination(a, { channelId: "c", path: ["x"] })).toBe(true);
    expect(sameDestination(a, { channelId: "c", path: [] })).toBe(false);
    expect(sameDestination(a, { channelId: "d", path: ["x"] })).toBe(false);
    expect(sameDestination(a, null)).toBe(false);
  });

  it("builds a stable key", () => {
    expect(destinationKey({ channelId: "c", path: ["a", "b"] })).toBe("c/a/b");
  });
});
