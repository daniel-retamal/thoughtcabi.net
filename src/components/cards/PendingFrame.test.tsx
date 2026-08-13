import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { PendingFrame } from "./PendingFrame";

describe("PendingFrame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reserves the frame and says nothing at all to begin with", () => {
    const { container } = render(<PendingFrame />);

    expect(container.querySelector(".cover.holding")).not.toBeNull();
    expect(container.querySelector(".late")).toBeNull();
  });

  it("gives the abnormal case, and only it, words", () => {
    render(<PendingFrame />);

    act(() => {
      vi.advanceTimersByTime(3900);
    });
    expect(screen.queryByText("still fetching")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText("still fetching")).toBeInTheDocument();
  });
});
