import { describe, expect, it } from "vitest";
import { base64FromText, textFromBase64 } from "./base64";

describe("base64FromText", () => {
  it("carries an accent and an emoji that btoa alone would throw on", () => {
    const text = '{"title":"Café ☕ 北京"}';

    expect(() => btoa(text)).toThrow();
    expect(textFromBase64(base64FromText(text))).toBe(text);
  });

  it("encodes ASCII the way btoa does", () => {
    expect(base64FromText("cabinet")).toBe(btoa("cabinet"));
  });

  it("survives a payload longer than one chunk", () => {
    const text = "é".repeat(40_000);

    expect(textFromBase64(base64FromText(text))).toBe(text);
  });

  it("reads back what GitHub wraps in newlines", () => {
    const wrapped = base64FromText("cabinet").replace(/(.{4})/g, "$1\n");

    expect(textFromBase64(wrapped)).toBe("cabinet");
  });
});
