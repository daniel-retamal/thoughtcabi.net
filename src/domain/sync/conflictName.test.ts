import { describe, expect, it } from "vitest";
import {
  conflictFileName,
  labelSlug,
  labelledFileName,
  REMOTE_FILE_NAME,
  splitFileName,
} from "./conflictName";

const NOON = Date.UTC(2026, 8, 1, 12, 4, 5);

describe("splitFileName", () => {
  it("splits on the last dot", () => {
    expect(splitFileName("thoughtcabinet.json")).toEqual({
      stem: "thoughtcabinet",
      extension: ".json",
    });
    expect(splitFileName("thoughtcabinet.sync-conflict-1.json")).toEqual({
      stem: "thoughtcabinet.sync-conflict-1",
      extension: ".json",
    });
  });

  it("leaves a name with no extension alone", () => {
    expect(splitFileName("cabinet")).toEqual({ stem: "cabinet", extension: "" });
    expect(splitFileName(".hidden")).toEqual({ stem: ".hidden", extension: "" });
  });
});

describe("labelSlug", () => {
  it("makes a label safe to put in a file name", () => {
    expect(labelSlug("Daniel's MacBook Pro")).toBe("daniel-s-macbook-pro");
    expect(labelSlug("  work laptop  ")).toBe("work-laptop");
  });

  it("caps a long label without leaving a trailing dash", () => {
    expect(labelSlug("a".repeat(64))).toBe("a".repeat(32));
    expect(labelSlug(`${"a".repeat(31)} extra`)).toBe("a".repeat(31));
  });

  it("falls back rather than producing an empty name", () => {
    expect(labelSlug("???")).toBe("device");
    expect(labelSlug("")).toBe("device");
  });
});

describe("labelledFileName", () => {
  it("puts the label in the name and never in the file", () => {
    expect(labelledFileName(REMOTE_FILE_NAME, "Work laptop")).toBe(
      "thoughtcabinet-work-laptop.json",
    );
  });
});

describe("conflictFileName", () => {
  it("stamps the copy with the moment it was written", () => {
    expect(conflictFileName(REMOTE_FILE_NAME, NOON)).toBe(
      "thoughtcabinet-conflict-2026-09-01-12-04-05.json",
    );
  });

  it("keeps whatever extension the destination uses", () => {
    expect(conflictFileName("cabinet.txt", NOON)).toBe("cabinet-conflict-2026-09-01-12-04-05.txt");
  });
});
