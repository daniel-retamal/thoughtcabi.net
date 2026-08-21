import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeFolder, makeNote, makePendingNote } from "@/test/factories";
import type { Folder } from "@/domain/model";
import { FolderTile } from "./FolderTile";

function renderTile(folder: Folder) {
  const handlers = { onOpen: vi.fn(), onRename: vi.fn(), onDelete: vi.fn() };
  const { container } = render(<FolderTile folder={folder} {...handlers} />);
  const mosaic = container.querySelector(".folder-mosaic") as HTMLElement;
  return { container, handlers, mosaic, cells: [...mosaic.children] };
}

describe("FolderTile", () => {
  it("previews what the folder actually holds", () => {
    const { mosaic, cells } = renderTile(
      makeFolder("Essays", [
        makeNote({ siteImage: "https://example.com/og.png" }),
        makeNote({ favicon: "https://example.com/icon.png" }),
      ]),
    );

    expect(mosaic).toHaveClass("slots-2");
    expect(cells).toHaveLength(2);
    expect(cells[0]?.querySelector(".img-fill")).toHaveAttribute(
      "src",
      "https://example.com/og.png",
    );
    expect(cells[1]?.querySelector(".mark-plate img")).toHaveAttribute(
      "src",
      "https://example.com/icon.png",
    );
  });

  it("falls through to the monogram rather than leaving a cell blank", () => {
    const { cells } = renderTile(
      makeFolder("Quiet", [makeNote({ url: "", domain: "", siteName: "", title: "Kept" })]),
    );

    expect(cells[0]?.querySelector(".mark-letter")).toHaveTextContent("K");
  });

  it("shows a subfolder as a folder rather than as a missing picture", () => {
    const { cells } = renderTile(makeFolder("Nested", [makeFolder("Inside", [makeNote()])]));
    expect(cells[0]).toHaveClass("cell-folder");
  });

  it("gives the lead cell to a card, and a subfolder whatever is left", () => {
    const { cells } = renderTile(
      makeFolder("Nested", [
        makeFolder("Inside", [makeNote()]),
        makeNote({ siteImage: "https://example.com/og.png" }),
      ]),
    );

    expect(cells[0]).toHaveClass("cell-tall");
    expect(cells[0]?.querySelector(".img-fill")).toHaveAttribute(
      "src",
      "https://example.com/og.png",
    );
    expect(cells[1]).toHaveClass("cell-folder");
  });

  it("drops a subfolder off the mosaic before it drops a card", () => {
    const { cells } = renderTile(
      makeFolder("Nested", [
        makeFolder("One", []),
        makeFolder("Two", []),
        makeNote(),
        makeNote(),
        makeNote(),
      ]),
    );

    expect(cells).toHaveLength(3);
    expect(cells.filter((cell) => cell.classList.contains("cell-folder"))).toHaveLength(0);
  });

  it("holds a cell for a link that is still loading instead of shuffling later", () => {
    const { mosaic, cells } = renderTile(
      makeFolder("Nested", [makePendingNote(), makeFolder("Inside", [])]),
    );

    expect(mosaic).toHaveClass("slots-2");
    expect(cells[0]).toHaveClass("cell-holding");
    expect(cells[1]).toHaveClass("cell-folder");
  });

  it("keeps the frame filled when a folder is empty", () => {
    const { mosaic, cells } = renderTile(makeFolder("Empty", []));
    expect(mosaic).toHaveClass("slots-0");
    expect(cells).toHaveLength(1);
  });

  it("never previews more than the mosaic holds", () => {
    const { mosaic, cells } = renderTile(
      makeFolder("Busy", [makeNote(), makeNote(), makeNote(), makeNote(), makeNote()]),
    );
    expect(mosaic).toHaveClass("slots-3");
    expect(cells).toHaveLength(3);
  });

  it("counts only its direct children in the summary", () => {
    const { container } = renderTile(
      makeFolder("Mixed", [makeFolder("Inside", [makeNote(), makeNote()]), makeNote()]),
    );
    expect(container.querySelector(".folder-sub")).toHaveTextContent("1 folder · 1 item");
  });

  it("asks on its own face before it takes saves down with it", async () => {
    const { handlers } = renderTile(
      makeFolder("Typography", [makeFolder("Inside", [makeNote(), makeNote()]), makeNote()]),
    );

    await userEvent.click(screen.getByLabelText("Delete folder"));
    expect(handlers.onDelete).not.toHaveBeenCalled();
    expect(screen.getByText("Delete 3 saves?")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(handlers.onDelete).toHaveBeenCalledTimes(1);
  });

  it("does not open the folder it is asking about", async () => {
    const { handlers } = renderTile(makeFolder("Typography", [makeNote()]));

    await userEvent.click(screen.getByLabelText("Delete folder"));
    await userEvent.click(screen.getByText("Delete 1 save?"));

    expect(handlers.onOpen).not.toHaveBeenCalled();
  });

  it("keeps the folder when asked to, and on a click anywhere else", async () => {
    const { handlers } = renderTile(makeFolder("Typography", [makeNote()]));

    await userEvent.click(screen.getByLabelText("Delete folder"));
    await userEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(screen.queryByText("Delete 1 save?")).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Delete folder"));
    await userEvent.click(document.body);
    expect(screen.queryByText("Delete 1 save?")).not.toBeInTheDocument();
    expect(handlers.onDelete).not.toHaveBeenCalled();
  });

  it("deletes an empty folder on the first click, since nothing is lost", async () => {
    const { handlers } = renderTile(makeFolder("Scratch", []));

    await userEvent.click(screen.getByLabelText("Delete folder"));
    expect(handlers.onDelete).toHaveBeenCalledTimes(1);
  });
});
