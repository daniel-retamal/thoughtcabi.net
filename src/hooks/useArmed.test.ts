import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useArmed } from "./useArmed";

describe("useArmed", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts disarmed and arms on request", () => {
    const { result } = renderHook(() => useArmed());
    expect(result.current.armed).toBe(false);

    act(() => result.current.arm());
    expect(result.current.armed).toBe(true);

    act(() => result.current.disarm());
    expect(result.current.armed).toBe(false);
  });

  it("goes back to safe after four idle seconds", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useArmed());

    act(() => result.current.arm());
    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(result.current.armed).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.armed).toBe(false);
  });
});
