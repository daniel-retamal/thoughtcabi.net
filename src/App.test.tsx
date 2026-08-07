import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STORAGE_KEYS } from "@/storage/keys";
import { App } from "./App";

function sidebar(): HTMLElement {
  return document.querySelector("aside.sidebar") as HTMLElement;
}

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
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
    expect(screen.getByText("AI & memory")).toBeInTheDocument();
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
    expect(localStorage.getItem(STORAGE_KEYS.view)).toBe("list");
  });

  it("creates a folder and persists it", async () => {
    render(<App />);
    await userEvent.click(screen.getByLabelText("New folder"));
    await userEvent.type(screen.getByPlaceholderText("e.g. Read later"), "Inbox");
    await userEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(screen.getByText("Inbox")).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.library)).toContain("Inbox");
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
    await userEvent.click(screen.getByText("On Rereading"));

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
});
