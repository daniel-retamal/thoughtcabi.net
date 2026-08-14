import { describe, expect, it } from "vitest";
import type { PendingNote } from "@/domain/model";
import { provisionalNote } from "./provisionalNote";

function pending(url: string): PendingNote {
  return { id: "l1", type: "note", url, addedAt: 1_700_000_000_000, loading: true };
}

describe("provisionalNote", () => {
  it("keeps the id and the moment of the paste, so nothing moves when it resolves", () => {
    const note = provisionalNote(pending("https://example.com/a-quiet-revolution"));

    expect(note.id).toBe("l1");
    expect(note.addedAt).toBe(1_700_000_000_000);
  });

  it("knows the domain and the site's icon from the url alone", () => {
    const note = provisionalNote(pending("https://www.youtube.com/watch?v=dQw4w9WgXcQ"));

    expect(note.domain).toBe("youtube.com");
    expect(note.favicon).toBeTruthy();
  });

  it("holds the category open rather than claiming one before the page is read", () => {
    expect(provisionalNote(pending("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).catLabel).toBe(
      "—",
    );
  });

  it("borrows the url's own words for the title slot, uncapitalised", () => {
    expect(provisionalNote(pending("https://example.com/a-quiet-revolution")).title).toBe(
      "a quiet revolution",
    );
  });

  it("falls back to the bare domain when the path says nothing", () => {
    expect(provisionalNote(pending("https://example.com/")).title).toBe("example.com");
  });

  it("invents no description and no picture, because it has none", () => {
    const note = provisionalNote(pending("https://example.com/a-quiet-revolution"));

    expect(note.description).toBe("");
    expect(note.image).toBeUndefined();
    expect(note.siteImage).toBeUndefined();
  });

  it("survives a url it cannot parse", () => {
    const note = provisionalNote(pending("not a url"));

    expect(note.domain).toBe("");
    expect(note.title).toBe("");
  });
});
