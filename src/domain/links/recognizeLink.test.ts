import { describe, expect, it } from "vitest";
import { isRecognizableLink, normalizeUrl, recognizeLink, titleFromPath } from "./recognizeLink";

describe("normalizeUrl", () => {
  it("keeps absolute urls untouched", () => {
    expect(normalizeUrl("https://example.com/x")).toBe("https://example.com/x");
    expect(normalizeUrl("  http://example.com  ")).toBe("http://example.com");
  });

  it("upgrades a bare domain to https", () => {
    expect(normalizeUrl("github.com/foo")).toBe("https://github.com/foo");
  });

  it("rejects anything that is not a link", () => {
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("just some pasted prose")).toBeNull();
    expect(normalizeUrl("not-a-domain")).toBeNull();
  });
});

describe("titleFromPath", () => {
  it("turns a slug into a title", () => {
    expect(titleFromPath("/culture/the-art-of-doing-nothing")).toBe("The Art Of Doing Nothing");
  });

  it("strips file extensions and long id runs", () => {
    expect(titleFromPath("/posts/hello-world.html")).toBe("Hello World");
    expect(titleFromPath("/p/launch-20240115123456")).toBe("Launch");
  });

  it("declines generic and numeric segments", () => {
    expect(titleFromPath("/watch")).toBe("");
    expect(titleFromPath("/abs/2604")).toBe("");
    expect(titleFromPath("/a")).toBe("");
    expect(titleFromPath("")).toBe("");
  });

  it("survives malformed percent-encoding", () => {
    expect(() => titleFromPath("/100%-cotton")).not.toThrow();
  });
});

describe("recognizeLink", () => {
  it("recognizes a catalogued site", () => {
    const result = recognizeLink("https://www.newyorker.com/books/on-rereading");
    expect(result).not.toBeNull();
    expect(result?.siteName).toBe("The New Yorker");
    expect(result?.domain).toBe("newyorker.com");
    expect(result?.catLabel).toBe("Article");
    expect(result?.title).toBe("On Rereading");
  });

  it("falls back to the site's own title pool for generic paths", () => {
    const result = recognizeLink("https://www.youtube.com/watch?v=abc");
    expect(result?.cat).toBe("video");
    expect(result?.title.length).toBeGreaterThan(0);
  });

  it("resolves subdomains to their base site", () => {
    const result = recognizeLink(
      "https://everything.substack.com/p/things-i-changed-my-mind-about",
    );
    expect(result?.siteName).toBe("Substack");
  });

  it("still produces a believable card for unknown hosts", () => {
    const result = recognizeLink("https://some-unknown-blog.dev/an-essay-worth-keeping");
    expect(result?.cat).toBe("link");
    expect(result?.siteName).toBe("some-unknown-blog.dev");
    expect(result?.title).toBe("An Essay Worth Keeping");
    expect(result?.cover.color).toMatch(/^hsl\(/);
  });

  it("names an unknown host when the path carries no title", () => {
    const result = recognizeLink("https://cool-tools.io/");
    expect(result?.title).toBe("Cool-tools — saved link");
  });

  it("is deterministic for the same url", () => {
    const url = "https://arxiv.org/abs/2604.01821";
    expect(recognizeLink(url)).toEqual(recognizeLink(url));
  });

  it("returns null for non-links", () => {
    expect(recognizeLink("hello there")).toBeNull();
    expect(recognizeLink(null)).toBeNull();
    expect(recognizeLink(undefined)).toBeNull();
    expect(isRecognizableLink("https://github.com/x")).toBe(true);
    expect(isRecognizableLink("nope")).toBe(false);
  });

  it("keeps the cover pattern inside the available set", () => {
    for (const host of ["a.com", "b.org", "c.net", "d.io", "e.dev"]) {
      const cover = recognizeLink(`https://${host}/page-one`)?.cover;
      expect(cover?.pattern).toBeGreaterThanOrEqual(0);
      expect(cover?.pattern).toBeLessThan(4);
    }
  });
});
