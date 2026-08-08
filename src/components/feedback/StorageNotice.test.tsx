import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StorageNotice } from "./StorageNotice";

describe("StorageNotice", () => {
  it("says the storage is full and what to do about it", () => {
    render(<StorageNotice problem="quota" onDismiss={() => undefined} />);

    const notice = screen.getByRole("alert");
    expect(notice).toHaveTextContent(/storage is full/i);
    expect(notice).toHaveTextContent(/delete a few items/i);
  });

  it("distinguishes storage that is blocked outright", () => {
    render(<StorageNotice problem="unavailable" onDismiss={() => undefined} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/blocking local storage/i);
  });

  it("can be dismissed", async () => {
    const onDismiss = vi.fn();
    render(<StorageNotice problem="quota" onDismiss={onDismiss} />);

    await userEvent.click(screen.getByLabelText("Dismiss"));

    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
