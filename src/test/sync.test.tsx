import { describe, expect, it } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { en } from "@/i18n/en";
import type { Cabinet } from "@/domain/model";
import type { Rhythm } from "@/domain/sync/rhythm";
import { serializeCabinet } from "@/storage/cabinetFile";
import { STORAGE_KEYS } from "@/storage/keys";
import { memoryBaseStore } from "@/sync/baseStore";
import { MemoryRemote, memoryProvider } from "@/sync/memoryStore";
import { makeNote, makeShelf, makeTag } from "@/test/factories";
import { TAG_PALETTE } from "@/domain/tags/palette";
import { App } from "@/App";

const INSTANT: Rhythm = { pollFocused: 0, pollVisible: 0, pushDebounce: 0 };
const NOW = Date.UTC(2026, 8, 1);

function cabinetOf(titles: string[]): Cabinet {
  return {
    library: [
      makeShelf(
        "Reading",
        titles.map((title) => makeNote({ id: `n-${title}`, title })),
        "ch1",
      ),
    ],
    tags: [makeTag("To read", TAG_PALETTE[0])],
  };
}

function withLocal(cabinet: Cabinet): void {
  localStorage.setItem(STORAGE_KEYS.cabinet, JSON.stringify(cabinet));
}

function mount(remote: MemoryRemote, options: { takesHome?: boolean } = {}) {
  const provider = memoryProvider(remote, { rhythm: INSTANT, ...options });
  render(<App providers={[provider]} baseStore={memoryBaseStore()} />);
  return provider;
}

function tick(): void {
  act(() => {
    window.dispatchEvent(new Event("focus"));
  });
}

async function connect(): Promise<void> {
  await userEvent.click(screen.getByLabelText(en.toolbar.transfer));
  await userEvent.click(screen.getByRole("button", { name: en.sync.addPlace }));
  await userEvent.click(screen.getByRole("button", { name: /A folder on this computer/ }));
}

function places() {
  return within(screen.getByRole("dialog"));
}

function cards(): string[] {
  return [...document.querySelectorAll(".card-title")].map((node) => node.textContent ?? "");
}

describe("connecting a place", () => {
  it("creates the file, and says where the cabinet lives now", async () => {
    withLocal(cabinetOf(["One"]));
    const remote = new MemoryRemote();
    mount(remote);

    await connect();

    await waitFor(() => expect(remote.text()).toContain("One"));
    await userEvent.click(screen.getByLabelText(en.toolbar.transfer));
    expect(screen.getByText("A folder")).toBeInTheDocument();
    expect(screen.getByText(en.sync.roles.home)).toBeInTheDocument();
  });

  it("shows nothing at all before anything is connected", () => {
    withLocal(cabinetOf(["One"]));
    mount(new MemoryRemote());

    expect(screen.queryByLabelText(/Synced with/)).not.toBeInTheDocument();
  });

  it("hands a second machine the whole cabinet with no question in the way", async () => {
    const remote = new MemoryRemote();
    remote.put(serializeCabinet(cabinetOf(["Theirs"]), NOW));
    mount(remote);

    await connect();

    await waitFor(() => expect(cards()).toEqual(["Theirs"]));
    expect(screen.queryByText(en.sync.reconcile.heading)).not.toBeInTheDocument();
  });

  it("asks before it mixes a full cabinet into one that is already there", async () => {
    withLocal(cabinetOf(["Mine"]));
    const remote = new MemoryRemote();
    remote.put(serializeCabinet(cabinetOf(["Theirs"]), NOW));
    mount(remote);

    await connect();

    expect(await screen.findByText(en.sync.reconcile.heading)).toBeInTheDocument();
    expect(cards()).toEqual(["Mine"]);
  });

  it("keeps both cabinets when asked, and pushes the union back", async () => {
    withLocal(cabinetOf(["Mine"]));
    const remote = new MemoryRemote();
    remote.put(serializeCabinet(cabinetOf(["Theirs"]), NOW));
    mount(remote);

    await connect();
    await screen.findByText(en.sync.reconcile.heading);
    await userEvent.click(screen.getByRole("button", { name: en.sync.reconcile.keepBoth }));

    await waitFor(() => expect(cards().sort()).toEqual(["Mine", "Theirs"]));
    expect(remote.text()).toContain("Mine");
  });
});

