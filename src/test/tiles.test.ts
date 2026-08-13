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

function rulesFor(selector: string): { file: string; body: string }[] {
  const pattern = new RegExp(`(^|,)\\s*\\${selector}\\s*(,[^{]*)?\\{([^}]*)\\}`, "gm");
  return stylesheets(STYLES).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return [...source.matchAll(pattern)].map((match) => ({ file, body: match[3] ?? "" }));
  });
}

describe("the tile grid", () => {
  it("states the tile width and the gutter once, as constants", () => {
    const tokens = readFileSync(join(STYLES, "tokens.css"), "utf8");

    expect(tokens).toContain("--tile-w: 264px;");
    expect(tokens).toContain("--tile-gap: 18px;");
  });

  it("gives cards and folders one grid definition", () => {
    const shared = readFileSync(join(STYLES, "components/tiles.css"), "utf8");

    expect(shared).toMatch(/\.notes-grid,\s*\.folder-grid\s*\{/);
    expect(shared).toContain("repeat(auto-fill, min(var(--tile-w), 100%))");
    expect(shared).toContain("gap: var(--tile-gap);");
    expect(shared).toContain("justify-content: center;");
  });

  it("lets no other rule set either grid's columns or gutter", () => {
    for (const selector of [".notes-grid", ".folder-grid"]) {
      const elsewhere = rulesFor(selector).filter((rule) => !rule.file.endsWith("tiles.css"));

      for (const rule of elsewhere) {
        expect(rule.body, `${selector} in ${rule.file}`).not.toMatch(/grid-template-columns|gap:/);
      }
    }
  });
});
