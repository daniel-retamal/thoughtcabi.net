import { beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { en } from "@/i18n/en";
import type { Cabinet } from "@/domain/model";
import type { Rhythm } from "@/domain/sync/rhythm";
import { serializeCabinet } from "@/storage/cabinetFile";
import { STORAGE_KEYS } from "@/storage/keys";
import { memoryBaseStore } from "@/sync/baseStore";
import { MemoryRemote, memoryProvider } from "@/sync/memoryStore";
import { githubProvider } from "@/sync/providers/github";
import { driveProvider } from "@/sync/providers/drive";
import { webdavProvider } from "@/sync/providers/webdav";
import { DRIVE_API } from "@/domain/sync/drive";
import { brokerFor } from "@/sync/auth/tokens";
import { beginAuth } from "@/sync/auth/oauth";
import { FakeGithub } from "@/test/fakeGithub";
import { FakeDrive } from "@/test/fakeDrive";
import { FakeWebdav } from "@/test/fakeWebdav";
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

  it("saves the next card into the shelf that arrived, not the seed that is gone", async () => {
    const remote = new MemoryRemote();
    remote.put(serializeCabinet(cabinetOf(["Theirs"]), NOW));
    mount(remote);

    await connect();
    await waitFor(() => expect(cards()).toEqual(["Theirs"]));

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await userEvent.type(screen.getByPlaceholderText("What is this?"), "Saved here");
    const compose = document.querySelector(".modal") as HTMLElement;
    await userEvent.click(within(compose).getByRole("button", { name: /^save$/i }));

    expect(cards()).toEqual(["Saved here", "Theirs"]);
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

  it("keeps the export beside the import, and out of the list of places", async () => {
    withLocal(cabinetOf(["One"]));
    mount(new MemoryRemote());

    await userEvent.click(screen.getByLabelText(en.toolbar.transfer));

    const pair = places().getByRole("button", { name: new RegExp(en.transfer.exportLabel) });
    expect(pair).toBeInTheDocument();
    expect(pair.closest(".places")).toBeNull();
  });

  it("says the cabinet is in this browser alone until a place is added", async () => {
    withLocal(cabinetOf(["One"]));
    mount(new MemoryRemote());

    await userEvent.click(screen.getByLabelText(en.toolbar.transfer));

    expect(places().getByText(en.sync.placesEmpty)).toBeInTheDocument();
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

describe("connecting to a repository", () => {
  function mountWith(remote: FakeGithub): void {
    render(
      <App
        providers={[githubProvider({ fetcher: remote.fetcher, api: "https://api.github.com" })]}
        baseStore={memoryBaseStore()}
      />,
    );
  }

  async function openTheForm(): Promise<void> {
    await userEvent.click(screen.getByLabelText(en.toolbar.transfer));
    await userEvent.click(screen.getByRole("button", { name: en.sync.addPlace }));
    await userEvent.click(screen.getByRole("button", { name: /GitHub/ }));
  }

  async function fill(remote: FakeGithub, token = remote.token): Promise<void> {
    await userEvent.type(places().getByLabelText(en.sync.fields.owner), remote.owner);
    await userEvent.type(places().getByLabelText(en.sync.fields.repo), remote.repo);
    await userEvent.type(places().getByLabelText(en.sync.fields.token), token);
    await userEvent.click(places().getByRole("button", { name: en.sync.fields.connect }));
  }

  it("takes the owner, the repository and a token, and writes the cabinet there", async () => {
    withLocal(cabinetOf(["One"]));
    const remote = new FakeGithub();
    mountWith(remote);

    await openTheForm();
    await fill(remote);

    await waitFor(() => expect(remote.textOf("thoughtcabinet.json")).toContain("One"));
    expect(remote.messages).toEqual(["Cabinet: 1 shelf, 0 folders, 1 card"]);
  });

  it("says so and stays put when GitHub will not take the token", async () => {
    withLocal(cabinetOf(["One"]));
    const remote = new FakeGithub();
    mountWith(remote);

    await openTheForm();
    await fill(remote, "github_pat_wrong");

    expect(await screen.findByText(en.sync.refused.github.auth)).toBeInTheDocument();
    expect(remote.textOf("thoughtcabinet.json")).toBeNull();
  });

  it("treats a public repository exactly like a private one", async () => {
    withLocal(cabinetOf(["One"]));
    const remote = new FakeGithub({ private: false });
    mountWith(remote);

    await openTheForm();
    await fill(remote);

    await waitFor(() => expect(remote.textOf("thoughtcabinet.json")).toContain("One"));
  });
});

describe("connecting to Google Drive", () => {
  const CLIENT_ID = "450897477073.apps.googleusercontent.com";
  const REDIRECT = "https://thoughtcabi.net/";
  const went: string[] = [];

  function mountWith(drive: FakeDrive, search = ""): void {
    window.history.replaceState(null, "", `/${search}`);
    render(
      <App
        providers={[
          driveProvider({
            fetcher: drive.fetcher,
            api: DRIVE_API,
            broker: brokerFor("google", { fetcher: drive.fetcher }),
            clientId: CLIENT_ID,
            redirectUri: REDIRECT,
            begin: (config) =>
              beginAuth("drive", config, {
                go: (url) => void went.push(url),
                random: (bytes) => bytes.fill(7),
              }),
          }),
        ]}
        baseStore={memoryBaseStore()}
      />,
    );
  }

  async function pickDrive(): Promise<void> {
    await userEvent.click(screen.getByLabelText(en.toolbar.transfer));
    await userEvent.click(screen.getByRole("button", { name: en.sync.addPlace }));
    await userEvent.click(screen.getByRole("button", { name: /Google Drive/ }));
  }

  async function comeBack(drive: FakeDrive): Promise<void> {
    await pickDrive();
    await waitFor(() => expect(went).toHaveLength(1));
    cleanup();
    const state = new URL(went[0] ?? "").searchParams.get("state") ?? "";
    mountWith(drive, `?code=the-code&state=${state}`);
  }

  beforeEach(() => {
    went.length = 0;
  });

  it("sends the browser to Google, and connects nothing until it comes back", async () => {
    withLocal(cabinetOf(["One"]));
    const drive = new FakeDrive();
    mountWith(drive);

    await pickDrive();

    await waitFor(() => expect(went[0]).toContain("accounts.google.com"));
    expect(drive.textOf("thoughtcabinet.json")).toBeNull();
  });

  it("finishes the sign in on the way back and writes the cabinet to the Drive", async () => {
    withLocal(cabinetOf(["One"]));
    const drive = new FakeDrive();
    mountWith(drive);

    await comeBack(drive);

    await waitFor(() => expect(drive.textOf("thoughtcabinet.json")).toContain("One"));
    await userEvent.click(screen.getByLabelText(en.toolbar.transfer));
    expect(screen.getByText(drive.account)).toBeInTheDocument();
  });

  it("leaves the code out of the address bar once it has been spent", async () => {
    withLocal(cabinetOf(["One"]));
    const drive = new FakeDrive();
    mountWith(drive);

    await comeBack(drive);

    await waitFor(() => expect(drive.textOf("thoughtcabinet.json")).toContain("One"));
    expect(window.location.search).toBe("");
  });

  it("hands a second machine the whole cabinet, with the consent screen the only step", async () => {
    const drive = new FakeDrive();
    drive.put("thoughtcabinet.json", serializeCabinet(cabinetOf(["Theirs"]), NOW));
    mountWith(drive);

    await comeBack(drive);

    await waitFor(() => expect(cards()).toEqual(["Theirs"]));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  async function comeBackTo(drive: FakeDrive, spoil: (drive: FakeDrive) => void): Promise<void> {
    await pickDrive();
    await waitFor(() => expect(went).toHaveLength(1));
    cleanup();

    spoil(drive);
    const state = new URL(went[0] ?? "").searchParams.get("state") ?? "";
    mountWith(drive, `?code=the-code&state=${state}`);
  }

  it("says the sign in was refused when Google will not take the code", async () => {
    withLocal(cabinetOf(["One"]));
    const drive = new FakeDrive();
    mountWith(drive);

    await comeBackTo(drive, (it) => {
      it.refuses = true;
    });

    expect(await screen.findByText(en.toasts.couldNotSignIn, { exact: false })).toBeInTheDocument();
    expect(drive.textOf("thoughtcabinet.json")).toBeNull();
  });

  it("says it could not connect when the broker itself cannot be reached", async () => {
    withLocal(cabinetOf(["One"]));
    const drive = new FakeDrive();
    mountWith(drive);

    await comeBackTo(drive, (it) => {
      it.unreachable = true;
    });

    expect(await screen.findByText(en.toasts.couldNotConnect, { exact: false })).toBeInTheDocument();
    expect(drive.textOf("thoughtcabinet.json")).toBeNull();
  });
});

describe("connecting to a server of your own", () => {
  function mountWith(server: FakeWebdav, pageProtocol = "https:"): void {
    render(
      <App
        providers={[webdavProvider({ fetcher: server.fetcher, pageProtocol })]}
        baseStore={memoryBaseStore()}
      />,
    );
  }

  async function openTheForm(): Promise<void> {
    await userEvent.click(screen.getByLabelText(en.toolbar.transfer));
    await userEvent.click(screen.getByRole("button", { name: en.sync.addPlace }));
    await userEvent.click(screen.getByRole("button", { name: /Your own server/ }));
  }

  async function fill(server: FakeWebdav, address = server.base): Promise<void> {
    await userEvent.type(places().getByLabelText(en.sync.fields.address), address);
    await userEvent.type(places().getByLabelText(en.sync.fields.user), server.user);
    await userEvent.type(places().getByLabelText(en.sync.fields.password), server.password);
    await userEvent.click(places().getByRole("button", { name: en.sync.fields.connect }));
  }

  it("takes an address, a username and an app password, and writes the cabinet there", async () => {
    withLocal(cabinetOf(["One"]));
    const server = new FakeWebdav();
    mountWith(server);

    await openTheForm();
    await fill(server);

    await waitFor(() => expect(server.textOf("thoughtcabinet.json")).toContain("One"));
  });

  it("hands a second machine the whole cabinet", async () => {
    const server = new FakeWebdav();
    server.put("thoughtcabinet.json", serializeCabinet(cabinetOf(["Theirs"]), NOW));
    mountWith(server);

    await openTheForm();
    await fill(server);

    await waitFor(() => expect(cards()).toEqual(["Theirs"]));
  });

  it("names a server that would not let the browser through, and writes nothing", async () => {
    withLocal(cabinetOf(["One"]));
    const server = new FakeWebdav();
    server.blocked = true;
    mountWith(server);

    await openTheForm();
    await fill(server);

    expect(await screen.findByText(en.sync.refused.cors)).toBeInTheDocument();
    expect(server.textOf("thoughtcabinet.json")).toBeNull();
  });

  it("names an address the browser will not open, without asking the network", async () => {
    withLocal(cabinetOf(["One"]));
    const server = new FakeWebdav();
    server.unreachable = true;
    mountWith(server);

    await openTheForm();
    await fill(server, "http://nas.local/dav/");

    expect(await screen.findByText(en.sync.refused.mixedContent)).toBeInTheDocument();
  });
});

describe("the empty plate", () => {
  it("offers to bring a cabinet in, on a browser that has none", async () => {
    mount(new MemoryRemote());

    await userEvent.click(screen.getByRole("button", { name: en.empty.bringItHere }));

    expect(screen.getByText(en.sync.connect.heading)).toBeInTheDocument();
  });
});
