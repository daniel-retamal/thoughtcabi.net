import { describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import { makeNote, makeTag } from "@/test/factories";
import type { Note, Tag } from "@/domain/model";
import { NoteRow } from "./NoteRow";

function renderRow(note: Note, tags: Tag[] = []) {
  const handlers = { onOpen: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
  const { container } = render(<NoteRow note={note} tags={tags} fresh={false} {...handlers} />);
  return { container, slot: container.querySelector(".row-slot") as HTMLElement };
}

describe("NoteRow", () => {
  it("shows the site's thumbnail when there is one", () => {
    const { slot } = renderRow(makeNote({ siteImage: "https://example.com/og.png" }));
    expect(slot.querySelector(".img-fill")).toHaveAttribute("src", "https://example.com/og.png");
  });

  it("falls back to the site's own icon when there is no thumbnail", () => {
    const { slot } = renderRow(makeNote({ favicon: "https://example.com/apple-touch-icon.png" }));
    const icon = slot.querySelector("img");
    expect(icon).toHaveAttribute("src", "https://example.com/apple-touch-icon.png");
    expect(icon).toHaveClass("mark-img");
  });

  it("derives the origin's favicon for a note saved without one", () => {
    const { slot } = renderRow(makeNote({ url: "https://quilt.internal/reports/q3", favicon: "" }));
    expect(slot.querySelector("img")).toHaveAttribute("src", "https://quilt.internal/favicon.ico");
  });

  it("seats the icon on a plate and leaves the monogram bare", () => {
    const withIcon = renderRow(makeNote({ favicon: "https://example.com/icon.png" }));
    expect(withIcon.slot.querySelector(".row-plate img")).not.toBeNull();

    const withoutIcon = renderRow(makeNote({ url: "", domain: "", siteName: "" }));
    expect(withoutIcon.slot.querySelector(".mark-plate")).toBeNull();
  });

  it("does not repeat the site icon beside the domain", () => {
    const { container } = renderRow(makeNote({ favicon: "https://example.com/icon.png" }));
    expect(container.querySelector(".row-dom img")).toBeNull();
  });

  it("loads the mark eagerly so the slot never sits empty waiting for it", () => {
    const { slot } = renderRow(makeNote({ favicon: "https://example.com/icon.png" }));
    expect(slot.querySelector("img")).not.toHaveAttribute("loading", "lazy");
  });

  it("falls back to a monogram when the icon will not load either", () => {
    const { slot } = renderRow(
      makeNote({ domain: "quilt.internal", favicon: "https://quilt.internal/favicon.ico" }),
    );

    fireEvent.error(slot.querySelector("img") as HTMLImageElement);

    expect(slot.querySelector(".mark-letter")).toHaveTextContent("Q");
    expect(slot.querySelector("img")).toBeNull();
  });

  it("falls back to a monogram when the thumbnail itself fails", () => {
    const { slot } = renderRow(
      makeNote({ domain: "quilt.internal", siteImage: "https://quilt.internal/og.png" }),
    );

    fireEvent.error(slot.querySelector(".img-fill") as HTMLImageElement);
    fireEvent.error(slot.querySelector("img") as HTMLImageElement);

    expect(slot.querySelector(".mark-letter")).toHaveTextContent("Q");
  });

  it("gives the kind and the tag a column each, because they are different facts", () => {
    const { container } = renderRow(makeNote({ catLabel: "Article", tag: "To read" }), [
      makeTag("To read", "#ffc93c"),
    ]);

    expect(container.querySelector(".row-kind")).toHaveTextContent("Article");
    expect(container.querySelector(".row-tag-slot")).toHaveTextContent("To read");
  });

  it("puts the tag ahead of the kind, since the tag is the one the reader chose", () => {
    const { container } = renderRow(makeNote({ catLabel: "Article", tag: "To read" }), [
      makeTag("To read", "#ffc93c"),
    ]);
    const tagSlot = container.querySelector(".row-tag-slot") as HTMLElement;
    const kind = container.querySelector(".row-kind") as HTMLElement;

    expect(tagSlot.compareDocumentPosition(kind)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("gives the untagged note's column back to its title instead of reserving it", () => {
    const { container } = renderRow(makeNote({ catLabel: "Article", tag: "" }));

    expect(container.querySelector(".row-tag-slot")).toBeNull();
    expect(container.querySelector(".row-kind")).toHaveTextContent("Article");
  });

  it("leaves the kind column empty for a note with no link to infer it from", () => {
    const { container } = renderRow(makeNote({ url: "", domain: "", siteName: "" }));

    expect(container.querySelector(".row-kind")).toBeEmptyDOMElement();
  });

  it("tints the tag chip with the tag's own color", () => {
    const { container } = renderRow(makeNote({ tag: "To read" }), [makeTag("To read", "#ffc93c")]);
    const chip = container.querySelector(".row-tag") as HTMLElement;

    expect(chip.style.getPropertyValue("--tint")).toBe("#ffc93c");
  });

  it("leaves the dot off a chip that is already tinted", () => {
    const { container } = renderRow(makeNote({ tag: "To read" }), [makeTag("To read", "#ffc93c")]);

    expect(container.querySelector(".row-tag .tdot")).toBeNull();
    expect(container.querySelector(".row-tag")).toHaveTextContent("To read");
  });

  it("never leaves the slot empty, even for a note with no link at all", () => {
    const { slot } = renderRow(
      makeNote({ title: "A passing thought", url: "", domain: "", siteName: "" }),
    );
    expect(slot.querySelector(".mark-letter")).toHaveTextContent("A");
  });

  it("holds the plate back until the icon has actually arrived", () => {
    const { slot } = renderRow(makeNote({ favicon: "https://example.com/icon.png" }));
    expect(slot.querySelector(".mark-plate")).toHaveClass("unsettled");

    fireEvent.load(slot.querySelector("img") as HTMLImageElement);
    expect(slot.querySelector(".mark-plate")).not.toHaveClass("unsettled");
  });

  it("goes straight to the monogram for an icon already known to be missing", () => {
    const note = makeNote({ domain: "quilt.internal", favicon: "https://quilt.internal/gone.png" });
    const first = renderRow(note);
    fireEvent.error(first.slot.querySelector("img") as HTMLImageElement);
    cleanup();

    const { slot } = renderRow(note);

    expect(slot.querySelector(".mark-plate")).toBeNull();
    expect(slot.querySelector(".mark-letter")).toHaveTextContent("Q");
  });

  it("skips a thumbnail already known to be missing rather than trying it again", () => {
    const note = makeNote({ domain: "quilt.internal", siteImage: "https://quilt.internal/og.png" });
    const first = renderRow(note);
    fireEvent.error(first.slot.querySelector(".img-fill") as HTMLImageElement);
    cleanup();

    const { slot } = renderRow(note);

    expect(slot.querySelector(".img-fill")).toBeNull();
    expect(slot.querySelector(".mark-plate")).not.toBeNull();
  });

  it("shows a remembered icon at its measured size without waiting again", () => {
    const note = makeNote({ favicon: "https://example.com/icon.png" });
    const first = renderRow(note);
    const measured = first.slot.querySelector("img") as HTMLImageElement;
    Object.defineProperty(measured, "naturalWidth", { value: 16 });
    Object.defineProperty(measured, "naturalHeight", { value: 16 });
    fireEvent.load(measured);
    cleanup();

    const { slot } = renderRow(note);
    const icon = slot.querySelector("img") as HTMLImageElement;

    expect(slot.querySelector(".mark-plate")).not.toHaveClass("unsettled");
    expect(icon.style.width).toBe("16px");
  });
});
