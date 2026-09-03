import { describe, expect, it } from "vitest";
import { indexedDbBaseStore, memoryBaseStore } from "./baseStore";

describe("memoryBaseStore", () => {
  it("round-trips the last synced copy", async () => {
    const store = memoryBaseStore();
    await store.write("d1", { text: "{}", revision: "rev-1" });
    expect(await store.read("d1")).toEqual({ text: "{}", revision: "rev-1" });
  });

  it("keeps one copy per destination", async () => {
    const store = memoryBaseStore();
    await store.write("d1", { text: "one", revision: "rev-1" });
    await store.write("d2", { text: "two", revision: "rev-2" });
    expect(await store.read("d1")).toMatchObject({ text: "one" });
    expect(await store.read("d2")).toMatchObject({ text: "two" });
  });

  it("has nothing for a destination it has not seen", async () => {
    expect(await memoryBaseStore().read("d1")).toBeNull();
  });

  it("forgets one copy when a destination is disconnected", async () => {
    const store = memoryBaseStore();
    await store.write("d1", { text: "one", revision: "rev-1" });
    await store.forget("d1");
    expect(await store.read("d1")).toBeNull();
  });
});

describe("indexedDbBaseStore, where IndexedDB is not there", () => {
  const store = indexedDbBaseStore(undefined);

  it("reads nothing rather than throwing, which is the private window case", async () => {
    expect(await store.read("d1")).toBeNull();
  });

  it("reports that it could not write, so the engine falls back to the guarded dialog", async () => {
    expect(await store.write("d1", { text: "{}", revision: "rev-1" })).toBe(false);
  });

  it("forgets without complaint", async () => {
    await expect(store.forget("d1")).resolves.toBeUndefined();
  });
});
