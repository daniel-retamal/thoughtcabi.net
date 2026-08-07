import { describe, expect, it } from "vitest";
import { makeNote } from "@/test/factories";
import {
  emptyPreview,
  mergePreview,
  previewFromNote,
  previewToNote,
  type LinkPreview,
} from "./linkPreview";

function preview(overrides: Partial<LinkPreview> = {}): LinkPreview {
  return { ...emptyPreview("https://example.com/a", "example.com"), ...overrides };
}

describe("mergePreview", () => {
  it("keeps what the resolver found and fills only the gaps", () => {
    const merged = mergePreview(preview({ title: "Real title" }), {
      title: "Fallback title",
      description: "Fallback description",
    });
    expect(merged.title).toBe("Real title");
    expect(merged.description).toBe("Fallback description");
  });

  it("does not fabricate a category when the patch has none either", () => {
    expect(mergePreview(preview(), {}).cat).toBe("link");
  });

  it("lets a patch category through only when nothing better is known", () => {
    expect(mergePreview(preview({ cat: "video" }), { cat: "article" }).cat).toBe("video");
    expect(mergePreview(preview({ cat: "link" }), { cat: "article" }).cat).toBe("article");
  });

  it("trims whitespace it inherits", () => {
    expect(mergePreview(preview(), { title: "  Padded  " }).title).toBe("Padded");
  });
});

describe("previewToNote", () => {
  it("labels the category and carries the identity through", () => {
    const note = previewToNote(preview({ cat: "video", title: "T" }), { id: "n1", addedAt: 42 });
    expect(note).toMatchObject({ id: "n1", addedAt: 42, cat: "video", catLabel: "Video", tag: "" });
  });

  it("omits the site image and favicon entirely when there are none", () => {
    const note = previewToNote(preview(), { id: "n1", addedAt: 1 });
    expect(note).not.toHaveProperty("siteImage");
    expect(note).not.toHaveProperty("favicon");
  });

  it("stores the site's image separately from any hand-added one", () => {
    const note = previewToNote(preview({ image: "https://example.com/og.png" }), {
      id: "n1",
      addedAt: 1,
    });
    expect(note.siteImage).toBe("https://example.com/og.png");
    expect(note.image).toBeUndefined();
  });
});

describe("previewFromNote", () => {
  it("round-trips a saved note back into a preview", () => {
    const note = makeNote({ siteImage: "https://example.com/og.png", favicon: "https://f.ico" });
    expect(previewFromNote(note)).toMatchObject({
      url: note.url,
      domain: note.domain,
      image: "https://example.com/og.png",
      favicon: "https://f.ico",
    });
  });

  it("represents a missing site image as an empty string", () => {
    expect(previewFromNote(makeNote()).image).toBe("");
  });
});
