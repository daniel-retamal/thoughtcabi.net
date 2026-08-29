import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const STYLES = resolve(process.cwd(), "src/styles");

function read(path: string): string {
  return readFileSync(join(STYLES, path), "utf8");
}

function ruleFor(source: string, selector: string): string {
  const opens = source.indexOf(`${selector} {`);
  return opens === -1 ? "" : source.slice(opens, source.indexOf("}", opens));
}

function weightIn(rule: string): number {
  return Number(/font-weight:\s*(\d+)/.exec(rule)?.[1]);
}

function literataRange(): [number, number] {
  const face = /@font-face\s*\{[^}]*Literata[^}]*\}/.exec(read("fonts.css"))?.[0] ?? "";
  const declared = /font-weight:\s*(\d+)\s+(\d+)/.exec(face);
  return [Number(declared?.[1]), Number(declared?.[2])];
}

describe("typography", () => {
  it("leaves glyph rasterisation to the platform", () => {
    expect(read("base.css")).not.toContain("font-smoothing");
  });

  it("keeps the sidebar's names at the weight their 154px slot was measured against", () => {
    expect(weightIn(ruleFor(read("layout/sidebar.css"), ".lib-row .lib-name"))).toBe(300);
  });

  it("asks Literata only for weights its own face declares", () => {
    const [lightest, heaviest] = literataRange();
    const asked = weightIn(ruleFor(read("layout/sidebar.css"), ".lib-row .lib-name"));

    expect(asked).toBeGreaterThanOrEqual(lightest);
    expect(asked).toBeLessThanOrEqual(heaviest);
  });
});
