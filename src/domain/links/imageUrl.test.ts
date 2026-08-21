import { describe, expect, it } from "vitest";
import { imageUrlFrom } from "./imageUrl";

describe("imageUrlFrom", () => {
  it("recognises a picture by the file it points at", () => {
    expect(imageUrlFrom("https://example.com/photo.jpg")).toBe("https://example.com/photo.jpg");
    expect(imageUrlFrom("  https://example.com/a/b/shot.PNG  ")).toBe(
      "https://example.com/a/b/shot.PNG",
    );
    expect(imageUrlFrom("https://example.com/art.avif")).toBe("https://example.com/art.avif");
  });

  it("takes a data URL as it stands", () => {
    expect(imageUrlFrom("data:image/webp;base64,abc")).toBe("data:image/webp;base64,abc");
  });

  it("ignores a query string when reading the extension", () => {
    expect(imageUrlFrom("https://example.com/photo.jpg?w=800&utm_source=x")).toBe(
      "https://example.com/photo.jpg?w=800",
    );
  });

  it("leaves an ordinary page alone, so pasting a link still saves a card", () => {
    expect(imageUrlFrom("https://example.com/an-article")).toBeNull();
    expect(imageUrlFrom("https://youtube.com/watch?v=abc")).toBeNull();
    expect(imageUrlFrom("just some text")).toBeNull();
    expect(imageUrlFrom("")).toBeNull();
    expect(imageUrlFrom(null)).toBeNull();
  });
});
