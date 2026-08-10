import { afterEach, describe, expect, it } from "vitest";
import { isApplePlatform, modifierKeyLabel } from "./platform";

function pretendPlatform(platform: string, userAgent: string): void {
  Object.defineProperty(navigator, "platform", { value: platform, configurable: true });
  Object.defineProperty(navigator, "userAgent", { value: userAgent, configurable: true });
}

describe("platform", () => {
  const platform = Object.getOwnPropertyDescriptor(Navigator.prototype, "platform");
  const userAgent = Object.getOwnPropertyDescriptor(Navigator.prototype, "userAgent");

  afterEach(() => {
    if (platform) Object.defineProperty(navigator, "platform", platform);
    if (userAgent) Object.defineProperty(navigator, "userAgent", userAgent);
  });

  it("reads a Mac off the platform string", () => {
    pretendPlatform("MacIntel", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    expect(isApplePlatform()).toBe(true);
    expect(modifierKeyLabel()).toBe("⌘");
  });

  it("reads an iPad that reports itself as a desktop", () => {
    pretendPlatform("", "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)");
    expect(isApplePlatform()).toBe(true);
  });

  it("names the key Ctrl everywhere else", () => {
    pretendPlatform("Win32", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    expect(isApplePlatform()).toBe(false);
    expect(modifierKeyLabel()).toBe("Ctrl");
  });
});
