import { describe, expect, it, vi } from "vitest";
import { makeNote } from "@/test/factories";
import { contextMenuFor, type ContextMenuHandlers } from "./contextMenuItems";

function handlers(): ContextMenuHandlers {
  return {
    onPasteLink: vi.fn(),
    onSaveLink: vi.fn(),
    onNewFolder: vi.fn(),
    onOpen: vi.fn(),
    onEdit: vi.fn(),
    onPasteThumbnail: vi.fn(),
    onDelete: vi.fn(),
  };
}

const labels = (items: readonly { label: string }[]): string[] => items.map((item) => item.label);

describe("contextMenuFor", () => {
  it("leads the background menu with paste, which is the thing the mouse cannot otherwise do", () => {
    const items = contextMenuFor({ kind: "background", canCreateFolder: true }, handlers());

    expect(labels(items)[0]).toBe("Paste link");
    expect(labels(items)).toEqual(["Paste link", "Save link…", "New folder"]);
  });

  it("offers no new folder where one cannot be made", () => {
    const items = contextMenuFor({ kind: "background", canCreateFolder: false }, handlers());

    expect(labels(items)).not.toContain("New folder");
  });

  it("gives a card its own actions, with delete last and marked", () => {
    const items = contextMenuFor({ kind: "note", note: makeNote() }, handlers());

    expect(labels(items)).toEqual([
      "Open",
      "Open original",
      "Edit",
      "Paste as thumbnail",
      "Delete",
    ]);
    expect(items.at(-1)?.danger).toBe(true);
  });

  it("does not offer to open a save that has nowhere to go", () => {
    const items = contextMenuFor({ kind: "note", note: makeNote({ url: "" }) }, handlers());

    expect(labels(items)).not.toContain("Open original");
  });

  it("hands each card action the card it was opened on", () => {
    const note = makeNote();
    const spies = handlers();
    const items = contextMenuFor({ kind: "note", note }, spies);

    items.find((item) => item.label === "Paste as thumbnail")?.run();
    expect(spies.onPasteThumbnail).toHaveBeenCalledWith(note);
  });
});
