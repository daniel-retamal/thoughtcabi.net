import { describe, expect, it } from "vitest";
import { LOCALES } from "@/domain/model";
import { SHELF_ICON_CHOICES } from "@/icons/registry";
import { COLOR_FAMILIES } from "@/theme/colors";
import { en } from "./en";
import { es } from "./es";
import { DICTIONARIES, LOCALE_ENDONYMS, dictionaryFor } from "./locales";

type Leaf = { path: string; value: string };

function leaves(value: unknown, path = ""): Leaf[] {
  if (typeof value === "string") return [{ path, value }];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, path ? `${path}.${key}` : key),
  );
}

function tokensIn(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? "").sort();
}

const EMPTY_ON_PURPOSE = new Set(["categories.note"]);

const EM_DASH_ON_PURPOSE = new Set([
  "card.noLink",
  "compose.reading",
  "compose.optional",
  "compose.thumbnailHint",
  "tagEditor.colorHint",
]);

describe.each(LOCALES)("the %s dictionary", (locale) => {
  const dictionary = dictionaryFor(locale);

  it("says something at every key", () => {
    const blank = leaves(dictionary).filter(
      (leaf) => leaf.value.trim() === "" && !EMPTY_ON_PURPOSE.has(leaf.path),
    );
    expect(blank).toEqual([]);
  });

  it("spends no em dash on prose", () => {
    const offenders = leaves(dictionary).filter(
      (leaf) => leaf.value.includes("—") && !EM_DASH_ON_PURPOSE.has(leaf.path),
    );
    expect(offenders).toEqual([]);
  });

  it("never leans on a flag or any other emoji", () => {
    const pictographic = leaves(dictionary).filter((leaf) =>
      /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(leaf.value),
    );
    expect(pictographic).toEqual([]);
  });
});

describe("the two dictionaries", () => {
  it("carry exactly the same keys", () => {
    expect(leaves(es).map((leaf) => leaf.path)).toEqual(leaves(en).map((leaf) => leaf.path));
  });

  it("carry the same interpolation in every sentence", () => {
    const english = new Map(leaves(en).map((leaf) => [leaf.path, tokensIn(leaf.value)]));
    const mismatched = leaves(es).filter(
      (leaf) => JSON.stringify(english.get(leaf.path)) !== JSON.stringify(tokensIn(leaf.value)),
    );
    expect(mismatched).toEqual([]);
  });

  it("say something different, so nothing was left untranslated by accident", () => {
    const english = new Map(leaves(en).map((leaf) => [leaf.path, leaf.value]));
    const shared = leaves(es).filter((leaf) => english.get(leaf.path) === leaf.value);
    const paths = shared.map((leaf) => leaf.path);

    expect(paths).toEqual([
      "categories.video",
      "categories.note",
      "compose.linkPlaceholder",
      "tagEditor.color",
      "detail.url",
      "sync.connect.github",
      "sync.connect.drive",
      "sync.connect.onedrive",
      "sync.connect.webdavSub",
      "sync.fields.token",
      "display.color",
      "colors.mono",
      "icons.terminal",
    ]);
  });
});

describe("the locale list", () => {
  it("names each language in its own words, and holds a dictionary for each", () => {
    expect(LOCALE_ENDONYMS).toEqual({ en: "English", es: "Español" });
    expect(Object.keys(DICTIONARIES)).toEqual([...LOCALES]);
  });
});

describe("what the dictionary has to cover", () => {
  it("labels every shelf icon the picker offers", () => {
    expect([...SHELF_ICON_CHOICES].sort()).toEqual(Object.keys(en.icons).sort());
  });

  it("labels every color family and every depth", () => {
    const ids = COLOR_FAMILIES.flatMap((family) => [
      family.id,
      ...family.colors.map((color) => color.id),
    ]);
    expect(ids.sort()).toEqual(Object.keys(en.colors).sort());
  });
});
