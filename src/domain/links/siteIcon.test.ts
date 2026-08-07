import { describe, expect, it } from "vitest";
import { bestIconHref, largestDeclaredEdge } from "./siteIcon";

function icon(rel: string, href: string, sizes = ""): { rel: string; href: string; sizes: string } {
  return { rel, href, sizes };
}

describe("largestDeclaredEdge", () => {
  it("takes the largest declared square", () => {
    expect(largestDeclaredEdge("16x16 32x32 180x180")).toBe(180);
  });

  it("treats an undeclared or symbolic size as none", () => {
    expect(largestDeclaredEdge("")).toBe(0);
    expect(largestDeclaredEdge("any")).toBe(0);
  });
});

describe("bestIconHref", () => {
  it("prefers an apple touch icon over a favicon", () => {
    const href = bestIconHref([
      icon("icon", "/favicon.ico"),
      icon("apple-touch-icon", "/apple-touch-icon.png"),
    ]);
    expect(href).toBe("/apple-touch-icon.png");
  });

  it("prefers the precomposed variant just as much", () => {
    const href = bestIconHref([
      icon("shortcut icon", "/favicon.ico"),
      icon("apple-touch-icon-precomposed", "/touch.png"),
    ]);
    expect(href).toBe("/touch.png");
  });

  it("takes the largest declared icon when there is no apple touch icon", () => {
    const href = bestIconHref([
      icon("icon", "/small.png", "16x16"),
      icon("icon", "/large.png", "192x192"),
      icon("icon", "/medium.png", "32x32"),
    ]);
    expect(href).toBe("/large.png");
  });

  it("keeps the first icon when nothing declares a size", () => {
    expect(bestIconHref([icon("icon", "/one.png"), icon("icon", "/two.png")])).toBe("/one.png");
  });

  it("ignores links that are not icons", () => {
    const href = bestIconHref([
      icon("stylesheet", "/app.css"),
      icon("mask-icon", "/mask.svg"),
      icon("icon", "/favicon.ico"),
    ]);
    expect(href).toBe("/favicon.ico");
  });

  it("returns nothing when the page declares no icon", () => {
    expect(bestIconHref([])).toBe("");
    expect(bestIconHref([icon("icon", "   ")])).toBe("");
  });
});
