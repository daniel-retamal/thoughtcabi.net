import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { forgetImageOutcomes } from "@/lib/imageOutcomes";

class NoopResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= NoopResizeObserver;

afterEach(() => {
  cleanup();
  localStorage.clear();
  forgetImageOutcomes();
});
