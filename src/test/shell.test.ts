import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SIDEBAR = resolve(process.cwd(), "src/styles/layout/sidebar.css");
const SHELL = resolve(process.cwd(), "src/styles/layout/shell.css");
const BASE = resolve(process.cwd(), "src/styles/base.css");
const MODALS = resolve(process.cwd(), "src/styles/components/modals.css");

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
        found.push({
          selectors: head.split(",").map((selector) => selector.trim()),
          body,
        });
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

function flatten(source: string): Rule[] {
  return rulesIn(source).flatMap((rule) =>
    rule.selectors.some((selector) => selector.startsWith("@")) ? rulesIn(rule.body) : [rule],
  );
}

describe("the sidebar stylesheet", () => {
  it("never reaches for a bare span, because every icon is wrapped in one", () => {
    const reaching = flatten(readFileSync(SIDEBAR, "utf8"))
      .flatMap((rule) => rule.selectors)
      .filter((selector) => /(^|\s)span(\s|$)/.test(selector));

    expect(reaching).toEqual([]);
  });

  it("keeps the rail's add buttons, and hides only the words beside them", () => {
    const rail = flatten(readFileSync(SIDEBAR, "utf8")).filter((rule) =>
      rule.selectors.some((selector) => selector.includes('[data-sidebar="rail"]')),
    );

    const hidden = rail
      .filter((rule) => /display:\s*none/.test(rule.body))
      .flatMap((rule) => rule.selectors);

    expect(hidden).toContain(':root[data-sidebar="rail"] .side-section-title');
    for (const selector of hidden) expect(selector).not.toContain(".side-section-label button");
  });
});

describe("the shell", () => {
  it("edges the pane exactly as it edges the sidebar, so neither reads as the thicker one", () => {
    const shell = flatten(readFileSync(SHELL, "utf8"));
    const pane = shell.find((rule) => rule.selectors.includes(".pane"));
    const sidebar = flatten(readFileSync(SIDEBAR, "utf8")).find((rule) =>
      rule.selectors.includes(".sidebar"),
    );

    expect(pane?.body).not.toMatch(/box-shadow/);
    expect(sidebar?.body).not.toMatch(/box-shadow/);
  });
});

describe("the button reset", () => {
  it("zeroes the padding the browser puts there, so a glyph sits on its own centre", () => {
    const reset = flatten(readFileSync(BASE, "utf8")).find((rule) =>
      rule.selectors.includes("button"),
    );

    expect(reset?.body).toMatch(/padding:\s*0/);
  });
});

describe("the modal scrim", () => {
  it("paints nothing, because it is thrown away and rebuilt on every change of dialog", () => {
    const scrim = flatten(readFileSync(MODALS, "utf8")).find((rule) =>
      rule.selectors.includes(".scrim"),
    );

    expect(scrim).toBeDefined();
    expect(scrim?.body).not.toMatch(/background|backdrop-filter|animation/);
  });
});
