import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import { makeNote } from "@/test/factories";
import type { Note } from "@/domain/model";
import { NoteRow } from "./NoteRow";

function renderRow(note: Note) {
  const handlers = { onOpen: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
  const { container } = render(<NoteRow note={note} tags={[]} fresh={false} {...handlers} />);
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

  it("never leaves the slot empty, even for a note with no link at all", () => {
    const { slot } = renderRow(
      makeNote({ title: "A passing thought", url: "", domain: "", siteName: "" }),
    );
    expect(slot.querySelector(".mark-letter")).toHaveTextContent("A");
  });
});
