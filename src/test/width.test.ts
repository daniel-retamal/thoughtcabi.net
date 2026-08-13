import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const STYLES = resolve(process.cwd(), "src/styles");
const STEP = 282;

function sheet(file: string): string {
  return readFileSync(join(STYLES, file), "utf8");
}

describe("the plate", () => {
  it("states its cap as a column count, so it follows from the tile", () => {
    const tokens = sheet("tokens.css");

    expect(tokens).toContain("--plate-columns: 6;");
    expect(tokens).toContain("--tile-step: calc(var(--tile-w) + var(--tile-gap));");
    expect(tokens).toMatch(/--plate-max:[^;]*var\(--plate-columns\)[^;]*var\(--tile-step\)/);
    expect(tokens).not.toMatch(/--plate-max:\s*\d+px/);
  });

  it("steps in whole columns rather than taking whatever is left over", () => {
    const shell = sheet("layout/shell.css");

    expect(shell).toMatch(/round\(\s*down,[\s\S]*?var\(--tile-step\)\s*\)/);
    expect(shell).toContain("var(--plate-max)");
  });

  it("gives grid and rows one plate, so switching views moves nothing but the items", () => {
    expect(sheet("layout/shell.css")).not.toContain("reading");
    expect(sheet("tokens.css")).not.toContain("--list-max");
    expect(sheet("tokens.css")).not.toContain("--list-measure");
  });

  it("caps the content region and lets the field run to the edges", () => {
    expect(sheet("layout/shell.css")).not.toMatch(/\.body\s*\{[^}]*(max-)?width:/);
  });

  it("drops the row's trailing columns at the plate's own column steps", () => {
    const responsive = sheet("responsive.css");
    const steps = [...responsive.matchAll(/@container \(width < (\d+)px\)/g)].map((match) =>
      Number(match[1]),
    );

    expect(steps).toEqual([1392, 1110, 828, 546]);
    for (const step of steps) expect((step + 18) % STEP).toBe(0);

    expect(sheet("components/rows.css")).toContain("container-type: inline-size;");
    expect(responsive).not.toMatch(/@media[^{]*\{\s*\.row-(kind|dom|time|tag-slot)/);
  });

  it("sheds the row's columns in one order, least-read first", () => {
    const responsive = sheet("responsive.css");
    const dropped = [...responsive.matchAll(/@container \(width < \d+px\)\s*\{\s*(\.[\w-]+)/g)].map(
      (match) => match[1],
    );

    expect(dropped).toEqual([".row-kind", ".row-time", ".row-tag-slot", ".row-item"]);
  });
});
