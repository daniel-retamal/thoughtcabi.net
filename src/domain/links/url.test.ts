import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  canonicalUrl,
  faviconUrl,
  hostnameOf,
  normalizeUrl,
  parseUrl,
  titleFromPath,
  wordsFromPath,
} from "./url";

describe("normalizeUrl", () => {
  it("keeps absolute urls as they are", () => {
    expect(normalizeUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(normalizeUrl("  http://example.com  ")).toBe("http://example.com");
  });

  it("promotes a bare domain to https", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
    expect(normalizeUrl("news.ycombinator.com/item?id=1")).toBe(
      "https://news.ycombinator.com/item?id=1",
    );
  });

  it("refuses anything that is not url-shaped", () => {
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("   ")).toBeNull();
    expect(normalizeUrl("just a thought")).toBeNull();
    expect(normalizeUrl("a sentence with example.com inside")).toBeNull();
  });
});

describe("parseUrl", () => {
  it("returns null rather than throwing on nonsense", () => {
    expect(parseUrl(null)).toBeNull();
    expect(parseUrl(undefined)).toBeNull();
    expect(parseUrl("http://")).toBeNull();
  });
});

describe("hostnameOf", () => {
  it("drops www and lowercases", () => {
    expect(hostnameOf(new URL("https://WWW.Example.COM/a"))).toBe("example.com");
    expect(hostnameOf(new URL("https://m.youtube.com/watch"))).toBe("m.youtube.com");
  });
});

describe("canonicalUrl", () => {
  it("strips tracking parameters but keeps meaningful ones", () => {
    expect(canonicalUrl("https://example.com/a?utm_source=x&id=7&fbclid=abc")).toBe(
      "https://example.com/a?id=7",
    );
    expect(canonicalUrl("https://youtu.be/dQw4w9WgXcQ?si=abc")).toBe(
      "https://youtu.be/dQw4w9WgXcQ",
    );
  });

  it("leaves a clean url untouched", () => {
    expect(canonicalUrl("https://example.com/a?id=7")).toBe("https://example.com/a?id=7");
  });
});

describe("wordsFromPath", () => {
  it("hands back the segment's own words, capitalising nothing", () => {
    expect(wordsFromPath("/books/on-rereading")).toBe("on rereading");
    expect(wordsFromPath("/2026/the_quiet_revolution")).toBe("the quiet revolution");
  });

  it("gives nothing back when the path carries no meaning", () => {
    expect(wordsFromPath("/")).toBe("");
    expect(wordsFromPath("/watch")).toBe("");
  });
});

describe("titleFromPath", () => {
  it("turns a slug into a readable title", () => {
    expect(titleFromPath("/books/on-rereading")).toBe("On Rereading");
    expect(titleFromPath("/2026/the_quiet_revolution")).toBe("The Quiet Revolution");
    expect(titleFromPath("/a-complete-guide-to-css-grid.html")).toBe(
      "A Complete Guide To Css Grid",
    );
  });

  it("gives nothing back when the path carries no meaning", () => {
    expect(titleFromPath("/")).toBe("");
    expect(titleFromPath("/watch")).toBe("");
    expect(titleFromPath("/12345678")).toBe("");
    expect(titleFromPath("/ab")).toBe("");
  });
});

describe("absoluteUrl", () => {
  it("resolves a relative image against the page it came from", () => {
    expect(absoluteUrl("https://example.com/posts/a", "/og.png")).toBe(
      "https://example.com/og.png",
    );
    expect(absoluteUrl("https://example.com/posts/a", "../cover.jpg")).toBe(
      "https://example.com/cover.jpg",
    );
    expect(absoluteUrl("https://example.com/a", "https://cdn.example.net/x.png")).toBe(
      "https://cdn.example.net/x.png",
    );
  });

  it("returns nothing for an unusable href", () => {
    expect(absoluteUrl("https://example.com", "")).toBe("");
    expect(absoluteUrl("not a base", "/x.png")).toBe("");
  });
});

describe("faviconUrl", () => {
  it("points at the origin's own icon", () => {
    expect(faviconUrl(new URL("https://example.com/deep/page?a=1"))).toBe(
      "https://example.com/favicon.ico",
    );
  });
});
