import { describe, expect, it } from "vitest";
import { REMOTE_FILE_NAME } from "@/domain/sync/conflictName";
import { DRIVE_API } from "@/domain/sync/drive";
import { FakeDrive } from "@/test/fakeDrive";
import { describeExpiringStoreSuite, type ExpiringProbe } from "@/test/storeSuite";
import { brokerFor, tokenSource } from "../auth/tokens";
import type { ConnectResult, RemoteProvider, RemoteStore } from "../types";
import { callerFor, driveProvider, driveStore } from "./drive";

const CLIENT_ID = "450897477073.apps.googleusercontent.com";
const REDIRECT = "https://thoughtcabi.net/";

function brokerOf(drive: FakeDrive) {
  return brokerFor("google", { fetcher: drive.fetcher, base: "/auth" });
}

function storeOf(drive: FakeDrive, fileId: string | null = null): RemoteStore {
  const tokens = tokenSource(brokerOf(drive), drive.refreshToken);
  return driveStore(callerFor(drive.fetcher, DRIVE_API, tokens), {
    name: REMOTE_FILE_NAME,
    fileId,
  });
}

function providerOf(drive: FakeDrive, options: { clientId?: string } = {}): RemoteProvider {
  return driveProvider({
    fetcher: drive.fetcher,
    api: DRIVE_API,
    broker: brokerOf(drive),
    clientId: options.clientId ?? CLIENT_ID,
    redirectUri: REDIRECT,
  });
}

function connectWith(drive: FakeDrive): Promise<ConnectResult> {
  return providerOf(drive).connect({ fields: { code: "auth-code", verifier: "v" } });
}

describeExpiringStoreSuite("the Drive store", (): Promise<ExpiringProbe> => {
  const drive = new FakeDrive();

  return Promise.resolve({
    store: storeOf(drive),
    seed: (text) => {
      drive.put(REMOTE_FILE_NAME, text);
      return Promise.resolve();
    },
    textOf: (name) => Promise.resolve(drive.textOf(name)),
    names: () => Promise.resolve(drive.names()),
    cutOff: () => {
      drive.unreachable = true;
    },
    expire: () => drive.expire(),
    revoke: () => {
      drive.revoked = true;
    },
  });
});

describe("the Drive store", () => {
  it("finds the file this app wrote on another machine, by name", async () => {
    const drive = new FakeDrive();
    drive.put(REMOTE_FILE_NAME, "from the laptop");

    expect((await storeOf(drive).pull()).text).toBe("from the laptop");
  });

  it("hands back the id of a file it had to create, so a rename cannot lose it", async () => {
    const drive = new FakeDrive();

    const written = await storeOf(drive).push("mine", null, "Cabinet: 1 shelf");

    expect(written).toMatchObject({ ok: true, locator: { fileId: "f-1" } });
  });

  it("says nothing about a locator when it wrote over a file that was already there", async () => {
    const drive = new FakeDrive();
    const store = storeOf(drive);
    await store.push("mine", null, "Cabinet: 1 shelf");
    const head = await store.head();

    const written = await store.push("mine again", head?.revision ?? null, "Cabinet: 1 shelf");

    expect(written).toEqual({ ok: true, revision: "r2" });
  });

  it("falls back to the name when the id it remembered is gone", async () => {
    const drive = new FakeDrive();
    drive.put(REMOTE_FILE_NAME, "the one that is really there");

    const store = storeOf(drive, "f-does-not-exist");

    expect((await store.head())?.revision).toBe("r1");
  });

  it("reads the revision before the bytes, so a race cannot look settled", async () => {
    const drive = new FakeDrive();
    drive.put(REMOTE_FILE_NAME, "first");
    const store = storeOf(drive);

    const snapshot = await store.pull();

    expect(snapshot.revision).toBe("r1");
    expect(snapshot.text).toBe("first");
  });
});

describe("the Drive provider", () => {
  it("takes the code back to the broker and names the destination after the account", async () => {
    const drive = new FakeDrive();

    const result = await connectWith(drive);

    expect(result).toMatchObject({
      ok: true,
      connection: { label: "danielr@example.com", secret: drive.refreshToken },
    });
  });

  it("carries the id of a cabinet already in the Drive into the locator", async () => {
    const drive = new FakeDrive();
    drive.put(REMOTE_FILE_NAME, "from the laptop");

    const result = await connectWith(drive);

    expect(result.ok && result.connection.locator).toEqual({
      name: REMOTE_FILE_NAME,
      fileId: "f-1",
    });
  });

  it("refuses with auth, not failed, when the broker will not take the code", async () => {
    const drive = new FakeDrive();
    drive.refuses = true;

    const provider = providerOf(drive);

    expect(await provider.connect({ fields: { code: "bad", verifier: "v" } })).toEqual({
      ok: false,
      reason: "auth",
    });
  });

  it("sends the browser to Google when it has no code yet, and connects nothing", async () => {
    const drive = new FakeDrive();
    const seen: string[] = [];

    const provider = driveProvider({
      fetcher: drive.fetcher,
      api: DRIVE_API,
      broker: brokerOf(drive),
      clientId: CLIENT_ID,
      redirectUri: REDIRECT,
      begin: (config) => {
        seen.push(config.clientId, config.redirectUri, config.scope);
        return Promise.resolve();
      },
    });

    expect(await provider.connect({ fields: {} })).toEqual({ ok: false, reason: "cancelled" });
    expect(seen).toEqual([
      CLIENT_ID,
      REDIRECT,
      "https://www.googleapis.com/auth/drive.file",
    ]);
  });

  it("explains itself rather than throwing when the build carries no client id", () => {
    const provider = providerOf(new FakeDrive(), { clientId: "" });

    expect(provider.available()).toEqual({ ok: false, reason: "unconfigured" });
  });

  it("gives the grant back to Google when the place is disconnected", async () => {
    const drive = new FakeDrive();

    await providerOf(drive).disconnect({ name: REMOTE_FILE_NAME }, drive.refreshToken);

    expect(drive.revoked).toBe(true);
  });
});
