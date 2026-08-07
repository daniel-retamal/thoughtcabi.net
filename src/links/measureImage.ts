import type { ImageMeasurement } from "@/domain/links/imageCandidate";

export type ImageMeasurer = (url: string) => Promise<ImageMeasurement>;

export const MEASURE_TIMEOUT_MS = 8_000;

export function measureImage(
  url: string,
  timeoutMs = MEASURE_TIMEOUT_MS,
): Promise<ImageMeasurement> {
  if (typeof Image !== "function") return Promise.resolve({ status: "unknown" });

  return new Promise((resolve) => {
    const image = new Image();
    let timer = 0;

    const finish = (measurement: ImageMeasurement): void => {
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(measurement);
    };

    timer = window.setTimeout(() => finish({ status: "unknown" }), timeoutMs);

    image.onload = () =>
      finish({
        status: "measured",
        size: { width: image.naturalWidth, height: image.naturalHeight },
      });
    image.onerror = () => finish({ status: "unreachable" });

    image.decoding = "async";
    image.src = url;
  });
}
