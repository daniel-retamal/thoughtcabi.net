import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const DND = resolve(process.cwd(), "src/styles/components/dnd.css");
const SURFACED = [".card", ".folder-tile", ".row-item", ".notes-list", ".popover"];
const STATES = [".dnd-over", ".dnd-spring", ".img-drop-over"];
const PLATE_STATE =
  /^:root\[data-card-surface\] \.(?:folder-tile|row-folder|card|row-item)\.(?:dnd-over|dnd-spring|img-drop-over)::after$/;

interface Rule {
  selectors: string[];
  body: string;
}

function rulesIn(source: string): Rule[] {
  const found: Rule[] = [];
  let head = "";
  let depth = 0;
  let body = "";

  for (const character of source) {
    if (character === "{") {
      depth += 1;
      if (depth === 1) continue;
    }
    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        if (!head.trimStart().startsWith("@")) {
          found.push({
            selectors: head.split(",").map((selector) => selector.trim()),
            body,
          });
        }
        head = "";
        body = "";
        continue;
      }
    }
    if (depth === 0) head += character;
    else body += character;
  }

  return found;
}

function selectorsIn(source: string): string[] {
  return rulesIn(source).flatMap((rule) => rule.selectors);
}

function plateStateRules(source: string): Rule[] {
  return rulesIn(source).filter((rule) => rule.selectors.some((one) => PLATE_STATE.test(one)));
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

  it("draws every plate highlight on a pseudo-element, so it never argues over box-shadow", () => {
    const onTheElement = selectorsIn(readFileSync(DND, "utf8")).filter(
      (selector) =>
        !selector.includes("::after") &&
        SURFACED.some((surfaced) =>
          STATES.some((state) => selector.includes(`${surfaced}${state}`)),
        ),
    );

    expect(onTheElement).toEqual([]);
  });

  it("seats two rings inside the target, the gutter first and the identity colour within it", () => {
    const ringed = plateStateRules(readFileSync(DND, "utf8")).filter((rule) =>
      rule.body.includes("box-shadow"),
    );

    expect(ringed.length).toBeGreaterThan(0);
    for (const rule of ringed) {
      expect(rule.body).toContain("inset 0 0 0 2px var(--ring-gutter)");

      const offsets = [...rule.body.matchAll(/outline-offset:\s*([^;]+);/g)].map(
        (match) => match[1] ?? "",
      );
      for (const offset of offsets) expect(offset.startsWith("-")).toBe(true);
    }
  });

  it("marks a drop target with a ring alone, never by tinting or moving it", () => {
    const found = plateStateRules(readFileSync(DND, "utf8"));

    expect(found.length).toBeGreaterThan(0);
    for (const rule of found) {
      expect(rule.body).not.toMatch(/background/);
      expect(rule.body).not.toMatch(/transform/);
    }
  });
});
