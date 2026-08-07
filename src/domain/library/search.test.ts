import { describe, expect, it } from "vitest";
import { makeChannel, makeLibrary, makeNote } from "@/test/factories";
import { noteMatches, notesWithTag, searchLibrary } from "./search";

describe("noteMatches", () => {
  const note = makeNote({
    title: "Designing Calm Software",
    description: "On restraint and craft",
    domain: "smashingmagazine.com",
    siteName: "Smashing Magazine",
    catLabel: "Code",
    tag: "Inspiration",
  });

  it("matches across every searchable field", () => {
    expect(noteMatches(note, "calm")).toBe(true);
    expect(noteMatches(note, "restraint")).toBe(true);
    expect(noteMatches(note, "smashingmagazine")).toBe(true);
    expect(noteMatches(note, "magazine")).toBe(true);
    expect(noteMatches(note, "code")).toBe(true);
    expect(noteMatches(note, "inspiration")).toBe(true);
    expect(noteMatches(note, "unrelated")).toBe(false);
  });
});

describe("searchLibrary", () => {
  it("returns notes and folders tagged with their channel", () => {
    const results = searchLibrary(makeLibrary(), "essays");
    expect(results.folders).toHaveLength(1);
    expect(results.folders[0]?.channelId).toBe("channel-reading");
    expect(results.notes).toHaveLength(0);
  });

  it("searches across all channels, case-insensitively", () => {
    const results = searchLibrary(makeLibrary(), "ZETTEL");
    expect(results.notes.map((note) => note.id)).toEqual(["note-c"]);
    expect(results.notes[0]?.channelId).toBe("channel-research");
  });

  it("returns nothing for a blank query", () => {
    expect(searchLibrary(makeLibrary(), "   ")).toEqual({ notes: [], folders: [] });
  });

  it("never matches a pending placeholder", () => {
    const library = [
      makeChannel(
        "C",
        [{ id: "pending", type: "note", url: "https://example.com/x", loading: true }],
        "c",
      ),
    ];
    expect(searchLibrary(library, "undefined").notes).toHaveLength(0);
  });
});

describe("notesWithTag", () => {
  it("collects tagged notes library-wide", () => {
    expect(notesWithTag(makeLibrary(), "To read").map((n) => n.id)).toEqual(["note-a"]);
    expect(notesWithTag(makeLibrary(), "Reference").map((n) => n.id)).toEqual(["note-c"]);
    expect(notesWithTag(makeLibrary(), "Nothing")).toEqual([]);
  });
});
