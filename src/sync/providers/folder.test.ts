import { describe, expect, it } from "vitest";
import { memoryHandleStore, type HandleStore } from "@/sync/handleStore";
import { FakeDirectory } from "@/test/fakeDirectory";
import { describeStoreSuite } from "@/test/storeSuite";
import type { RemoteStore } from "../types";
import { folderProvider, folderStore } from "./folder";
import type { DirectoryPicker } from "./fileSystem";

const FILE = "thoughtcabinet.json";
const MESSAGE = "Cabinet: 1 shelf, 0 folders, 2 cards";

function pickerFor(directory: FakeDirectory): DirectoryPicker {
  return () => Promise.resolve(directory);
}

function storeOn(directory: FakeDirectory): RemoteStore {
  return folderStore(directory, FILE);
}

describeStoreSuite("folder", () => {
  const directory = new FakeDirectory();
  return Promise.resolve({
    store: storeOn(directory),
    seed: (text: string) => Promise.resolve(directory.put(FILE, text)),
    textOf: (name: string) => Promise.resolve(directory.textOf(name)),
    names: () => Promise.resolve(directory.names()),
    cutOff: () => {
      directory.unreachable = true;
    },
  });
});

async function connected(
  directory: FakeDirectory,
  handles: HandleStore = memoryHandleStore(),
): Promise<{ handles: HandleStore; locator: Record<string, string> }> {
  const provider = folderProvider({ picker: pickerFor(directory), handles });
  const connection = await provider.connect({ fields: {} });
  if (!connection.ok) throw new Error("the picker refused");
  return { handles, locator: { ...connection.connection.locator } };
}

describe("the folder store", () => {
  it("reads a revision that moves when the file does", async () => {
    const directory = new FakeDirectory();
    directory.put(FILE, "one");
    const store = storeOn(directory);

    const first = await store.head();
    directory.put(FILE, "one and a half");
    const second = await store.head();

    expect(first?.revision).toBeTruthy();
    expect(second?.revision).not.toBe(first?.revision);
  });

  it("reports a refused write as a permission problem, not a failure", async () => {
    const directory = new FakeDirectory();
    directory.refuse = "NotAllowedError";

    expect(await storeOn(directory).push("mine", null, MESSAGE)).toEqual({
      ok: false,
      reason: "permission",
    });
  });

  it("puts a sibling beside the cabinet without overwriting one that is there", async () => {
    const directory = new FakeDirectory();
    directory.put("thoughtcabinet-work.json", "theirs");

    const written = await storeOn(directory).sibling("thoughtcabinet-work.json", "mine");

    expect(written).toBe("thoughtcabinet-work-2.json");
    expect(directory.textOf("thoughtcabinet-work.json")).toBe("theirs");
  });

  it("lists what else is in the folder", async () => {
    const directory = new FakeDirectory();
    directory.put(FILE, "mine");
    directory.put("thoughtcabinet 2.json", "theirs");

    expect(await storeOn(directory).siblings?.()).toEqual([FILE, "thoughtcabinet 2.json"]);
  });

  it("reads a named sibling, which is how a stray is looked at", async () => {
    const directory = new FakeDirectory();
    directory.put("thoughtcabinet 2.json", "theirs");

    expect((await storeOn(directory).pullFrom?.("thoughtcabinet 2.json"))?.text).toBe("theirs");
  });

  it("is writable only while the permission is granted", async () => {
    const directory = new FakeDirectory();
    expect(await storeOn(directory).writable?.()).toBe(true);

    directory.grant = "prompt";
    expect(await storeOn(directory).writable?.()).toBe(false);
  });
});

describe("the folder provider", () => {
  it("is unavailable where the browser ships no picker", () => {
    expect(folderProvider({ picker: null }).available()).toEqual({
      ok: false,
      reason: "chromium-only",
    });
  });

  it("keeps the handle, so a reload reopens the same folder", async () => {
    const directory = new FakeDirectory("Dropbox");
    const { handles, locator } = await connected(directory);

    const reopened = await folderProvider({ picker: null, handles }).reopen(locator, null, "quiet");

    expect(reopened).toMatchObject({ ok: true });
  });

  it("names the destination after the folder that was picked", async () => {
    const provider = folderProvider({
      picker: pickerFor(new FakeDirectory("Syncthing")),
      handles: memoryHandleStore(),
    });

    const result = await provider.connect({ fields: {} });

    expect(result).toMatchObject({ ok: true, connection: { label: "Syncthing" } });
  });

  it("asks for permission only inside the gesture, and waits without one", async () => {
    const directory = new FakeDirectory();
    const { handles, locator } = await connected(directory);
    directory.grant = "prompt";
    const provider = folderProvider({ picker: null, handles });

    const quiet = await provider.reopen(locator, null, "quiet");
    expect(quiet).toEqual({ ok: false, reason: "needs-permission" });
    expect(directory.requests).toBe(0);

    expect(await provider.reopen(locator, null, "gesture")).toMatchObject({ ok: true });
    expect(directory.requests).toBe(1);
  });

  it("stays paused when the permission is refused outright", async () => {
    const directory = new FakeDirectory();
    const { handles, locator } = await connected(directory);
    directory.grant = "denied";

    const reopened = await folderProvider({ picker: null, handles }).reopen(
      locator,
      null,
      "gesture",
    );

    expect(reopened).toEqual({ ok: false, reason: "needs-permission" });
  });

  it("is gone once it has been disconnected", async () => {
    const directory = new FakeDirectory();
    const { handles, locator } = await connected(directory);
    const provider = folderProvider({ picker: null, handles });

    await provider.disconnect(locator, null);

    expect(await provider.reopen(locator, null, "quiet")).toEqual({ ok: false, reason: "gone" });
  });

  it("connects to nothing when the picker is dismissed", async () => {
    const provider = folderProvider({
      picker: () => Promise.reject(Object.assign(new Error("abort"), { name: "AbortError" })),
      handles: memoryHandleStore(),
    });

    expect(await provider.connect({ fields: {} })).toEqual({ ok: false, reason: "cancelled" });
  });
});
