import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const DND = resolve(process.cwd(), "src/styles/components/dnd.css");
const SURFACED = [".card", ".folder-tile", ".row-item", ".notes-list", ".popover"];
const DROP_TARGETS =
  /:root\[data-card-surface\] \.(?:folder-tile|row-folder|card|row-item)[^{]*\.dnd-over[^{]*\{([^}]*)\}/g;

function selectorsIn(source: string): string[] {
  return Array.from(source.matchAll(/(?:^|\})\s*([^{}@]+)\{/g)).flatMap((match) =>
    (match[1] ?? "").split(",").map((selector) => selector.trim()),
  );
}

describe("the drag affordances", () => {
  it("outranks the card surfaces it paints over", () => {
    const source = readFileSync(DND, "utf8");

    const outranked = selectorsIn(source).filter(
      (selector) =>
        selector.includes(".dnd-over") &&
        SURFACED.some((surfaced) => selector.includes(`${surfaced}.dnd-over`)) &&
        !selector.startsWith(":root[data-card-surface]"),
    );

    expect(outranked).toEqual([]);
  });

  it("seats the drop ring on the target's own surface, where it always contrasts", () => {
    const rules = [...readFileSync(DND, "utf8").matchAll(DROP_TARGETS)].map((match) => match[1]);

    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule).toContain("outline: 2.5px solid var(--accent);");
      expect(rule).toContain("outline-offset: -2.5px;");
    }
  });

  it("marks a drop target with a ring alone, never by tinting or moving it", () => {
    const rules = [...readFileSync(DND, "utf8").matchAll(DROP_TARGETS)].map((match) => match[1]);

    for (const rule of rules) {
      expect(rule).not.toMatch(/background/);
      expect(rule).not.toMatch(/transform/);
    }
  });
});
