import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CARD_LINE_HEIGHT } from "@/components/cards/NoteCard";

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

describe("the card's line budget", () => {
  it("measures in the line height both blocks are actually set in", () => {
    const line = `line-height: ${CARD_LINE_HEIGHT}px;`;

    expect(ruleFor("components/cards.css", ".card-title")).toContain(line);
    expect(ruleFor("components/cards.css", ".card-desc")).toContain(line);
  });

  it("clamps both blocks to a line count, never to a height", () => {
    for (const selector of [".card-title", ".card-desc"]) {
      const rule = ruleFor("components/cards.css", selector);

      expect(rule).toContain("flex: none;");
      expect(rule).toMatch(/-webkit-line-clamp: var\(--(title|desc)-lines\);/);
      expect(rule).not.toMatch(/^\s*(max-)?height:/m);
    }
  });

  it("states no line count as a fact about which parts a card has", () => {
    const declarations = stylesheets(STYLES).flatMap((file) => [
      ...readFileSync(file, "utf8").matchAll(/--(?:title|desc)-lines:\s*[^;]+;/g),
    ]);

    expect(declarations).toHaveLength(2);
    expect(ruleFor("components/cards.css", ".card-body")).toContain("--title-lines: 2;");
    expect(ruleFor("components/cards.css", ".card-body")).toContain("--desc-lines: 2;");
  });
});
