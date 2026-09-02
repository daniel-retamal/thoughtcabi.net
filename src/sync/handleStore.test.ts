import { describe, expect, it } from "vitest";
import { FakeDirectory } from "@/test/fakeDirectory";
import { indexedDbHandleStore, memoryHandleStore } from "./handleStore";

describe("memoryHandleStore", () => {
  it("hands back the directory it was given", async () => {
    const store = memoryHandleStore();
    const directory = new FakeDirectory("Dropbox");

    await store.write("h1", directory);

    expect(await store.read("h1")).toBe(directory);
  });

  it("forgets one handle when a destination is disconnected", async () => {
    const store = memoryHandleStore();
    await store.write("h1", new FakeDirectory());
    await store.forget("h1");
    expect(await store.read("h1")).toBeNull();
  });
});

describe("indexedDbHandleStore, where IndexedDB is not there", () => {
  const store = indexedDbHandleStore(undefined);

  it("reads nothing rather than throwing", async () => {
    expect(await store.read("h1")).toBeNull();
  });

  it("says it could not keep the handle, so a reload knows the folder is gone", async () => {
    expect(await store.write("h1", new FakeDirectory())).toBe(false);
  });

  it("forgets without complaint", async () => {
    await expect(store.forget("h1")).resolves.toBeUndefined();
  });
});
