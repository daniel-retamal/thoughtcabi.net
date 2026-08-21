import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import { makeNote, makeTag } from "@/test/factories";
import { TAG_PALETTE } from "@/domain/tags/palette";
import type { Note } from "@/domain/model";
import { NoteDetailModal } from "./NoteDetailModal";

function renderDetail(note: Note = makeNote()) {
  const handlers = { onEdit: vi.fn(), onClose: vi.fn() };
  const { container } = render(
    <NoteDetailModal
      note={note}
      tags={[makeTag("To read", TAG_PALETTE[0] ?? "#fff")]}
      location="Reading"
      {...handlers}
    />,
  );
  return { container, handlers };
}

describe("NoteDetailModal", () => {
  it("shows the picture at its own ratio, in no frame at all", () => {
    const { container } = renderDetail(makeNote({ siteImage: "https://example.com/og.png" }));

    expect(container.querySelector(".cover")).toBeNull();
    expect(container.querySelector(".shot img")).toHaveClass("shot-img");
  });

  it("declares the width it is really rendered at, not the modal's", () => {
    const { container } = renderDetail(
      makeNote({ siteImage: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" }),
    );

    expect(container.querySelector(".shot img")).toHaveAttribute("sizes", "min(612px, 88vw)");
  });

  it("keeps its actions out of the scrolling region, however tall the picture is", () => {
    const { container } = renderDetail(makeNote({ siteImage: "https://example.com/tall.png" }));

    const footer = container.querySelector(".modal-footer");
    expect(footer).not.toBeNull();
    expect(footer).toContainElement(screen.getByRole("link", { name: /Open original/ }));
    expect(container.querySelector(".modal-scroll .modal-actions")).toBeNull();
  });

  it("scrolls the picture away with the text rather than holding it above them", () => {
    const { container } = renderDetail(makeNote({ siteImage: "https://example.com/tall.png" }));

    expect(container.querySelector(".modal-scroll > .shot")).not.toBeNull();
    expect(container.querySelector(".modal-scroll > .modal-body")).not.toBeNull();
  });

  it("has no picture region at all when the save has no picture", () => {
    const { container } = renderDetail(makeNote({ favicon: "https://example.com/icon.png" }));

    expect(container.querySelector(".shot")).toBeNull();
    expect(container.querySelector(".cover")).toBeNull();
    expect(container.querySelector(".mark-plate")).toBeNull();
  });

  it("drops the region rather than showing a broken picture", () => {
    const { container } = renderDetail(makeNote({ image: "https://example.com/gone.png" }));

    fireEvent.error(container.querySelector(".shot img") as HTMLImageElement);

    expect(container.querySelector(".shot img")).toBeNull();
  });

  it("still shows the title and the source under the picture", () => {
    renderDetail(makeNote({ title: "On Rereading", siteImage: "https://example.com/og.png" }));

    expect(screen.getByRole("heading", { name: "On Rereading" })).toBeInTheDocument();
    expect(screen.getByText("Example")).toBeInTheDocument();
  });
});
