import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LinkPreview } from "@/domain/links/linkPreview";
import { TAG_PALETTE } from "@/domain/tags/palette";
import { serializeCabinet } from "@/storage/cabinetFile";
import { STORAGE_KEYS } from "@/storage/keys";
import { makeLibrary, makeTag } from "@/test/factories";
import { App } from "./App";

function sidebar(): HTMLElement {
  return document.querySelector("aside.sidebar") as HTMLElement;
}

function content(): HTMLElement {
  return document.querySelector(".body-inner") as HTMLElement;
}

function withSaves(): void {
  localStorage.setItem(
    STORAGE_KEYS.cabinet,
    JSON.stringify({
      library: makeLibrary(),
      tags: [
        makeTag("To read", TAG_PALETTE[2]),
        makeTag("Reference", TAG_PALETTE[4]),
        makeTag("Later", TAG_PALETTE[5]),
      ],
    }),
  );
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

  it("opens a brand-new cabinet on one empty shelf and teaches the gesture", () => {
    render(<App />);

    expect(within(sidebar()).getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Your cabinet is empty.")).toBeInTheDocument();
    expect(screen.getByText("Shelves")).toBeInTheDocument();
  });

  it("acts on nothing with nothing: no count, no view switch, no new folder", () => {
    render(<App />);

    expect(screen.queryByLabelText("Row view")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("New folder")).not.toBeInTheDocument();
    expect(document.querySelector(".count-pill")).toBeNull();
  });

  it("keeps the tools but drops the count in a shelf that is merely empty", async () => {
    withSaves();
    render(<App />);

    await userEvent.click(screen.getByText("Empty", { selector: ".folder-name" }));

    expect(screen.getByLabelText("Row view")).toBeInTheDocument();
    expect(document.querySelector(".count-pill")).toBeNull();
  });

  it("stops teaching once something has been saved, even after it is deleted", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await userEvent.type(screen.getByPlaceholderText("What is this?"), "A thought");
    const compose = document.querySelector(".modal") as HTMLElement;
    await userEvent.click(within(compose).getByRole("button", { name: /^save$/i }));

    await userEvent.click(screen.getByLabelText("Remove"));

    expect(screen.getByText("Nothing saved.")).toBeInTheDocument();
    expect(screen.queryByText("Your cabinet is empty.")).not.toBeInTheDocument();
    expect(screen.queryByText("Shelves")).not.toBeInTheDocument();
  });

  it("opens on what was saved last time", () => {
    withSaves();
    render(<App />);

    expect(within(sidebar()).getByText("Reading")).toBeInTheDocument();
    expect(within(sidebar()).getByText("Research")).toBeInTheDocument();
    expect(screen.getByText("Essays")).toBeInTheDocument();
    expect(screen.getByText("Folders")).toBeInTheDocument();
  });

  it("drills into a folder and back out through the breadcrumbs", async () => {
    withSaves();
    render(<App />);
    await userEvent.click(screen.getByText("Essays"));

    const crumbs = document.querySelector(".crumbs") as HTMLElement;
    expect(within(crumbs).getByText("Essays")).toBeInTheDocument();
    expect(screen.getByText("Items")).toBeInTheDocument();

    await userEvent.click(within(crumbs).getByText("Reading"));
    expect(screen.getByText("Essays")).toBeInTheDocument();
  });

  it("switches shelves from the sidebar", async () => {
    withSaves();
    render(<App />);
    await userEvent.click(within(sidebar()).getByText("Research"));
    expect(screen.getByText("Zettelkasten")).toBeInTheDocument();
    expect(screen.queryByText("Essays")).not.toBeInTheDocument();
  });

  it("names the empty shelf it is standing in", async () => {
    withSaves();
    render(<App />);

    await userEvent.click(screen.getByLabelText("New shelf"));
    await userEvent.type(screen.getByPlaceholderText("e.g. Inspiration"), "Recipes");
    await userEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(screen.getByText("Nothing in Recipes yet.")).toBeInTheDocument();
    expect(screen.queryByText("Your cabinet is empty.")).not.toBeInTheDocument();
  });

  it("says which folder is empty from inside it", async () => {
    withSaves();
    render(<App />);
    await userEvent.click(screen.getByText("Empty", { selector: ".folder-name" }));

    expect(screen.getByText("This folder is empty.")).toBeInTheDocument();
  });

  it("searches across every shelf", async () => {
    withSaves();
    render(<App />);
    await userEvent.type(screen.getByLabelText("Search your cabinet"), "zettelkasten");

    expect(screen.getByText("Results across all shelves")).toBeInTheDocument();
    expect(screen.getByText("Zettelkasten")).toBeInTheDocument();
  });

  it("quotes a search that found nothing, and drops it again", async () => {
    withSaves();
    render(<App />);
    await userEvent.type(screen.getByLabelText("Search your cabinet"), "qqqqzzz");
    expect(screen.getByText("No matches for “qqqqzzz”.")).toBeInTheDocument();

    const quiet = document.querySelector(".es-quiet") as HTMLElement;
    await userEvent.click(within(quiet).getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("Essays")).toBeInTheDocument();
  });

  it("remembers the row view", async () => {
    withSaves();
    render(<App />);
    await userEvent.click(screen.getByLabelText("Row view"));

    expect(document.querySelector(".notes-list")).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.preferences)).toContain('"view":"list"');
  });

  it("keeps one plate for both views, so switching moves nothing but the items", async () => {
    withSaves();
    render(<App />);
    const plate = content().className;

    await userEvent.click(screen.getByLabelText("Row view"));

    expect(document.querySelector(".notes-list")).toBeInTheDocument();
    expect(content().className).toBe(plate);
  });

  it("creates a folder and persists it", async () => {
    withSaves();
    render(<App />);
    await userEvent.click(screen.getByLabelText("New folder"));
    await userEvent.type(screen.getByPlaceholderText("e.g. Read later"), "Inbox");
    await userEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(screen.getByText("Inbox")).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.cabinet)).toContain("Inbox");
  });

  it("creates a shelf and opens it", async () => {
    withSaves();
    render(<App />);
    await userEvent.click(screen.getByLabelText("New shelf"));
    await userEvent.type(screen.getByPlaceholderText("e.g. Inspiration"), "Recipes");
    await userEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(within(sidebar()).getByText("Recipes")).toBeInTheDocument();
  });

  it("offers the action instead of reporting the absence when there are no tags", async () => {
    render(<App />);

    await userEvent.click(within(sidebar()).getByRole("button", { name: "Add a tag" }));
    expect(screen.getByPlaceholderText("e.g. To read")).toBeInTheDocument();
  });

  it("filters the library by tag and clears the filter again", async () => {
    withSaves();
    render(<App />);
    await userEvent.click(within(sidebar()).getByText("Later"));
    expect(screen.getByText("Nothing tagged Later.")).toBeInTheDocument();

    await userEvent.click(within(sidebar()).getByText("Later"));
    expect(screen.getByText("Essays")).toBeInTheDocument();
  });

  it("opens a note's detail and closes it again", async () => {
    withSaves();
    render(<App />);
    await userEvent.click(screen.getByText("Essays"));
    await userEvent.click(screen.getByText("On Rereading"));

    const modal = document.querySelector(".modal") as HTMLElement;
    expect(within(modal).getByText("In folder")).toBeInTheDocument();
    expect(within(modal).getByText("Essays")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(document.querySelector(".modal")).toBeNull();
  });

  it("saves a note by hand into the chosen destination", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await userEvent.type(screen.getByPlaceholderText("What is this?"), "A thought worth keeping");

    const compose = document.querySelector(".modal") as HTMLElement;
    await userEvent.click(within(compose).getByRole("button", { name: /^save$/i }));

    expect(screen.getByText("A thought worth keeping")).toBeInTheDocument();
    expect(screen.getByText("Saved to")).toBeInTheDocument();
  });

  describe("deleting", () => {
    function toast(): HTMLElement {
      return document.querySelector(".toast") as HTMLElement;
    }

    function sidebarRow(name: string): HTMLElement {
      return within(sidebar()).getByText(name).closest(".lib-row") as HTMLElement;
    }

    it("takes a card back out of the bin when asked", async () => {
      withSaves();
      render(<App />);

      await userEvent.click(screen.getByText("Essays"));
      const card = screen.getByText("On Rereading").closest(".card") as HTMLElement;
      await userEvent.click(within(card).getByLabelText("Remove"));

      expect(card).not.toBeInTheDocument();
      expect(toast()).toHaveTextContent("Deleted On Rereading");

      await userEvent.click(within(toast()).getByRole("button", { name: "Undo" }));
      expect(within(content()).getByText("On Rereading")).toBeInTheDocument();
    });

    it("spends the undo once, however many times it is asked", async () => {
      withSaves();
      render(<App />);

      await userEvent.click(within(sidebarRow("Research")).getByLabelText("Edit shelf"));
      await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));
      await userEvent.click(screen.getByRole("button", { name: /delete 1 save\?/i }));

      const undo = within(toast()).getByRole("button", { name: "Undo" });
      await userEvent.click(undo);

      expect(toast()).toBeNull();
      expect(undo).not.toBeInTheDocument();
      expect(within(sidebar()).getAllByText("Research")).toHaveLength(1);
    });

    it("undoes the last deletion from the keyboard", async () => {
      withSaves();
      render(<App />);

      await userEvent.click(screen.getByText("Essays"));
      const card = screen.getByText("On Rereading").closest(".card") as HTMLElement;
      await userEvent.click(within(card).getByLabelText("Remove"));
      expect(card).not.toBeInTheDocument();

      await userEvent.keyboard("{Control>}z{/Control}");

      expect(within(content()).getByText("On Rereading")).toBeInTheDocument();
      expect(toast()).toBeNull();
    });

    it("leaves the keyboard undo alone once the toast has gone", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      withSaves();
      render(<App />);

      await userEvent.click(screen.getByText("Essays"));
      const card = screen.getByText("On Rereading").closest(".card") as HTMLElement;
      await userEvent.click(within(card).getByLabelText("Remove"));

      act(() => {
        vi.advanceTimersByTime(9000);
      });
      expect(toast()).toBeNull();

      await userEvent.keyboard("{Control>}z{/Control}");

      expect(within(content()).queryByText("On Rereading")).not.toBeInTheDocument();
      vi.useRealTimers();
    });

    it("brings a whole shelf back, contents and all", async () => {
      withSaves();
      render(<App />);

      await userEvent.click(within(sidebarRow("Research")).getByLabelText("Edit shelf"));
      await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));
      await userEvent.click(screen.getByRole("button", { name: /delete 1 save\?/i }));

      expect(within(sidebar()).queryByText("Research")).not.toBeInTheDocument();

      await userEvent.click(within(toast()).getByRole("button", { name: "Undo" }));
      await userEvent.click(within(sidebar()).getByText("Research"));
      expect(screen.getByText("Zettelkasten")).toBeInTheDocument();
    });

    it("will not let the last shelf go", async () => {
      render(<App />);

      await userEvent.click(within(sidebarRow("Saved")).getByLabelText("Edit shelf"));

      expect(screen.getByRole("button", { name: /delete/i })).toBeDisabled();
      expect(screen.getByText(/keeps at least one shelf/)).toBeInTheDocument();
    });

    it("gives a tag back to the cards that wore it", async () => {
      withSaves();
      render(<App />);

      await userEvent.click(within(sidebarRow("To read")).getByLabelText("Edit tag"));
      await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));
      expect(within(sidebar()).queryByText("To read")).not.toBeInTheDocument();

      await userEvent.click(within(toast()).getByRole("button", { name: "Undo" }));
      await userEvent.click(within(sidebar()).getByText("To read"));
      expect(screen.getByText("On Rereading")).toBeInTheDocument();
    });

    it("asks on the folder itself before emptying it, then offers the way back", async () => {
      withSaves();
      render(<App />);

      const tile = screen.getByText("Essays").closest(".folder-tile") as HTMLElement;
      await userEvent.click(within(tile).getByLabelText("Delete folder"));
      await userEvent.click(within(tile).getByRole("button", { name: "Delete" }));

      expect(tile).not.toBeInTheDocument();
      expect(toast()).toHaveTextContent("Deleted Essays");

      await userEvent.click(within(toast()).getByRole("button", { name: "Undo" }));
      expect(within(content()).getByText("Essays")).toBeInTheDocument();
    });
  });

  it("shows the card itself the moment a link is pasted, then fills it in", async () => {
    const { readLink, resolve } = deferredReader();
    render(<App readLink={readLink} />);

    pasteText("https://example.com/the-quiet-revolution");

    const card = document.querySelector(".card.pending") as HTMLElement;
    expect(card).toBeInTheDocument();
    expect(within(card).getByText("example.com")).toBeInTheDocument();
    expect(within(card).getByText("The Quiet Revolution")).toHaveClass("provisional");
    expect(card.querySelector(".cover.holding")).toBeInTheDocument();

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

    expect(document.querySelector(".card.pending")).not.toBeInTheDocument();
    expect(document.querySelector(".cover.holding")).not.toBeInTheDocument();
    expect(screen.getByText("The Quiet Revolution")).not.toHaveClass("provisional");
    expect(screen.getByText("How reading changed.")).toBeInTheDocument();
    expect(screen.getByText("Saved to")).toBeInTheDocument();
  });

  it("keeps the pending card in the place it will stay, and never pops it in", async () => {
    const { readLink, resolve } = deferredReader();
    render(<App readLink={readLink} />);

    pasteText("https://example.com/the-quiet-revolution");
    const before = [...document.querySelectorAll(".notes-grid > .card")].indexOf(
      document.querySelector(".card.pending") as HTMLElement,
    );

    await resolve(null);

    const cards = [...document.querySelectorAll(".notes-grid > .card")];
    const resolved = screen.getByText("The Quiet Revolution").closest(".card") as HTMLElement;

    expect(cards.indexOf(resolved)).toBe(before);
    expect(resolved).not.toHaveClass("fresh");
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

    expect(document.querySelector(".card.pending")).not.toBeInTheDocument();
  });

  it("does not persist a placeholder that never resolved", () => {
    const { readLink } = deferredReader();
    render(<App readLink={readLink} />);

    pasteText("https://example.com/in-flight");

    expect(document.querySelector(".card.pending")).toBeInTheDocument();
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

  describe("export and import", () => {
    function stubDownload(): { downloads: string[] } {
      const downloads: string[] = [];
      Object.defineProperty(URL, "createObjectURL", {
        value: () => "blob:cabinet",
        configurable: true,
        writable: true,
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        value: () => undefined,
        configurable: true,
        writable: true,
      });
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        downloads.push(this.download);
      });
      return { downloads };
    }

    function cabinetFile(): File {
      const text = serializeCabinet(
        {
          library: [
            {
              id: "ch-file",
              name: "Recipes",
              icon: "hash",
              children: [
                {
                  id: "n-file",
                  type: "note",
                  title: "Sourdough, slowly",
                  description: "",
                  tag: "Later",
                  addedAt: 1_700_000_000_000,
                  url: "https://example.com/sourdough",
                  domain: "example.com",
                  siteName: "Example",
                  cat: "article",
                  catLabel: "Article",
                },
              ],
            },
          ],
          tags: [{ name: "Later", color: TAG_PALETTE[4] }],
        },
        Date.UTC(2026, 7, 8),
      );
      return new File([text], "backup.json", { type: "application/json" });
    }

    async function openTransfer(): Promise<void> {
      await userEvent.click(screen.getByLabelText("Export and import"));
      await userEvent.upload(
        screen.getByLabelText("Drop a cabinet file, or click to choose"),
        cabinetFile(),
      );
      await screen.findByText("backup.json");
    }

    it("downloads the cabinet as a dated file", async () => {
      const { downloads } = stubDownload();
      render(<App />);

      await userEvent.click(screen.getByLabelText("Export and import"));
      await userEvent.click(screen.getByRole("button", { name: "Download" }));

      expect(downloads).toEqual([
        expect.stringMatching(/^thoughtcabinet-\d{4}-\d{2}-\d{2}\.json$/),
      ]);
    });

    it("merges an imported file in beside what is already saved", async () => {
      withSaves();
      render(<App />);

      await openTransfer();
      await userEvent.click(screen.getByRole("button", { name: "Merge" }));

      expect(screen.getByText("Sourdough, slowly")).toBeInTheDocument();
      expect(within(sidebar()).getByText("Recipes")).toBeInTheDocument();
      expect(within(sidebar()).getByText("Reading")).toBeInTheDocument();
      expect(within(sidebar()).getByText("Later")).toBeInTheDocument();
      expect(localStorage.getItem(STORAGE_KEYS.cabinet)).toContain("Sourdough");
    });

    it("replaces the whole cabinet when asked to", async () => {
      withSaves();
      render(<App />);

      await openTransfer();
      await userEvent.click(screen.getByRole("button", { name: "Replace" }));

      expect(screen.getByText("Sourdough, slowly")).toBeInTheDocument();
      expect(within(sidebar()).queryByText("Reading")).not.toBeInTheDocument();
    });

    it("gives an imported card an id of its own when merging", async () => {
      render(<App />);

      await openTransfer();
      await userEvent.click(screen.getByRole("button", { name: "Merge" }));

      expect(localStorage.getItem(STORAGE_KEYS.cabinet)).not.toContain("n-file");
    });
  });
});
