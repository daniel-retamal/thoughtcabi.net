import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("marks a card with no thumbnail so it starts at its title", () => {
    const { container } = renderCard(makeNote({ url: "", cover: null, domain: "" }));
    expect(container.querySelector(".card")).toHaveClass("no-thumb");
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

    renderCard(makeNote({ url: "", domain: "", cover: null }));
    expect(screen.getAllByLabelText("Edit")).toHaveLength(2);
    expect(screen.getAllByLabelText("Open original")).toHaveLength(1);
  });
});
