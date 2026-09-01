import { describe, expect, it } from "vitest";
import { REMOTE_FILE_NAME, conflictFileName, labelledFileName } from "./conflictName";
import { conflictedCopies, isConflictedCopy } from "./conflictedCopy";

const matches = (name: string) => isConflictedCopy(name, REMOTE_FILE_NAME);

describe("isConflictedCopy", () => {
  it("recognises what Dropbox leaves behind", () => {
    expect(matches("thoughtcabinet (Daniel's conflicted copy 2026-09-01).json")).toBe(true);
    expect(matches("thoughtcabinet (DESKTOP-ABC's conflicted copy 2026-09-01).json")).toBe(true);
  });

  it("recognises what Syncthing leaves behind", () => {
    expect(matches("thoughtcabinet.sync-conflict-20260901-120000-K3JD82H.json")).toBe(true);
  });

  it("recognises what Nextcloud leaves behind", () => {
    expect(matches("thoughtcabinet_conflict-2026-09-01_120000.json")).toBe(true);
  });

  it("recognises what iCloud and OneDrive leave behind", () => {
    expect(matches("thoughtcabinet 2.json")).toBe(true);
    expect(matches("thoughtcabinet 11.json")).toBe(true);
  });

  it("does not match the cabinet file itself", () => {
    expect(matches(REMOTE_FILE_NAME)).toBe(false);
  });

  it("does not match another cabinet's stray", () => {
    expect(isConflictedCopy("notes (conflicted copy 2026-09-01).json", REMOTE_FILE_NAME)).toBe(
      false,
    );
  });

  it("does not match a file with a different extension", () => {
    expect(matches("thoughtcabinet 2.txt")).toBe(false);
    expect(matches("thoughtcabinet.json.bak")).toBe(false);
  });

  it("does not match this app's own device-labelled mirror", () => {
    expect(matches(labelledFileName(REMOTE_FILE_NAME, "DESKTOP-ABC"))).toBe(false);
    expect(matches("thoughtcabinet-laptop.json")).toBe(false);
  });

  it("does not match this app's own conflict sibling", () => {
    expect(matches(conflictFileName(REMOTE_FILE_NAME, Date.UTC(2026, 8, 1)))).toBe(false);
  });

  it("does not match an export or a download duplicate", () => {
    expect(matches("thoughtcabinet-2026-09-01.json")).toBe(false);
    expect(matches("thoughtcabinet (1).json")).toBe(false);
  });

  it("ignores the case a filesystem is free to change", () => {
    expect(matches("ThoughtCabinet 2.JSON")).toBe(true);
  });
});

describe("conflictedCopies", () => {
  it("picks the strays out of a directory listing", () => {
    const listing = [
      REMOTE_FILE_NAME,
      "thoughtcabinet 2.json",
      "thoughtcabinet.sync-conflict-20260901-120000-K3JD82H.json",
      "unrelated.json",
      "photo.png",
    ];
    expect(conflictedCopies(listing, REMOTE_FILE_NAME)).toEqual([
      "thoughtcabinet 2.json",
      "thoughtcabinet.sync-conflict-20260901-120000-K3JD82H.json",
    ]);
  });

  it("finds nothing in a tidy folder", () => {
    expect(conflictedCopies([REMOTE_FILE_NAME], REMOTE_FILE_NAME)).toEqual([]);
  });
});
