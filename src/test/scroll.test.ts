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
  const head = source.indexOf(`\n${selector} {`);
  if (head < 0) return "";

  const open = source.indexOf("{", head);
  return source.slice(open + 1, source.indexOf("}", open));
}

function scrollbarSizings(source: string): string[] {
  return [...source.matchAll(/::-webkit-scrollbar[^{}]*\{([^}]*)\}/g)]
    .map((block) => block[1] ?? "")
    .filter((body) => /width|height/.test(body));
}

describe("the scrollers", () => {
  it("leaves the scrollbar itself to the platform, so a hover never moves the content", () => {
    for (const file of stylesheets(STYLES)) {
      expect(scrollbarSizings(readFileSync(file, "utf8")), file).toEqual([]);
    }
  });

  it("reserves the same gutter on both edges of a modal, scrolling or not", () => {
    for (const selector of [".modal-scroll", ".modal-body"]) {
      expect(ruleFor("components/modals.css", selector)).toContain(
        "scrollbar-gutter: stable both-edges;",
      );
    }
  });
});
