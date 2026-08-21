import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContextMenu } from "./ContextMenu";
import type { MenuItem } from "./contextMenuItems";

function renderMenu(items: MenuItem[]) {
  const onClose = vi.fn();
  render(<ContextMenu x={40} y={60} items={items} onClose={onClose} />);
  return { onClose };
}

describe("ContextMenu", () => {
  it("runs the item that was chosen and closes behind it", async () => {
    const run = vi.fn();
    const { onClose } = renderMenu([{ icon: "clipboard-paste", label: "Paste link", run }]);

    await userEvent.click(screen.getByRole("menuitem", { name: "Paste link" }));

    expect(run).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape and on a click anywhere else", async () => {
    const { onClose } = renderMenu([
      { icon: "clipboard-paste", label: "Paste link", run: vi.fn() },
    ]);

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.click(document.body);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("stays inside the viewport rather than opening off the edge", () => {
    render(
      <ContextMenu
        x={window.innerWidth + 500}
        y={window.innerHeight + 500}
        items={[{ icon: "clipboard-paste", label: "Paste link", run: vi.fn() }]}
        onClose={vi.fn()}
      />,
    );

    const menu = screen.getByRole("menu");
    expect(Number.parseFloat(menu.style.left)).toBeLessThan(window.innerWidth);
    expect(Number.parseFloat(menu.style.top)).toBeLessThan(window.innerHeight);
  });
});
