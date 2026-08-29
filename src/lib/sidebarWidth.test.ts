import { describe, expect, it } from "vitest";
import {
  collapseBelowFrom,
  sidebarSizeFor,
  toStoredWidth,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
} from "./sidebarWidth";

describe("collapseBelowFrom", () => {
  it("is the width at which the logo's right gap matches its left inset", () => {
    expect(collapseBelowFrom(18, 224)).toBe(242);
  });

  it("rounds up, so the right gap is never a fraction short of the left one", () => {
    expect(collapseBelowFrom(18.4, 223.9)).toBe(243);
  });

  it("falls back when the logo has not been laid out yet", () => {
    expect(collapseBelowFrom(0, 0)).toBe(SIDEBAR_MIN_WIDTH);
    expect(collapseBelowFrom(18, 12)).toBe(SIDEBAR_MIN_WIDTH);
    expect(collapseBelowFrom(Number.NaN, 224)).toBe(SIDEBAR_MIN_WIDTH);
  });
});

describe("sidebarSizeFor", () => {
  it("keeps the sidebar wide while the logo still fits", () => {
    expect(sidebarSizeFor(300, 242, 268)).toEqual({ mode: "wide", width: 300 });
  });

  it("collapses to the rail as soon as the logo would be crowded", () => {
    expect(sidebarSizeFor(241, 242, 268)).toEqual({ mode: "rail", width: 268 });
  });

  it("holds the last expanded width while railed, so widening restores it", () => {
    expect(sidebarSizeFor(80, 242, 312)).toEqual({ mode: "rail", width: 312 });
  });

  it("stops widening at the maximum", () => {
    expect(sidebarSizeFor(900, 242, 268)).toEqual({ mode: "wide", width: SIDEBAR_MAX_WIDTH });
  });

  it("treats an unmeasurable drag as a collapse rather than guessing a width", () => {
    expect(sidebarSizeFor(Number.NaN, 242, 268)).toEqual({ mode: "rail", width: 268 });
  });
});

describe("toStoredWidth", () => {
  it("clamps a persisted width into the range the shell can render", () => {
    expect(toStoredWidth(10)).toBe(SIDEBAR_MIN_WIDTH);
    expect(toStoredWidth(9000)).toBe(SIDEBAR_MAX_WIDTH);
    expect(toStoredWidth(287.6)).toBe(288);
  });
});
