import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const STYLES = resolve(process.cwd(), "src/styles");

function sheet(file: string): string {
  return readFileSync(join(STYLES, file), "utf8");
}

describe("the decided width", () => {
  it("states the grid's cap as a column count, so it follows from the tile", () => {
    const tokens = sheet("tokens.css");

    expect(tokens).toContain("--grid-columns: 6;");
    expect(tokens).toMatch(/--grid-max:[^;]*var\(--tile-w\)[^;]*var\(--tile-gap\)/);
    expect(tokens).not.toMatch(/--grid-max:\s*\d+px/);
  });

  it("gives the list its own, narrower cap, because a list is text", () => {
    expect(sheet("tokens.css")).toContain("--list-max: 1120px;");
  });

  it("caps the content region and lets the field run to the edges", () => {
    const shell = sheet("layout/shell.css");

    expect(shell).toMatch(/\.body-inner\s*\{[^}]*--content-max: var\(--grid-max\)/);
    expect(shell).toMatch(/\.body-inner\.reading\s*\{[^}]*--content-max: var\(--list-max\)/);
    expect(shell).not.toMatch(/\.body\s*\{[^}]*(max-)?width:/);
  });

  it("drops the row's trailing columns against the plate, never the window", () => {
    const responsive = sheet("responsive.css");
    const containerQueries = [...responsive.matchAll(/@container \(max-width: (\d+)px\)/g)].map(
      (match) => Number(match[1]),
    );

    expect(containerQueries).toEqual([932, 844, 638]);
    expect(sheet("components/rows.css")).toContain("container-type: inline-size;");
    expect(responsive).not.toMatch(/@media[^{]*\{\s*\.row-(dom|time|tag-slot)/);
  });
});
