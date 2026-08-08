import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LinkPreview } from "@/domain/links/linkPreview";
import { STORAGE_KEYS } from "@/storage/keys";
import { App } from "./App";

function sidebar(): HTMLElement {
  return document.querySelector("aside.sidebar") as HTMLElement;
}

function pasteText(text: string): void {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { getData: () => text } });
  act(() => {
    document.dispatchEvent(event);
  });
}

function deferredReader(): {
  readLink: () => Promise<LinkPreview | null>;
  resolve: (preview: LinkPreview | null) => Promise<void>;
} {
  let settle: (preview: LinkPreview | null) => void = () => undefined;
  const pending = new Promise<LinkPreview | null>((resolveWith) => {
    settle = resolveWith;
  });

  return {
    readLink: () => pending,
    resolve: async (preview) => {
      await act(async () => {
        settle(preview);
        await pending;
      });
    },
  };
}

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens on the seeded library", () => {
    render(<App />);
    expect(within(sidebar()).getByText("Reading")).toBeInTheDocument();
    expect(within(sidebar()).getByText("Research")).toBeInTheDocument();
    expect(screen.getByText("Essays")).toBeInTheDocument();
    expect(screen.getByText("Folders")).toBeInTheDocument();
  });

  it("drills into a folder and back out through the breadcrumbs", async () => {
    render(<App />);
    await userEvent.click(screen.getByText("Essays"));

    const crumbs = document.querySelector(".crumbs") as HTMLElement;
    expect(within(crumbs).getByText("Essays")).toBeInTheDocument();
    expect(screen.getByText("Items")).toBeInTheDocument();

    await userEvent.click(within(crumbs).getByText("Reading"));
    expect(screen.getByText("Essays")).toBeInTheDocument();
  });

  it("switches channels from the sidebar", async () => {
    render(<App />);
    await userEvent.click(within(sidebar()).getByText("Research"));
    expect(screen.getByText("Method")).toBeInTheDocument();
    expect(screen.queryByText("Essays")).not.toBeInTheDocument();
  });

  it("searches across every channel", async () => {
    render(<App />);
    await userEvent.type(screen.getByLabelText("Search your cabinet"), "zettelkasten");

    expect(screen.getByText("Results across all channels")).toBeInTheDocument();
    expect(screen.getByText("Zettelkasten")).toBeInTheDocument();
  });

  it("explains an empty search", async () => {
    render(<App />);
    await userEvent.type(screen.getByLabelText("Search your cabinet"), "qqqqzzz");
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });

  it("remembers the row view", async () => {
    render(<App />);
    await userEvent.click(screen.getByLabelText("Row view"));

    expect(document.querySelector(".notes-list")).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.preferences)).toContain('"view":"list"');
  });

  it("creates a folder and persists it", async () => {
    render(<App />);
    await userEvent.click(screen.getByLabelText("New folder"));
    await userEvent.type(screen.getByPlaceholderText("e.g. Read later"), "Inbox");
    await userEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(screen.getByText("Inbox")).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.cabinet)).toContain("Inbox");
  });

  it("creates a channel and opens it", async () => {
    render(<App />);
    await userEvent.click(screen.getByLabelText("New channel"));
    await userEvent.type(screen.getByPlaceholderText("e.g. Inspiration"), "Recipes");
    await userEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(within(sidebar()).getByText("Recipes")).toBeInTheDocument();
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("filters the library by tag and clears the filter again", async () => {
    render(<App />);
    await userEvent.click(within(sidebar()).getByText("To read"));
    expect(screen.getByText("Nothing tagged yet")).toBeInTheDocument();

    await userEvent.click(within(sidebar()).getByText("To read"));
    expect(screen.getByText("Essays")).toBeInTheDocument();
  });

  it("opens a note's detail and closes it again", async () => {
    render(<App />);
    await userEvent.click(screen.getByText("Essays"));
    await userEvent.click(screen.getByText("How to Do Great Work"));

    const modal = document.querySelector(".modal") as HTMLElement;
    expect(within(modal).getByText("In folder")).toBeInTheDocument();
    expect(within(modal).getByText("Essays")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(document.querySelector(".modal")).toBeNull();
  });

  it("saves a note by hand into the chosen destination", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await userEvent.type(screen.getByPlaceholderText("What is this?"), "A thought worth keeping");

    const compose = document.querySelector(".modal") as HTMLElement;
    await userEvent.click(within(compose).getByRole("button", { name: /^save$/i }));

    expect(screen.getByText("A thought worth keeping")).toBeInTheDocument();
    expect(screen.getByText("Saved to")).toBeInTheDocument();
  });

  it("shows a placeholder the moment a link is pasted, then fills it in", async () => {
    const { readLink, resolve } = deferredReader();
    render(<App readLink={readLink} />);

    pasteText("https://example.com/the-quiet-revolution");

    expect(screen.getByText("Reading link…")).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();

    await resolve({
      url: "https://example.com/the-quiet-revolution",
      domain: "example.com",
      title: "The Quiet Revolution",
      description: "How reading changed.",
      siteName: "Example",
      image: "https://example.com/og.png",
      favicon: "https://example.com/favicon.ico",
      cat: "article",
    });

    expect(screen.queryByText("Reading link…")).not.toBeInTheDocument();
    expect(screen.getByText("The Quiet Revolution")).toBeInTheDocument();
    expect(screen.getByText("How reading changed.")).toBeInTheDocument();
    expect(screen.getByText("Saved to")).toBeInTheDocument();
  });

  it("adds nothing of its own when the page had no metadata", async () => {
    const { readLink, resolve } = deferredReader();
    render(<App readLink={readLink} />);

    pasteText("https://example.com/bare-page");
    await resolve({
      url: "https://example.com/bare-page",
      domain: "example.com",
      title: "Bare Page",
      description: "",
      siteName: "",
      image: "",
      favicon: "",
      cat: "link",
    });

    const card = screen.getByText("Bare Page").closest(".card") as HTMLElement;
    expect(card.querySelector(".card-desc")).toBeNull();
    expect(card.querySelector(".img-cover")).toBeNull();
    expect(card.querySelector(".icon-cover img")).toHaveAttribute(
      "src",
      "https://example.com/favicon.ico",
    );
  });

  it("leaves pasted text that is not a link alone", () => {
    const { readLink } = deferredReader();
    render(<App readLink={readLink} />);

    pasteText("just a passing thought");

    expect(screen.queryByText("Reading link…")).not.toBeInTheDocument();
  });

  it("does not persist a placeholder that never resolved", () => {
    const { readLink } = deferredReader();
    render(<App readLink={readLink} />);

    pasteText("https://example.com/in-flight");

    expect(screen.getByText("Reading link…")).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.cabinet)).not.toContain("in-flight");
  });

  it("warns when a save is refused for want of room, until dismissed", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    render(<App />);

    const notice = await screen.findByRole("alert");
    expect(notice).toHaveTextContent(/storage is full/i);

    await userEvent.click(within(notice).getByLabelText("Dismiss"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says nothing about storage while writes succeed", () => {
    render(<App />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
