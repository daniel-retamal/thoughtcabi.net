import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import { relativeTime } from "./relativeTime";

const NOW = 1_700_000_000_000;
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function ago(offset: number): string {
  return relativeTime(NOW - offset, en.time, NOW);
}

function hace(offset: number): string {
  return relativeTime(NOW - offset, es.time, NOW);
}

describe("relativeTime", () => {
  it("reads as 'just now' for the first 45 seconds", () => {
    expect(ago(0)).toBe("just now");
    expect(ago(44 * SECOND)).toBe("just now");
  });

  it("counts minutes, then hours", () => {
    expect(ago(45 * SECOND)).toBe("0m ago");
    expect(ago(5 * MINUTE)).toBe("5m ago");
    expect(ago(59 * MINUTE)).toBe("59m ago");
    expect(ago(HOUR)).toBe("1h ago");
    expect(ago(23 * HOUR)).toBe("23h ago");
  });

  it("says yesterday, then days, weeks and months", () => {
    expect(ago(DAY)).toBe("yesterday");
    expect(ago(3 * DAY)).toBe("3d ago");
    expect(ago(6 * DAY)).toBe("6d ago");
    expect(ago(7 * DAY)).toBe("1w ago");
    expect(ago(30 * DAY)).toBe("4w ago");
    expect(ago(60 * DAY)).toBe("2mo ago");
  });

  it("puts the marker first in Spanish, and inflects the month", () => {
    expect(hace(0)).toBe("recién");
    expect(hace(5 * MINUTE)).toBe("hace 5 min");
    expect(hace(HOUR)).toBe("hace 1 h");
    expect(hace(DAY)).toBe("ayer");
    expect(hace(3 * DAY)).toBe("hace 3 d");
    expect(hace(7 * DAY)).toBe("hace 1 sem");
    expect(hace(40 * DAY)).toBe("hace 1 mes");
    expect(hace(60 * DAY)).toBe("hace 2 meses");
  });
});
