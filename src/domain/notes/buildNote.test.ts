import { describe, expect, it } from "vitest";
import type { LinkPreview } from "@/domain/links/linkPreview";
import { makeNote } from "@/test/factories";
import {
  buildNote,
  domainOf,
  draftFromNote,
  hasCover,
  hasThumbnail,
  siteIconFor,
  type NoteDraft,
} from "./buildNote";

const destination = { shelfId: "c", path: [] };

function draft(overrides: Partial<NoteDraft> = {}): NoteDraft {
  return { url: "", title: "", description: "", tag: "", image: "", destination, ...overrides };
}

function preview(overrides: Partial<LinkPreview> = {}): LinkPreview {
  return {
    url: "https://www.newyorker.com/books/on-rereading",
    domain: "newyorker.com",
    title: "On Rereading",
    description: "A real description from the page.",
    siteName: "The New Yorker",
    image: "https://newyorker.com/cover.jpg",
    favicon: "https://www.newyorker.com/favicon.ico",
    cat: "article",
    ...overrides,
  };
}

describe("buildNote", () => {
  it("takes its metadata from the preview it was given", () => {
    const note = buildNote(draft({ url: preview().url }), preview());
    expect(note).toMatchObject({
      title: "On Rereading",
      description: "A real description from the page.",
      siteName: "The New Yorker",
      domain: "newyorker.com",
      catLabel: "Article",
      siteImage: "https://newyorker.com/cover.jpg",
    });
  });

  it("lets the user's own title and description win", () => {
    const note = buildNote(
      draft({ url: preview().url, title: "My title", description: "My note" }),
      preview(),
    );
    expect(note.title).toBe("My title");
    expect(note.description).toBe("My note");
  });

  it("invents nothing when the page offered nothing", () => {
    const note = buildNote(
      draft({ url: "https://example.com/some-page" }),
      preview({
        url: "https://example.com/some-page",
        domain: "example.com",
        title: "",
        description: "",
        siteName: "",
        image: "",
        cat: "link",
      }),
    );
    expect(note.description).toBe("");
    expect(note.siteImage).toBeUndefined();
    expect(note.siteName).toBe("");
  });

  it("falls back to the url alone when no preview is available", () => {
    const note = buildNote(draft({ url: "https://example.com/a-long-read" }));
    expect(note).toMatchObject({ domain: "example.com", title: "A Long Read", description: "" });
    expect(note.siteImage).toBeUndefined();
  });

  it("ignores a preview that belongs to a different url", () => {
    const note = buildNote(draft({ url: "https://example.com/other" }), preview());
    expect(note.domain).toBe("example.com");
    expect(note.siteName).toBe("");
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
    });
  });

  it("keeps an unrecognizable url out of the card", () => {
    const note = buildNote(draft({ url: "not a link", title: "T" }));
    expect(note.url).toBe("");
    expect(note.domain).toBe("");
  });

  it("attaches a hand-added image only when there is one", () => {
    expect(buildNote(draft({ title: "T", image: "data:image/png;base64,x" })).image).toBe(
      "data:image/png;base64,x",
    );
    expect(buildNote(draft({ title: "T" })).image).toBeUndefined();
  });

  it("preserves identity and timestamp when editing", () => {
    const note = buildNote(draft({ title: "Edited" }), null, { id: "keep", addedAt: 42 });
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
  it("prefers a hand-added image, then the site's own", () => {
    expect(hasThumbnail(makeNote({ image: "data:x" }))).toBe(true);
    expect(hasThumbnail(makeNote({ siteImage: "https://example.com/og.png" }))).toBe(true);
    expect(hasThumbnail(makeNote())).toBe(false);
  });

  it("treats an empty image string as no image", () => {
    expect(hasThumbnail(makeNote({ image: "" }))).toBe(false);
    expect(hasThumbnail(makeNote({ image: "", siteImage: "https://example.com/og.png" }))).toBe(
      true,
    );
  });
});

describe("siteIconFor", () => {
  it("prefers the icon the page declared", () => {
    expect(siteIconFor(makeNote({ favicon: "https://example.com/apple-touch-icon.png" }))).toBe(
      "https://example.com/apple-touch-icon.png",
    );
  });

  it("derives the origin's favicon for a note saved without one", () => {
    expect(siteIconFor(makeNote({ url: "https://quilt.internal/reports/q3" }))).toBe(
      "https://quilt.internal/favicon.ico",
    );
  });

  it("has nothing to derive for a note with no link", () => {
    expect(siteIconFor(makeNote({ url: "" }))).toBe("");
  });
});

describe("hasCover", () => {
  it("counts a picture or an icon", () => {
    expect(hasCover(makeNote({ siteImage: "https://example.com/og.png" }))).toBe(true);
    expect(hasCover(makeNote())).toBe(true);
  });

  it("is false only when there is neither", () => {
    expect(hasCover(makeNote({ url: "" }))).toBe(false);
  });
});

describe("domainOf", () => {
  it("reads the bare hostname from anything url-shaped", () => {
    expect(domainOf("https://www.example.com/a?b=1")).toBe("example.com");
    expect(domainOf("example.com/a")).toBe("example.com");
    expect(domainOf("not a link")).toBe("");
  });
});
