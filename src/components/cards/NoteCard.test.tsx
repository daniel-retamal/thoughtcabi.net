import { describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { makeNote, makeTag } from "@/test/factories";
import { TAG_PALETTE } from "@/domain/tags/palette";
import { NoteCard } from "./NoteCard";

function renderCard(note = makeNote(), tags = [makeTag("To read", TAG_PALETTE[0])]) {
  const handlers = { onOpen: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
  const { container } = render(<NoteCard note={note} tags={tags} fresh={false} {...handlers} />);
  return { handlers, container };
}

describe("NoteCard", () => {
  it("shows the title, source chip and domain", () => {
    renderCard(makeNote({ title: "On Rereading", catLabel: "Article", domain: "newyorker.com" }));
    expect(screen.getByText("On Rereading")).toBeInTheDocument();
    expect(screen.getByText("Article")).toBeInTheDocument();
    expect(screen.getByText("newyorker.com")).toBeInTheDocument();
  });

  it("falls back to a quiet Untitled", () => {
    renderCard(makeNote({ title: "" }));
    expect(screen.getByText("Untitled")).toBeInTheDocument();
  });

  it("shows the tag only when the note carries one", () => {
    renderCard(makeNote({ tag: "To read" }));
    expect(screen.getByText("To read")).toBeInTheDocument();
  });

  it("hides an unknown tag name", () => {
    renderCard(makeNote({ tag: "Deleted tag" }));
    expect(screen.queryByText("Deleted tag")).not.toBeInTheDocument();
  });

  it("starts at its title when there is no picture and no icon to show", () => {
    const { container } = renderCard(makeNote({ url: "", domain: "" }));
    expect(container.querySelector(".card")).toHaveClass("no-cover");
    expect(container.querySelector(".cover")).toBeNull();
  });

  it("shows the site's icon in the frame when the page published no image", () => {
    const { container } = renderCard(makeNote({ favicon: "https://example.com/touch-icon.png" }));
    const cover = container.querySelector(".icon-cover");

    expect(container.querySelector(".card")).not.toHaveClass("no-cover");
    expect(cover?.querySelector("img")).toHaveAttribute(
      "src",
      "https://example.com/touch-icon.png",
    );
  });

  it("seats the icon on a plate rather than on the field itself", () => {
    const { container } = renderCard(makeNote({ favicon: "https://example.com/touch-icon.png" }));
    expect(container.querySelector(".icon-cover .cover-plate img")).not.toBeNull();
  });

  it("shrinks to a small icon's own size rather than blowing it up", () => {
    const { container } = renderCard(makeNote({ favicon: "https://example.com/tiny.png" }));
    const icon = container.querySelector(".icon-cover img") as HTMLImageElement;

    Object.defineProperty(icon, "naturalWidth", { value: 16 });
    Object.defineProperty(icon, "naturalHeight", { value: 16 });
    fireEvent.load(icon);

    expect(icon.style.width).toBe("16px");
  });

  it("does not repeat the site icon beside the domain", () => {
    const { container } = renderCard(makeNote({ favicon: "https://example.com/touch-icon.png" }));
    expect(container.querySelector(".card-foot img")).toBeNull();
  });

  it("prefers the page's own image over the icon", () => {
    const { container } = renderCard(makeNote({ siteImage: "https://example.com/og.png" }));
    expect(container.querySelector(".img-cover")).not.toBeNull();
    expect(container.querySelector(".icon-cover")).toBeNull();
  });

  it("shows a wide picture whole, because a repo card is words", () => {
    const { container } = renderCard(makeNote({ siteImage: "https://example.com/repo.png" }));
    const picture = container.querySelector(".img-cover img") as HTMLImageElement;

    Object.defineProperty(picture, "naturalWidth", { value: 1280 });
    Object.defineProperty(picture, "naturalHeight", { value: 640 });
    fireEvent.load(picture);

    expect(container.querySelector(".cover")).toHaveClass("fitted");
  });

  it("declares the tile's width, which is what the frame really is", () => {
    const { container } = renderCard(
      makeNote({ siteImage: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" }),
    );

    expect(container.querySelector(".img-cover img")).toHaveAttribute("sizes", "264px");
  });

  it("never puts a monogram on a card", () => {
    const { container } = renderCard(makeNote({ favicon: "https://example.com/gone.png" }));

    fireEvent.error(container.querySelector(".icon-cover img") as HTMLImageElement);

    expect(container.querySelector(".mark-letter")).toBeNull();
    expect(container.querySelector(".cover")).toBeNull();
  });

  it("keeps the plate out of sight until the icon has arrived", () => {
    const { container } = renderCard(makeNote({ favicon: "https://example.com/touch-icon.png" }));
    expect(container.querySelector(".cover-plate")).toHaveClass("unsettled");

    fireEvent.load(container.querySelector(".icon-cover img") as HTMLImageElement);
    expect(container.querySelector(".cover-plate")).not.toHaveClass("unsettled");
  });

  it("does not reopen a frame for an icon already known to be missing", () => {
    const note = makeNote({ favicon: "https://example.com/gone.png" });
    const first = renderCard(note);
    fireEvent.error(first.container.querySelector(".icon-cover img") as HTMLImageElement);
    cleanup();

    const { container } = renderCard(note);

    expect(container.querySelector(".cover")).toBeNull();
    expect(container.querySelector(".mark-plate")).toBeNull();
  });

  it("keeps the dot on the card tag, which has no tint of its own", () => {
    const { container } = renderCard(makeNote({ tag: "To read" }));
    expect(container.querySelector(".card-tag .tdot")).not.toBeNull();
  });

  it("opens the note when the card is clicked", async () => {
    const { handlers } = renderCard();
    await userEvent.click(screen.getByText("A saved page"));
    expect(handlers.onOpen).toHaveBeenCalledTimes(1);
  });

  it("edits and deletes without also opening the note", async () => {
    const { handlers } = renderCard();

    await userEvent.click(screen.getByLabelText("Edit"));
    expect(handlers.onEdit).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByLabelText("Remove"));
    expect(handlers.onDelete).toHaveBeenCalledTimes(1);

    expect(handlers.onOpen).not.toHaveBeenCalled();
  });

  it("offers the original link only when there is one", () => {
    renderCard();
    expect(screen.getByLabelText("Open original")).toBeInTheDocument();

    renderCard(makeNote({ url: "", domain: "" }));
    expect(screen.getAllByLabelText("Edit")).toHaveLength(2);
    expect(screen.getAllByLabelText("Open original")).toHaveLength(1);
  });
});
