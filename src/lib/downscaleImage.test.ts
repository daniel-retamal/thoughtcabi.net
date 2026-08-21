import { describe, expect, it, vi } from "vitest";
import { imageOutcomeOf, naturalRatioOf } from "@/lib/imageOutcomes";
import { downscaleImage } from "./downscaleImage";

function fakeImage(naturalWidth: number, naturalHeight: number): HTMLImageElement {
  return { naturalWidth, naturalHeight } as HTMLImageElement;
}

function stubCanvas(toDataURL: (type: string, quality: number) => string): void {
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag !== "canvas") throw new Error(`unexpected ${tag}`);
    return {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: () => undefined }),
      toDataURL,
    } as unknown as HTMLCanvasElement;
  });
}

describe("downscaleImage", () => {
  it("brings an oversized picture down to the stored edge, keeping its shape", async () => {
    stubCanvas(() => "data:image/webp;base64,small");
    const stored = await downscaleImage("data:image/png;base64,huge", () =>
      Promise.resolve(fakeImage(4000, 3000)),
    );

    expect(stored.width).toBe(1280);
    expect(stored.height).toBe(960);
    expect(stored.dataUrl).toBe("data:image/webp;base64,small");
  });

  it("never enlarges a picture that is already small enough", async () => {
    stubCanvas(() => "data:image/webp;base64,small");
    const stored = await downscaleImage("data:image/png;base64,tiny", () =>
      Promise.resolve(fakeImage(320, 180)),
    );

    expect(stored.width).toBe(320);
    expect(stored.height).toBe(180);
  });

  it("falls back to jpeg when the browser ignores webp", async () => {
    stubCanvas((type) =>
      type === "image/webp" ? "data:image/png;base64,ignored" : "data:image/jpeg;base64,ok",
    );
    const stored = await downscaleImage("data:image/png;base64,huge", () =>
      Promise.resolve(fakeImage(2000, 2000)),
    );

    expect(stored.dataUrl).toBe("data:image/jpeg;base64,ok");
  });

  it("records what it produced so the card frames on its first paint", async () => {
    stubCanvas(() => "data:image/webp;base64,framed");
    const stored = await downscaleImage("data:image/png;base64,huge", () =>
      Promise.resolve(fakeImage(2560, 1440)),
    );

    expect(imageOutcomeOf(stored.dataUrl)).toBe("ok");
    expect(naturalRatioOf(stored.dataUrl)).toBeCloseTo(16 / 9, 2);
  });
});
