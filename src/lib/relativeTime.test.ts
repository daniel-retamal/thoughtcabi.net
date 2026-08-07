import { describe, expect, it } from "vitest";
import { relativeTime } from "./relativeTime";

const NOW = 1_700_000_000_000;
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function ago(offset: number): string {
  return relativeTime(NOW - offset, NOW);
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
});
