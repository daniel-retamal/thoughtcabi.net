import { describe, expect, it } from "vitest";
import { previewFramingFor } from "./imageFraming";

describe("previewFramingFor", () => {
  it("keeps the shapes that carry words whole", () => {
    expect(previewFramingFor(2)).toBe("fit");
    expect(previewFramingFor(16 / 9)).toBe("fit");
    expect(previewFramingFor(1.91)).toBe("fit");
  });

  it("fits anything wider than the frame, however extreme", () => {
    expect(previewFramingFor(3)).toBe("fit");
  });

  it("crops the shapes that cannot be shown whole without a mat", () => {
    expect(previewFramingFor(1.5)).toBe("fill");
    expect(previewFramingFor(4 / 3)).toBe("fill");
    expect(previewFramingFor(1)).toBe("fill");
    expect(previewFramingFor(0.75)).toBe("fill");
  });

  it("crops a picture whose shape is not known", () => {
    expect(previewFramingFor(0)).toBe("fill");
  });

  it("puts the line at the frame's own ratio, so a fitted frame only ever gets shorter", () => {
    expect(previewFramingFor(1.61)).toBe("fit");
    expect(previewFramingFor(1.6)).toBe("fill");
  });
});
