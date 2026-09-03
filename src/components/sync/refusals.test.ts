import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { refusalFor } from "./refusals";

describe("what a connect sheet says when it is turned down", () => {
  it("says nothing at all when somebody dismissed a picker", () => {
    expect(refusalFor("folder", "cancelled", en)).toBeNull();
  });

  it("blames the right thing for each provider", () => {
    expect(refusalFor("github", "auth", en)).toBe(en.sync.refused.github.auth);
    expect(refusalFor("webdav", "auth", en)).toBe(en.sync.refused.webdav.auth);
  });

  it("keeps the two server problems apart", () => {
    expect(refusalFor("webdav", "cors", en)).toBe(en.sync.refused.cors);
    expect(refusalFor("webdav", "mixedContent", en)).toBe(en.sync.refused.mixedContent);
  });

  it("falls back to the general sentence for a provider with no words of its own", () => {
    expect(refusalFor("drive", "gone", en)).toBe(en.sync.refused.failed);
    expect(refusalFor("github", "failed", en)).toBe(en.sync.refused.failed);
  });
});
