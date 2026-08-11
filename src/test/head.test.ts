import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { colorById } from "@/theme/colors";

function fromRoot(path: string): string {
  return resolve(process.cwd(), path);
}

const head = new DOMParser().parseFromString(
  readFileSync(fromRoot("index.html"), "utf8"),
  "text/html",
).head;

function meta(selector: string): string {
  return head.querySelector(selector)?.getAttribute("content") ?? "";
}

function hrefs(selector: string): string[] {
  return [...head.querySelectorAll(selector)].map((tag) => tag.getAttribute("href") ?? "");
}

function publicPath(href: string): string {
  return fromRoot(`public${href}`);
}

function pngSize(path: string): { width: number; height: number } {
  const file = readFileSync(path);
  return { width: file.readUInt32BE(16), height: file.readUInt32BE(20) };
}

describe("index.html", () => {
  it("tints the browser chrome with the ultramarine field itself", () => {
    expect(meta('meta[name="theme-color"]')).toBe(colorById("ultramarine").field);
  });

  it("says the same sentence to search engines and to unfurlers", () => {
    const description = meta('meta[name="description"]');

    expect(description.length).toBeGreaterThan(0);
    expect(description.length).toBeLessThanOrEqual(155);
    expect(meta('meta[property="og:description"]')).toBe(description);
  });

  it("gives the crawler an absolute image url, since a relative one is dropped", () => {
    for (const property of ["og:image", "og:image:secure_url"]) {
      expect(meta(`meta[property="${property}"]`)).toMatch(/^https:\/\/thoughtcabi\.net\//);
    }
    expect(meta('meta[property="og:url"]')).toBe("https://thoughtcabi.net/");
  });

  it("declares the size the card image actually is", () => {
    const declared = {
      width: Number(meta('meta[property="og:image:width"]')),
      height: Number(meta('meta[property="og:image:height"]')),
    };

    expect(pngSize(publicPath("/og.png"))).toEqual(declared);
    expect(declared).toEqual({ width: 1200, height: 630 });
  });

  it("asks for the large card, and gives it something to fill it with", () => {
    expect(meta('meta[name="twitter:card"]')).toBe("summary_large_image");
    expect(meta('meta[property="og:image:alt"]').length).toBeGreaterThan(0);
    expect(meta('meta[property="og:type"]')).toBe("website");
  });

  it("points every icon at a file that is really in public/", () => {
    const icons = hrefs('link[rel="icon"], link[rel="apple-touch-icon"]');

    expect(icons).toHaveLength(3);
    for (const href of icons) expect(existsSync(publicPath(href)), href).toBe(true);
  });

  it("preloads fonts that exist and are declared", () => {
    const declared = readFileSync(fromRoot("src/styles/fonts.css"), "utf8");
    const preloads = hrefs('link[rel="preload"][as="font"]');

    expect(preloads.length).toBeGreaterThan(0);
    for (const href of preloads) {
      expect(existsSync(publicPath(href)), href).toBe(true);
      expect(declared).toContain(href);
    }
  });

  it("asks nothing of a third-party origin", () => {
    expect(head.querySelector('link[rel="preconnect"]')).toBeNull();
    expect(head.innerHTML).not.toContain("fonts.googleapis.com");
    expect(head.innerHTML).not.toContain("fonts.gstatic.com");
  });
});

describe("fonts.css", () => {
  const declared = readFileSync(fromRoot("src/styles/fonts.css"), "utf8");

  it("serves every face from public/fonts", () => {
    const urls = [...declared.matchAll(/url\("([^"]+)"\)/g)].map((match) => match[1] ?? "");

    expect(urls).toHaveLength(8);
    for (const url of urls) expect(existsSync(publicPath(url)), url).toBe(true);
  });

  it("swaps rather than hiding text while a face loads", () => {
    const faces = declared.match(/@font-face/g) ?? [];
    const swaps = declared.match(/font-display: swap;/g) ?? [];

    expect(swaps).toHaveLength(faces.length);
  });
});
