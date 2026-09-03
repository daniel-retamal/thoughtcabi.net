import { describe, expect, it } from "vitest";
import type { RemoteStore } from "@/sync/types";

export const FANCY_CABINET = '{"title":"Café ☕ 北京","note":"naïve"}';

export interface StoreProbe {
  store: RemoteStore;
  seed: (text: string) => Promise<void>;
  textOf: (name: string) => Promise<string | null>;
  names: () => Promise<string[]>;
  cutOff: () => void;
}

export interface ExpiringProbe extends StoreProbe {
  expire: () => void;
  revoke: () => void;
}

export function describeStoreSuite(label: string, open: () => Promise<StoreProbe>): void {
  describe(`${label}, against the shared suite`, () => {
    it("answers null for a file that is not there", async () => {
      const probe = await open();

      expect(await probe.store.head()).toBeNull();
    });

    it("fails rather than reporting an absence when the target cannot be read", async () => {
      const probe = await open();
      await probe.seed("{}");
      probe.cutOff();

      await expect(probe.store.head()).rejects.toThrow();
    });

    it("pulls back exactly the bytes push wrote", async () => {
      const probe = await open();

      const written = await probe.store.push("the cabinet", null, "Cabinet: 1 shelf");
      const snapshot = await probe.store.pull();

      expect(written).toMatchObject({ ok: true });
      expect(snapshot.text).toBe("the cabinet");
      expect(snapshot.revision).toBe((await probe.store.head())?.revision);
    });

    it("refuses a push whose expected revision is stale", async () => {
      const probe = await open();
      await probe.seed("theirs");

      const outcome = await probe.store.push("mine", "stale-revision", "Cabinet: 1 shelf");

      expect(outcome).toEqual({ ok: false, reason: "conflict" });
      expect((await probe.store.pull()).text).toBe("theirs");
    });

    it("writes a sibling without disturbing the cabinet", async () => {
      const probe = await open();
      await probe.seed("mine");

      const written = await probe.store.sibling("thoughtcabinet-copy.json", "theirs");

      expect(written).toBe("thoughtcabinet-copy.json");
      expect(await probe.textOf("thoughtcabinet-copy.json")).toBe("theirs");
      expect((await probe.store.pull()).text).toBe("mine");
      expect(await probe.names()).toContain("thoughtcabinet-copy.json");
    });

    it("carries an emoji and an accent through the round trip", async () => {
      const probe = await open();

      await probe.store.push(FANCY_CABINET, null, "Cabinet: 1 shelf");

      expect((await probe.store.pull()).text).toBe(FANCY_CABINET);
    });
  });
}

export function describeExpiringStoreSuite(
  label: string,
  open: () => Promise<ExpiringProbe>,
): void {
  describeStoreSuite(label, open);

  describe(`${label}, when its credential has run out`, () => {
    it("renews it once and carries on without a word", async () => {
      const probe = await open();
      await probe.seed("theirs");
      probe.expire();

      expect((await probe.store.pull()).text).toBe("theirs");
    });

    it("says auth, not failed, when the renewal is refused", async () => {
      const probe = await open();
      await probe.seed("theirs");
      probe.expire();
      probe.revoke();

      await expect(probe.store.head()).rejects.toMatchObject({ problem: "auth" });
    });
  });
}
