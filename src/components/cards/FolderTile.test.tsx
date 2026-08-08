import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { makeFolder, makeNote } from "@/test/factories";
import type { Folder } from "@/domain/model";
import { FolderTile } from "./FolderTile";

function renderTile(folder: Folder) {
  const handlers = { onOpen: vi.fn(), onRename: vi.fn(), onDelete: vi.fn() };
  const { container } = render(<FolderTile folder={folder} {...handlers} />);
  const mosaic = container.querySelector(".folder-mosaic") as HTMLElement;
  return { container, mosaic, cells: [...mosaic.children] };
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
});
