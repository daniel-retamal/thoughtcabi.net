import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const STYLES = resolve(process.cwd(), "src/styles");

function stylesheets(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return stylesheets(path);
    return entry.name.endsWith(".css") ? [path] : [];
  });
}

function ruleFor(file: string, selector: string): string {
  const source = readFileSync(join(STYLES, file), "utf8");
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`, "m");
  return pattern.exec(source)?.[2] ?? "";
}

describe("the picture frame", () => {
  it("states the card's frame as a ratio, never as a height", () => {
    const frame = ruleFor("components/cards.css", ".card > .cover");

    expect(frame).toContain("aspect-ratio: 16 / 10;");
    expect(frame).not.toMatch(/\bheight:/);
  });

  it("fills a mark the same way on every surface, biased slightly high", () => {
    const fill = ruleFor("components/thumbnails.css", ".cover.img-cover .img-fill");

    expect(fill).toContain("object-fit: cover;");
    expect(fill).toContain("object-position: 50% 40%;");
  });

  it("shows a wide picture whole on the card, and cuts nothing off its sides", () => {
    const fitted = ruleFor(
      "components/thumbnails.css",
      ".cover.img-cover.preview.fitted .img-fill",
    );

    expect(fitted).toContain("object-fit: contain;");
    expect(fitted).not.toMatch(/object-position/);
  });

  it("gives a fitted frame the picture's own shape instead of a mat", () => {
    const fitted = ruleFor("components/thumbnails.css", ".cover.img-cover.preview.fitted");

    expect(fitted).toContain("aspect-ratio: var(--frame-ratio);");
    expect(fitted).toContain("background: none;");
    expect(fitted).not.toMatch(/\bheight:/);
  });

  it("treats a picture the same on every surface it appears on", () => {
    const treatment = "filter: saturate(0.82) contrast(0.95);";

    expect(ruleFor("components/thumbnails.css", ".cover.img-cover")).toContain(treatment);
    expect(ruleFor("components/thumbnails.css", ".shot-img")).toContain(treatment);

    const declarers = stylesheets(STYLES).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/([^{}]*)\{([^}]*)\}/g)]
        .filter((rule) => (rule[2] ?? "").includes("saturate(0.82)"))
        .map((rule) => (rule[1] ?? "").trim()),
    );

    expect(declarers.sort()).toEqual([".cover.img-cover", ".shot-img"]);
  });

  it("lays nothing over a picture but the ring that seats it", () => {
    const ring = ruleFor("components/thumbnails.css", ".cover.img-cover::after");

    expect(ring).toContain("box-shadow: inset 0 0 0 1px var(--hairline);");
    expect(ring).not.toMatch(/background/);

    for (const file of stylesheets(STYLES)) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/\.cover[^{]*::after\s*\{[^}]*background:/);
    }
  });

  it("hangs a fitted frame from the same top edge as every other one", () => {
    const frame = ruleFor("components/cards.css", ".card > .cover");
    const fitted = ruleFor("components/thumbnails.css", ".cover.img-cover.preview.fitted");

    expect(frame).toContain("margin: 9px 9px 0;");
    expect(fitted).not.toMatch(/margin/);
  });

  it("leaves the same gap under every picture, whatever shape it took", () => {
    const body = ruleFor("components/cards.css", ".card-body");
    expect(body).toContain("padding: 13px 14px;");

    const keyedOffFitting = stylesheets(STYLES).some((file) =>
      /\.fitted[^{]*\.card-body/.test(readFileSync(file, "utf8")),
    );
    expect(keyedOffFitting).toBe(false);
  });

  it("gives no rule anywhere a second focal point", () => {
    const positions = stylesheets(STYLES).flatMap((file) => [
      ...readFileSync(file, "utf8").matchAll(/object-position:\s*([^;]+);/g),
    ]);

    expect(positions.length).toBeGreaterThan(0);
    for (const match of positions) expect(match[1]).toBe("50% 40%");
  });

  it("keeps the picture uncropped and unstretched when it is the content", () => {
    const shot = ruleFor("components/thumbnails.css", ".shot-img");

    expect(shot).toContain("max-width: 100%;");
    expect(shot).toContain("max-height: 60vh;");
    expect(shot).not.toMatch(/object-fit/);
    expect(shot).not.toMatch(/^\s*(width|height|aspect-ratio):/m);
  });

  it("lets no surface put the detail picture back in a box", () => {
    for (const file of stylesheets(STYLES)) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/\.modal\s+\.cover/);
    }
  });
});
