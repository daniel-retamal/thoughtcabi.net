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
  const pattern = new RegExp(`(^|\\})\\s*\\${selector}\\s*\\{([^}]*)\\}`, "m");
  return pattern.exec(source)?.[2] ?? "";
}

describe("the picture frame", () => {
  it("states the card's frame as a ratio, never as a height", () => {
    const frame = ruleFor("components/cards.css", ".card > .cover");

    expect(frame).toContain("aspect-ratio: 16 / 10;");
    expect(frame).not.toMatch(/\bheight:/);
  });

  it("fills every frame the same way, biased slightly high", () => {
    const fill = ruleFor("components/thumbnails.css", ".cover.img-cover .img-fill");

    expect(fill).toContain("object-fit: cover;");
    expect(fill).toContain("object-position: 50% 40%;");
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
