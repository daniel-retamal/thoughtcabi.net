import { describe, expect, it } from "vitest";
import { makeChannel, makeFolder, makeLibrary, makeNote, makeTag } from "@/test/factories";
import type { PendingNote } from "@/domain/model";
import { TAG_PALETTE } from "@/domain/tags/palette";
import { summarizeCabinet } from "./cabinetSummary";

describe("summarizeCabinet", () => {
  it("counts channels, folders, notes and tags across the whole tree", () => {
    const summary = summarizeCabinet(makeLibrary(), [makeTag("To read", TAG_PALETTE[0])]);

    expect(summary).toEqual({ channels: 2, folders: 2, notes: 4, tags: 1 });
  });

  it("counts a folder nested inside another folder", () => {
    const library = [
      makeChannel("Deep", [makeFolder("Outer", [makeFolder("Inner", [makeNote()])])]),
    ];

    expect(summarizeCabinet(library, [])).toMatchObject({ folders: 2, notes: 1 });
  });

  it("ignores a link that is still being read", () => {
    const pending: PendingNote = { id: "p", type: "note", url: "https://a.com", loading: true };
    const library = [makeChannel("Inbox", [makeNote(), pending])];

    expect(summarizeCabinet(library, [])).toMatchObject({ notes: 1 });
  });
});
