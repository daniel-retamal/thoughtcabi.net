import { describe, expect, it } from "vitest";
import { makeNote } from "@/test/factories";
import { buildNote, draftFromNote, hasThumbnail, type NoteDraft } from "./buildNote";

const destination = { channelId: "c", path: [] };

function draft(overrides: Partial<NoteDraft> = {}): NoteDraft {
  return { url: "", title: "", description: "", tag: "", image: "", destination, ...overrides };
}

describe("buildNote", () => {
  it("enriches a note from a recognized link", () => {
    const note = buildNote(draft({ url: "https://www.newyorker.com/books/on-rereading" }));
    expect(note.siteName).toBe("The New Yorker");
    expect(note.catLabel).toBe("Article");
    expect(note.title).toBe("On Rereading");
    expect(note.cover).not.toBeNull();
  });

  it("lets the user's own title and description win", () => {
    const note = buildNote(
      draft({
        url: "https://www.newyorker.com/books/on-rereading",
        title: "My title",
        description: "My note",
      }),
    );
    expect(note.title).toBe("My title");
    expect(note.description).toBe("My note");
  });

  it("builds the same card without a link", () => {
    const note = buildNote(draft({ title: "Just a thought" }));
    expect(note).toMatchObject({
      title: "Just a thought",
      url: "",
      domain: "",
      siteName: "",
      cat: "note",
      catLabel: "",
      cover: null,
    });
  });

  it("keeps an unrecognizable url out of the card", () => {
    const note = buildNote(draft({ url: "not a link", title: "T" }));
    expect(note.url).toBe("");
    expect(note.cover).toBeNull();
  });

  it("attaches a hand-added image only when there is one", () => {
    expect(buildNote(draft({ title: "T", image: "data:image/png;base64,x" })).image).toBe(
      "data:image/png;base64,x",
    );
    expect(buildNote(draft({ title: "T" })).image).toBeUndefined();
  });

  it("preserves identity and timestamp when editing", () => {
    const note = buildNote(draft({ title: "Edited" }), { id: "keep", addedAt: 42 });
    expect(note.id).toBe("keep");
    expect(note.addedAt).toBe(42);
  });

  it("mints an id and timestamp for a new note", () => {
    const note = buildNote(draft({ title: "T" }));
    expect(note.id).toMatch(/^n_/);
    expect(note.addedAt).toBeGreaterThan(0);
  });
});

describe("draftFromNote", () => {
  it("round-trips an existing note into an editable draft", () => {
    const note = makeNote({ title: "T", description: "D", tag: "Later", image: "data:x" });
    expect(draftFromNote(note, destination)).toEqual({
      url: note.url,
      title: "T",
      description: "D",
      tag: "Later",
      image: "data:x",
      destination,
    });
  });

  it("represents a missing image as an empty string", () => {
    expect(draftFromNote(makeNote(), destination).image).toBe("");
  });
});

describe("hasThumbnail", () => {
  it("prefers a hand-added image, then the site cover", () => {
    expect(hasThumbnail(makeNote({ image: "data:x" }))).toBe(true);
    expect(hasThumbnail(makeNote())).toBe(true);
    expect(hasThumbnail(makeNote({ cover: null }))).toBe(false);
    expect(hasThumbnail(makeNote({ url: "" }))).toBe(false);
  });

  it("treats an empty image string as no image", () => {
    expect(hasThumbnail(makeNote({ image: "", url: "", cover: null }))).toBe(false);
    expect(hasThumbnail(makeNote({ image: "" }))).toBe(true);
  });
});
