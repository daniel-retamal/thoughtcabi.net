import { describe, expect, it } from "vitest";
import {
  forgetImageOutcomes,
  imageOutcomeOf,
  naturalEdgeOf,
  rememberBrokenImage,
  rememberLoadedImage,
} from "./imageOutcomes";

describe("imageOutcomes", () => {
  it("knows nothing about a source it has never seen", () => {
    expect(imageOutcomeOf("https://example.com/new.png")).toBeNull();
    expect(naturalEdgeOf("https://example.com/new.png")).toBe(0);
  });

  it("keeps the longest edge of a source that loaded", () => {
    rememberLoadedImage("https://example.com/wide.png", 64, 32);

    expect(imageOutcomeOf("https://example.com/wide.png")).toBe("ok");
    expect(naturalEdgeOf("https://example.com/wide.png")).toBe(64);
  });

  it("remembers a source that failed", () => {
    rememberBrokenImage("https://example.com/gone.png");
    expect(imageOutcomeOf("https://example.com/gone.png")).toBe("broken");
  });

  it("lets a later attempt overturn an earlier verdict", () => {
    rememberBrokenImage("https://example.com/flaky.png");
    rememberLoadedImage("https://example.com/flaky.png", 16, 16);

    expect(imageOutcomeOf("https://example.com/flaky.png")).toBe("ok");
  });

  it("ignores an empty source rather than recording a verdict about nothing", () => {
    rememberBrokenImage("");
    rememberLoadedImage("", 16, 16);

    expect(imageOutcomeOf("")).toBeNull();
  });

  it("forgets everything on demand", () => {
    rememberLoadedImage("https://example.com/icon.png", 16, 16);
    forgetImageOutcomes();

    expect(imageOutcomeOf("https://example.com/icon.png")).toBeNull();
  });
});