describe("two machines", () => {
  async function connected(remote: MemoryRemote): Promise<void> {
    await connect();
    await waitFor(() => expect(remote.text()).not.toBeNull());
  }

  it("takes what the other machine saved, without changing an id", async () => {
    withLocal(cabinetOf(["One"]));
    const remote = new MemoryRemote();
    mount(remote);
    await connected(remote);

    remote.put(serializeCabinet(cabinetOf(["One", "Two"]), NOW));
    tick();

    await waitFor(() => expect(cards()).toEqual(["One", "Two"]));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.cabinet) ?? "{}") as Cabinet;
    expect(saved.library[0]?.children.map((child) => child.id)).toEqual(["n-One", "n-Two"]);
  });

  it("lands an arriving card with the same pop as one you just saved", async () => {
    withLocal(cabinetOf(["One"]));
    const remote = new MemoryRemote();
    mount(remote);
    await connected(remote);

    remote.put(serializeCabinet(cabinetOf(["One", "Two"]), NOW));
    tick();

    await waitFor(() => expect(document.querySelectorAll(".card.fresh")).toHaveLength(1));
  });

  it("pushes once for a burst of edits, not once each", async () => {
    withLocal(cabinetOf(["One"]));
    const remote = new MemoryRemote();
    mount(remote);
    await connected(remote);
    const before = remote.pushes;

    for (const name of ["Recipes", "Later"]) {
      await userEvent.click(screen.getByLabelText(en.sidebar.newShelf));
      await userEvent.type(screen.getByPlaceholderText(en.shelfEditor.namePlaceholder), name);
      await userEvent.click(screen.getByRole("button", { name: en.actions.create }));
    }

    tick();

    await waitFor(() => expect(remote.pushes).toBe(before + 1));
    expect(remote.text()).toContain("Recipes");
    expect(remote.text()).toContain("Later");
  });
});

describe("the destinations list", () => {
  it("keeps a place a newer build connected, inert, with a working Disconnect", async () => {
    withLocal(cabinetOf(["One"]));
    localStorage.setItem(
      STORAGE_KEYS.remote,
      JSON.stringify({
        destinations: [
          { id: "d-future", provider: "dropbox", label: "Dropbox", direction: "mirror" },
        ],
      }),
    );
    mount(new MemoryRemote());

    await userEvent.click(screen.getByLabelText(en.toolbar.transfer));
    expect(screen.getByText("Dropbox")).toBeInTheDocument();
    expect(screen.getByText(en.sync.connect.unavailable)).toBeInTheDocument();

    await userEvent.click(places().getByRole("button", { name: /Dropbox/ }));
    await userEvent.click(places().getByRole("button", { name: en.sync.actions.disconnect }));
    await userEvent.click(places().getByRole("button", { name: en.sync.actions.disconnectArmed }));

    expect(screen.queryByText("Dropbox")).not.toBeInTheDocument();
  });

  it("disconnects one place without touching the cabinet or the preferences", async () => {
    withLocal(cabinetOf(["One"]));
    const remote = new MemoryRemote();
    mount(remote);
    await connect();
    await waitFor(() => expect(remote.text()).not.toBeNull());

    await userEvent.click(screen.getByLabelText(en.toolbar.transfer));
    await userEvent.click(places().getByRole("button", { name: /A folder/ }));
    await userEvent.click(places().getByRole("button", { name: en.sync.actions.disconnect }));
    await userEvent.click(places().getByRole("button", { name: en.sync.actions.disconnectArmed }));

    expect(localStorage.getItem(STORAGE_KEYS.remote)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.cabinet)).toContain("One");
    expect(localStorage.getItem(STORAGE_KEYS.preferences)).not.toBeNull();
  });

  it("always offers this computer as a place, with a download", async () => {
    withLocal(cabinetOf(["One"]));
    mount(new MemoryRemote());

    await userEvent.click(screen.getByLabelText(en.toolbar.transfer));

    expect(places().getByRole("button", { name: en.actions.download })).toBeInTheDocument();
  });
});

