import { describe, expect, it } from "vitest";
import { emptyPage, previewFromPage, type PageContent } from "./metaTags";

const url = new URL("https://example.com/posts/the-quiet-revolution");

function page(overrides: Partial<PageContent> = {}): PageContent {
  return { ...emptyPage(), ...overrides };
}

describe("previewFromPage", () => {
  it("prefers open graph over everything else", () => {
    const preview = previewFromPage(
      page({
        tags: {
          "og:title": "OG title",
          "twitter:title": "Twitter title",
          "og:description": "OG description",
          "twitter:description": "Twitter description",
          description: "Meta description",
          "og:image": "https://example.com/og.png",
          "twitter:image": "https://example.com/twitter.png",
          "og:site_name": "Example",
        },
        title: "Document title",
        firstParagraph: "The opening paragraph of the article body.",
      }),
      url,
    );

    expect(preview).toMatchObject({
      title: "OG title",
      description: "OG description",
      image: "https://example.com/og.png",
      siteName: "Example",
      domain: "example.com",
    });
  });

  it("falls back through twitter, then the document title", () => {
    expect(previewFromPage(page({ tags: { "twitter:title": "T" }, title: "Doc" }), url).title).toBe(
      "T",
    );
    expect(previewFromPage(page({ title: "Doc" }), url).title).toBe("Doc");
  });

  it("falls back through twitter and meta description, then the first paragraph", () => {
    const tags = { "twitter:description": "From twitter", description: "From meta" };
    expect(previewFromPage(page({ tags }), url).description).toBe("From twitter");
    expect(previewFromPage(page({ tags: { description: "From meta" } }), url).description).toBe(
      "From meta",
    );
    expect(previewFromPage(page({ firstParagraph: "From the body" }), url).description).toBe(
      "From the body",
    );
  });

  it("derives a title from the url only when the page offered none", () => {
    expect(previewFromPage(emptyPage(), url).title).toBe("The Quiet Revolution");
  });

  it("invents nothing when the page is bare", () => {
    const preview = previewFromPage(emptyPage(), new URL("https://example.com/"));
    expect(preview.title).toBe("");
    expect(preview.description).toBe("");
    expect(preview.image).toBe("");
    expect(preview.siteName).toBe("");
  });

  it("resolves a relative image against the page url", () => {
    expect(previewFromPage(page({ tags: { "og:image": "/cover.png" } }), url).image).toBe(
      "https://example.com/cover.png",
    );
  });

  it("refuses an image the page declares as too small to be a preview", () => {
    const tags = {
      "og:image": "/logo.png",
      "og:image:width": "48",
      "og:image:height": "48",
    };
    expect(previewFromPage(page({ tags }), url).image).toBe("");
  });

  it("refuses an image the page declares as a banner strip", () => {
    const tags = {
      "og:image": "/banner.png",
      "og:image:width": "1600",
      "og:image:height": "200",
    };
    expect(previewFromPage(page({ tags }), url).image).toBe("");
  });

  it("keeps an image whose declared size is fine, or absent", () => {
    const declared = {
      "og:image": "/cover.png",
      "og:image:width": "1200",
      "og:image:height": "630",
    };
    expect(previewFromPage(page({ tags: declared }), url).image).toBe(
      "https://example.com/cover.png",
    );
    expect(previewFromPage(page({ tags: { "og:image": "/cover.png" } }), url).image).toBe(
      "https://example.com/cover.png",
    );
  });

  it("uses the declared icon, else the origin's favicon", () => {
    expect(previewFromPage(page({ iconHref: "/icons/site.png" }), url).favicon).toBe(
      "https://example.com/icons/site.png",
    );
    expect(previewFromPage(emptyPage(), url).favicon).toBe("https://example.com/favicon.ico");
  });

  it("reads the category from og:type", () => {
    expect(previewFromPage(page({ tags: { "og:type": "video.other" } }), url).cat).toBe("video");
    expect(previewFromPage(page({ tags: { "og:type": "article" } }), url).cat).toBe("article");
    expect(previewFromPage(emptyPage(), url).cat).toBe("link");
  });

  it("ignores meta tags whose content is blank", () => {
    const preview = previewFromPage(
      page({ tags: { "og:title": "   ", "twitter:title": "Real" } }),
      url,
    );
    expect(preview.title).toBe("Real");
  });
});
