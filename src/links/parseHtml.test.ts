import { describe, expect, it } from "vitest";
import { pageContentFromHtml } from "./parseHtml";

describe("pageContentFromHtml", () => {
  it("collects meta tags by property or name", () => {
    const page = pageContentFromHtml(`
      <html><head>
        <meta property="og:title" content="A title" />
        <meta name="description" content="A description" />
        <title>Doc title</title>
        <link rel="icon" href="/icon.png" />
      </head><body><p>This is a long enough opening paragraph to count.</p></body></html>
    `);

    expect(page.tags["og:title"]).toBe("A title");
    expect(page.tags.description).toBe("A description");
    expect(page.title).toBe("Doc title");
    expect(page.iconHref).toBe("/icon.png");
    expect(page.firstParagraph).toBe("This is a long enough opening paragraph to count.");
  });

  it("decodes html entities", () => {
    const page = pageContentFromHtml(
      `<meta property="og:title" content="Tom &amp; Jerry &mdash; a &quot;classic&quot;" />`,
    );
    expect(page.tags["og:title"]).toBe('Tom & Jerry — a "classic"');
  });

  it("keeps the first value when a tag repeats", () => {
    const page = pageContentFromHtml(`
      <meta property="og:image" content="https://example.com/first.png" />
      <meta property="og:image" content="https://example.com/second.png" />
    `);
    expect(page.tags["og:image"]).toBe("https://example.com/first.png");
  });

  it("matches meta names case-insensitively", () => {
    expect(pageContentFromHtml(`<meta property="OG:Title" content="X" />`).tags["og:title"]).toBe(
      "X",
    );
  });

  it("skips short paragraphs that are not really the body", () => {
    const page = pageContentFromHtml(
      `<body><p>Skip</p><p>This paragraph is long enough to be the real opening line.</p></body>`,
    );
    expect(page.firstParagraph).toBe("This paragraph is long enough to be the real opening line.");
  });

  it("finds an icon declared as a shortcut icon", () => {
    expect(pageContentFromHtml(`<link rel="shortcut icon" href="/fav.ico" />`).iconHref).toBe(
      "/fav.ico",
    );
  });

  it("prefers the apple touch icon over the favicon", () => {
    const page = pageContentFromHtml(`
      <link rel="stylesheet" href="/app.css" />
      <link rel="icon" href="/favicon.ico" sizes="16x16" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    `);
    expect(page.iconHref).toBe("/apple-touch-icon.png");
  });

  it("takes the largest declared icon when there is no apple touch icon", () => {
    const page = pageContentFromHtml(`
      <link rel="icon" href="/icon-32.png" sizes="32x32" />
      <link rel="icon" href="/icon-192.png" sizes="192x192" />
    `);
    expect(page.iconHref).toBe("/icon-192.png");
  });

  it("returns an empty page rather than throwing on rubbish", () => {
    expect(pageContentFromHtml("")).toEqual({
      tags: {},
      title: "",
      firstParagraph: "",
      iconHref: "",
    });
    expect(pageContentFromHtml("<<<not really html").title).toBe("");
  });

  it("ignores meta tags with no content", () => {
    expect(pageContentFromHtml(`<meta property="og:title" />`).tags["og:title"]).toBeUndefined();
  });
});
