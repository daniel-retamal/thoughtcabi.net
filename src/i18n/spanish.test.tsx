import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TAG_PALETTE } from "@/domain/tags/palette";
import { STORAGE_KEYS } from "@/storage/keys";
import { makeLibrary, makeTag } from "@/test/factories";
import { App } from "@/App";
import { en } from "./en";
import { es } from "./es";
import { counted, countedTemplate, format } from "./format";

function speakSpanish(): void {
  localStorage.setItem(
    STORAGE_KEYS.preferences,
    JSON.stringify({ view: "grid", color: "ultramarine", cards: "cream", language: "es" }),
  );
}

function withSaves(): void {
  localStorage.setItem(
    STORAGE_KEYS.cabinet,
    JSON.stringify({
      library: makeLibrary(),
      tags: [makeTag("To read", TAG_PALETTE[2]), makeTag("Reference", TAG_PALETTE[4])],
    }),
  );
}

function sidebar(): HTMLElement {
  return document.querySelector("aside.sidebar") as HTMLElement;
}

function sidebarRow(name: string): HTMLElement {
  return within(sidebar()).getByText(name).closest(".lib-row") as HTMLElement;
}

function pasteText(text: string): void {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { getData: () => text } });
  act(() => {
    document.dispatchEvent(event);
  });
}

describe("the app in Spanish", () => {
  beforeEach(() => {
    localStorage.clear();
    speakSpanish();
  });

  it("opens a brand-new cabinet on Guardados and teaches the gesture in Spanish", () => {
    render(<App />);

    expect(within(sidebar()).getByText(es.seed.shelfName)).toBeInTheDocument();
    expect(screen.getByText(es.empty.firstLoadTitle)).toBeInTheDocument();
    expect(screen.getByText(es.empty.firstLoadText)).toBeInTheDocument();
    expect(screen.getByText(es.empty.primerFoldersText)).toBeInTheDocument();
    expect(
      screen.getByText(format(es.empty.primerShelvesText, { shelf: es.seed.shelfName })),
    ).toBeInTheDocument();
  });

  it("names the sidebar, the toolbar and the search box in Spanish", () => {
    withSaves();
    render(<App />);

    expect(within(sidebar()).getByText(es.sidebar.library)).toBeInTheDocument();
    expect(within(sidebar()).getByText(es.sidebar.tags)).toBeInTheDocument();
    expect(screen.getByLabelText(es.sidebar.newShelf)).toBeInTheDocument();
    expect(screen.getByLabelText(es.paneBar.searchLabel)).toBeInTheDocument();
    expect(screen.getByLabelText(es.toolbar.rowView)).toBeInTheDocument();
    expect(screen.getByLabelText(es.toolbar.transfer)).toBeInTheDocument();
  });

  it("counts in Spanish, and pluralises the noun rather than the number", () => {
    withSaves();
    render(<App />);

    const pill = document.querySelector(".count-pill");
    expect(pill?.textContent).toContain(counted(es.counts.items, 1));
    expect(pill?.textContent).toContain(format(es.folder.foldersFlat, { n: 2 }));
    expect(pill?.textContent).not.toContain(en.counts.items.one);
  });

  it("answers an empty search in Spanish, quoting the query", () => {
    withSaves();
    render(<App />);

    const search = screen.getByLabelText(es.paneBar.searchLabel);
    act(() => {
      search.focus();
    });
    fireInput(search, "zzz");

    expect(screen.getByText(format(es.empty.searchingTitle, { query: "zzz" }))).toBeInTheDocument();
    expect(screen.getByText(es.empty.searchingText)).toBeInTheDocument();

    const quiet = document.querySelector(".es-quiet") as HTMLElement;
    expect(within(quiet).getByRole("button", { name: es.actions.clearSearch })).toBeInTheDocument();
  });

  it("writes the compose dialog in Spanish", async () => {
    withSaves();
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: es.paneBar.compose }));

    expect(screen.getByText(es.compose.headingNew)).toBeInTheDocument();
    expect(screen.getByText(es.compose.title)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(es.compose.titlePlaceholder)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(es.compose.descriptionPlaceholder)).toBeInTheDocument();
    expect(screen.getByText(es.compose.destination)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.actions.cancel })).toBeInTheDocument();
  });

  it("states the cost of deleting a shelf in Spanish, on the armed button", async () => {
    withSaves();
    render(<App />);

    await userEvent.click(within(sidebarRow("Research")).getByLabelText(es.sidebar.editShelf));
    expect(screen.getByText(es.shelfEditor.kindEdit)).toBeInTheDocument();
    expect(screen.getByText(es.shelfEditor.headingEdit)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: es.actions.delete }));
    const armed = countedTemplate(es.shelfEditor.deleteArmed, 1);
    expect(screen.getByRole("button", { name: armed })).toBeInTheDocument();
    expect(armed.startsWith("¿")).toBe(true);
  });

  it("explains in Spanish why the last shelf cannot go", async () => {
    render(<App />);

    await userEvent.click(
      within(sidebarRow(es.seed.shelfName)).getByLabelText(es.sidebar.editShelf),
    );

    expect(screen.getByText(es.shelfEditor.lastShelf)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.actions.delete })).toBeDisabled();
  });

  it("writes the transfer dialog and its refusals in Spanish", async () => {
    withSaves();
    render(<App />);

    await userEvent.click(screen.getByLabelText(es.toolbar.transfer));

    expect(screen.getByText(es.sync.heading)).toBeInTheDocument();
    expect(screen.getByText(es.sync.places)).toBeInTheDocument();
    expect(screen.getByText(es.transfer.drop)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: new RegExp(es.sync.download.label) }));
    expect(screen.getByRole("button", { name: es.actions.download })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")[0]).toHaveAttribute(
      "aria-label",
      expect.stringContaining(es.counts.shelves.other),
    );
  });

  it("offers the tag suggestions in Spanish when no tag exists yet", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: es.actions.saveALink }));

    expect(screen.getByText(es.tagPicker.noTagsYet)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.tagPicker.readLater })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.tagPicker.reference })).toBeInTheDocument();
  });

  it("announces a save in Spanish, and offers to view it", async () => {
    render(<App readLink={() => Promise.resolve(null)} />);

    pasteText("https://example.com/a");
    await screen.findByText(es.toasts.savedTo);

    const toast = document.querySelector(".toast");
    expect(toast?.textContent).toContain(es.toasts.savedTo);
    expect(toast?.textContent).toContain(es.seed.shelfName);
    expect(within(toast as HTMLElement).getByRole("button").textContent).toBe(es.toasts.view);
  });

  it("leaves no English on the first screen a Spanish speaker sees", () => {
    render(<App />);

    const text = document.body.textContent ?? "";
    for (const stranger of [
      en.empty.firstLoadTitle,
      en.empty.firstLoadText,
      en.empty.primerFoldersText,
      en.empty.primerTagsText,
      en.actions.saveALink,
      en.sidebar.library,
      en.sidebar.tags,
      en.seed.shelfName,
    ]) {
      expect(text).not.toContain(stranger);
    }
  });

  it("leaves no English on a filled cabinet either", async () => {
    withSaves();
    render(<App />);

    await userEvent.click(screen.getByLabelText(es.toolbar.rowView));

    const text = document.body.textContent ?? "";
    for (const stranger of [
      en.sidebar.library,
      en.sidebar.tags,
      en.sections.folders,
      en.sections.items,
      en.counts.items.other,
      en.card.noLink,
      en.time.justNow,
    ]) {
      expect(text).not.toContain(stranger);
    }
  });
});

function fireInput(element: HTMLElement, value: string): void {
  const input = element as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
