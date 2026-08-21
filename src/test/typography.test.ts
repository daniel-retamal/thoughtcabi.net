import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const STYLES = resolve(process.cwd(), "src/styles");
const LIGHTEST = 400;

function stylesheets(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return stylesheets(path);
    return entry.name.endsWith(".css") ? [path] : [];
  });
}

function weightsIn(source: string): number[] {
  const withoutFaces = source.replace(/@font-face\s*\{[^}]*\}/g, "");
  return Array.from(withoutFaces.matchAll(/font-weight:\s*(\d+)/g)).map((match) =>
    Number(match[1]),
  );
}

describe("typography", () => {
  it("never asks a face for a weight lighter than regular", () => {
    const light = stylesheets(STYLES).flatMap((path) =>
      weightsIn(readFileSync(path, "utf8"))
        .filter((weight) => weight < LIGHTEST)
        .map((weight) => `${path}: ${weight}`),
    );

    expect(light).toEqual([]);
  });

  it("keeps the sidebar's names at the same weight as the rest of the interface", () => {
    const source = readFileSync(join(STYLES, "layout/sidebar.css"), "utf8");
    const rule = /\.lib-row \.lib-name\s*\{([^}]*)\}/.exec(source)?.[1] ?? "";

    expect(rule).toContain("font-weight: 400;");
  });
});
