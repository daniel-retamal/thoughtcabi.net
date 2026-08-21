import { describe, expect, it } from "vitest";
import {
  acceptsPreviewImage,
  imageSizeFrom,
  isPreviewSized,
  storedImageSize,
} from "./imageCandidate";

describe("imageSizeFrom", () => {
  it("reads declared dimensions", () => {
    expect(imageSizeFrom("1200", "630")).toEqual({ width: 1200, height: 630 });
  });

  it("returns null for anything that is not a positive pair", () => {
    expect(imageSizeFrom("", "630")).toBeNull();
    expect(imageSizeFrom("wide", "630")).toBeNull();
    expect(imageSizeFrom("0", "630")).toBeNull();
    expect(imageSizeFrom("1200", "-4")).toBeNull();
  });
});

describe("isPreviewSized", () => {
  it("accepts a normal open graph image", () => {
    expect(isPreviewSized({ width: 1200, height: 630 })).toBe(true);
  });

  it("rejects anything whose short side is icon-sized", () => {
    expect(isPreviewSized({ width: 512, height: 128 })).toBe(false);
    expect(isPreviewSized({ width: 32, height: 32 })).toBe(false);
  });

  it("rejects an image too small in area to survive the frame", () => {
    expect(isPreviewSized({ width: 180, height: 180 })).toBe(false);
  });

  it("rejects banners and logo strips", () => {
    expect(isPreviewSized({ width: 1600, height: 200 })).toBe(false);
    expect(isPreviewSized({ width: 200, height: 1600 })).toBe(false);
  });

  it("accepts a square that is genuinely large", () => {
    expect(isPreviewSized({ width: 600, height: 600 })).toBe(true);
  });
});

describe("acceptsPreviewImage", () => {
  it("rejects an image that could not be loaded at all", () => {
    expect(acceptsPreviewImage({ status: "unreachable" })).toBe(false);
  });

  it("keeps a candidate it could not measure rather than inventing a failure", () => {
    expect(acceptsPreviewImage({ status: "unknown" })).toBe(true);
  });

  it("judges a measured image on its size", () => {
    expect(acceptsPreviewImage({ status: "measured", size: { width: 1200, height: 630 } })).toBe(
      true,
    );
    expect(acceptsPreviewImage({ status: "measured", size: { width: 1, height: 1 } })).toBe(false);
  });

  it("caps what gets stored at the widest a card or the detail view can use", () => {
    expect(storedImageSize({ width: 4032, height: 3024 })).toEqual({ width: 1280, height: 960 });
    expect(storedImageSize({ width: 3024, height: 4032 })).toEqual({ width: 960, height: 1280 });
  });

  it("leaves a picture that already fits exactly as it is", () => {
    expect(storedImageSize({ width: 1200, height: 630 })).toEqual({ width: 1200, height: 630 });
    expect(storedImageSize({ width: 0, height: 0 })).toEqual({ width: 0, height: 0 });
  });
});