describe("a mirror", () => {
  it("never changes the local cabinet, whatever it finds", async () => {
    withLocal(cabinetOf(["Mine"]));
    const remote = new MemoryRemote();
    remote.put(serializeCabinet(cabinetOf(["Theirs"]), NOW));
    mount(remote, { takesHome: false });

    await connect();
    expect(await screen.findByText(en.sync.adopt.heading)).toBeInTheDocument();

    tick();
    await waitFor(() => expect(cards()).toEqual(["Mine"]));
  });

  it("offers a name for this machine so two of them do not overwrite each other", async () => {
    withLocal(cabinetOf(["Mine"]));
    const remote = new MemoryRemote();
    remote.put(serializeCabinet(cabinetOf(["Theirs"]), NOW));
    mount(remote, { takesHome: false });

    await connect();
    await screen.findByText(en.sync.adopt.heading);
    await userEvent.type(screen.getByLabelText(en.sync.adopt.labelPrompt), "Work laptop");
    await userEvent.click(screen.getByRole("button", { name: en.sync.adopt.keepBoth }));

    await waitFor(() => expect(remote.siblingNames()).toEqual(["thoughtcabinet-work-laptop.json"]));
    expect(remote.text()).toContain("Theirs");
  });
});

describe("a copy another sync app left behind", () => {
  const STRAY = "thoughtcabinet (Daniel's conflicted copy 2026-09-01).json";

  async function found(): Promise<MemoryRemote> {
    withLocal(cabinetOf(["One"]));
    const remote = new MemoryRemote();
    mount(remote);
    await connect();
    await waitFor(() => expect(remote.text()).not.toBeNull());

    remote.files.set(STRAY, {
      text: serializeCabinet(cabinetOf(["Stranded"]), NOW),
      revision: "stray-1",
      modifiedAt: NOW,
    });
    remote.put(serializeCabinet(cabinetOf(["One", "Two"]), NOW));
    tick();

    await waitFor(() => expect(cards()).toEqual(["One", "Two"]));
    return remote;
  }

  it("says so in one question, and merges it in when it is taken", async () => {
    const remote = await found();

    expect(await screen.findByText(en.sync.stray.heading)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: en.sync.stray.keepBoth }));

    await waitFor(() => expect(cards().sort()).toEqual(["One", "Stranded", "Two"]));
    expect(remote.text()).toContain("Stranded");
    expect(remote.files.has(STRAY)).toBe(true);
  });

  it("remembers the one you left alone, and leaves the cabinet where it was", async () => {
    await found();

    await screen.findByText(en.sync.stray.heading);
    await userEvent.click(screen.getByRole("button", { name: en.sync.stray.keepMine }));

    await waitFor(() => expect(localStorage.getItem(STORAGE_KEYS.remote)).toContain("conflicted"));
    expect(cards()).toEqual(["One", "Two"]);
    expect(screen.queryByText(en.sync.stray.heading)).not.toBeInTheDocument();
  });
});

describe("the empty plate", () => {
  it("offers to bring a cabinet in, on a browser that has none", async () => {
    mount(new MemoryRemote());

    await userEvent.click(screen.getByRole("button", { name: en.empty.bringItHere }));

    expect(screen.getByText(en.sync.connect.heading)).toBeInTheDocument();
  });
});
