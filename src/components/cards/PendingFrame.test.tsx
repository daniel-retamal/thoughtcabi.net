import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { en } from "@/i18n/en";
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
    expect(screen.queryByText(en.card.stillFetching)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText(en.card.stillFetching)).toBeInTheDocument();
  });
});
