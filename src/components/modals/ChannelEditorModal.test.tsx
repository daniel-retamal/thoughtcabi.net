import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChannelEditorModal, type ChannelEditorModalProps } from "./ChannelEditorModal";

function renderEditor(overrides: Partial<ChannelEditorModalProps> = {}) {
  const handlers = { onConfirm: vi.fn(), onDelete: vi.fn(), onCancel: vi.fn() };

  render(
    <ChannelEditorModal
      mode="edit"
      initialName="Design"
      initialIcon="palette"
      canDelete
      saveCount={24}
      {...handlers}
      {...overrides}
    />,
  );

  return handlers;
}

function deleteButton(): HTMLElement {
  return screen.getByRole("button", { name: /delete/i });
}

describe("ChannelEditorModal", () => {
  it("states the cost on the button rather than destroying on the first click", async () => {
    const handlers = renderEditor();

    await userEvent.click(deleteButton());
    expect(handlers.onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /delete 24 saves\?/i })).toHaveClass("armed");

    await userEvent.click(deleteButton());
    expect(handlers.onDelete).toHaveBeenCalledTimes(1);
  });

  it("still asks twice for a channel that holds nothing", async () => {
    renderEditor({ saveCount: 0 });

    await userEvent.click(deleteButton());
    expect(screen.getByRole("button", { name: /delete channel\?/i })).toBeInTheDocument();
  });

  it("lets the first escape cancel the arming and the second close the editor", async () => {
    const handlers = renderEditor();
    await userEvent.click(deleteButton());

    await userEvent.keyboard("{Escape}");
    expect(handlers.onCancel).not.toHaveBeenCalled();
    expect(deleteButton()).toHaveTextContent("Delete");
    expect(deleteButton()).not.toHaveClass("armed");

    await userEvent.keyboard("{Escape}");
    expect(handlers.onCancel).toHaveBeenCalledTimes(1);
  });

  it("disarms when the editor is used for anything else", async () => {
    renderEditor();
    await userEvent.click(deleteButton());

    await userEvent.type(screen.getByPlaceholderText("e.g. Inspiration"), "!");
    expect(deleteButton()).not.toHaveClass("armed");
  });

  it("refuses to delete the last channel, and says why", () => {
    renderEditor({ canDelete: false });

    expect(deleteButton()).toBeDisabled();
    expect(
      screen.getByText("Your cabinet keeps at least one channel. Rename this one instead."),
    ).toBeInTheDocument();
  });

  it("offers no delete at all while the channel is being made", () => {
    renderEditor({ mode: "new", initialName: "", saveCount: 0 });
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });
});
