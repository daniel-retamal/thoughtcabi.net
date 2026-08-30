import { describe, expect, it } from "vitest";
import { counted, countedTemplate, format, plural } from "./format";

describe("format", () => {
  it("substitutes every token it is given a value for", () => {
    expect(format("Nothing in {shelf} yet.", { shelf: "Reading" })).toBe("Nothing in Reading yet.");
    expect(format("{a} and {b}", { a: "one", b: 2 })).toBe("one and 2");
  });

  it("substitutes a token used more than once", () => {
    expect(format("{n} of {n}", { n: 3 })).toBe("3 of 3");
  });

  it("leaves a token it has no value for alone, rather than printing undefined", () => {
    expect(format("Nothing in {shelf} yet.", {})).toBe("Nothing in {shelf} yet.");
  });

  it("leaves text with no tokens untouched", () => {
    expect(format("Nothing saved.", { n: 1 })).toBe("Nothing saved.");
  });
});

const ITEMS = { one: "item", other: "items" };
const QUESTION = { one: "Delete {n} save?", other: "Delete {n} saves?" };

describe("plural", () => {
  it("takes the singular for one and the other form for everything else", () => {
    expect(plural(ITEMS, 1)).toBe("item");
    expect(plural(ITEMS, 0)).toBe("items");
    expect(plural(ITEMS, 2)).toBe("items");
  });
});

describe("counted", () => {
  it("puts the number in front of the noun", () => {
    expect(counted(ITEMS, 1)).toBe("1 item");
    expect(counted(ITEMS, 4)).toBe("4 items");
  });
});

describe("countedTemplate", () => {
  it("picks the form and then fills its {n}", () => {
    expect(countedTemplate(QUESTION, 1)).toBe("Delete 1 save?");
    expect(countedTemplate(QUESTION, 12)).toBe("Delete 12 saves?");
  });
});
