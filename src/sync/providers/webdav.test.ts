import { beforeEach, describe, expect, it } from "vitest";
import { FakeWebdav } from "@/test/fakeWebdav";
import { FANCY_CABINET, describeStoreSuite, type StoreProbe } from "@/test/storeSuite";
import type { RemoteStore } from "../types";
import { itemsFrom, webdavProvider } from "./webdav";

const ADDRESS = "https://cloud.example.test/dav/dan/";

async function openStore(server: FakeWebdav): Promise<RemoteStore> {
  const result = await webdavProvider({
    fetcher: server.fetcher,
    pageProtocol: "https:",
  }).connect({ fields: { url: ADDRESS, user: server.user, password: server.password } });

  if (!result.ok) throw new Error(`the fake refused: ${result.reason}`);
  return result.connection.store;
}

describeStoreSuite("the WebDAV store", async (): Promise<StoreProbe> => {
  const server = new FakeWebdav();
  const store = await openStore(server);

  return {
    store,
    seed: (text) => Promise.resolve(server.put("thoughtcabinet.json", text)),
    textOf: (name) => Promise.resolve(server.textOf(name)),
    names: () => Promise.resolve(server.names()),
    cutOff: () => {
      server.unreachable = true;
    },
  };
});

describe("reading a multistatus", () => {
  it("takes the href, the etag and the date out of every response", () => {
    const items = itemsFrom(
      '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:">' +
        "<d:response><d:href>/dav/dan/</d:href><d:propstat><d:prop>" +
        "<d:resourcetype><d:collection/></d:resourcetype>" +
        "</d:prop></d:propstat></d:response>" +
        "<d:response><d:href>/dav/dan/thoughtcabinet.json</d:href><d:propstat><d:prop>" +
        '<d:getetag>"abc"</d:getetag>' +
        "<d:getlastmodified>Wed, 03 Sep 2026 10:00:00 GMT</d:getlastmodified>" +
        "</d:prop></d:propstat></d:response>" +
        "</d:multistatus>",
    );

    expect(items).toEqual([
      { href: "/dav/dan/", etag: null, modified: null },
      {
        href: "/dav/dan/thoughtcabinet.json",
        etag: '"abc"',
        modified: "Wed, 03 Sep 2026 10:00:00 GMT",
      },
    ]);
  });

  it("reads a server that answers with a namespace prefix of its own", () => {
    const items = itemsFrom(
      '<?xml version="1.0"?><multistatus xmlns="DAV:">' +
        "<response><href>/dav/dan/x.json</href><propstat><prop>" +
        '<getetag>W/"7"</getetag>' +
        "</prop></propstat></response></multistatus>",
    );

    expect(items).toEqual([{ href: "/dav/dan/x.json", etag: 'W/"7"', modified: null }]);
  });

  it("answers with nothing at all for a body that is not a multistatus", () => {
    expect(itemsFrom("<html><body>Not found</body></html>")).toEqual([]);
  });
});

describe("connecting to a server", () => {
  let server: FakeWebdav;

  beforeEach(() => {
    server = new FakeWebdav();
  });

  const connect = (fields: Record<string, string>, pageProtocol = "https:") =>
    webdavProvider({ fetcher: server.fetcher, pageProtocol }).connect({ fields });

  const credentials = { user: "dan", password: "app-password" };

  it("takes an address, a username and an app password", async () => {
    const result = await connect({ url: ADDRESS, ...credentials });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.connection.label).toBe("cloud.example.test/dan");
    expect(result.connection.locator).toEqual({
      collection: ADDRESS,
      name: "thoughtcabinet.json",
      user: "dan",
    });
    expect(result.connection.secret).toBe("app-password");
  });

  it("refuses an address it cannot make sense of, without asking the network", async () => {
    server.unreachable = true;

    expect(await connect({ url: "not an address at all", ...credentials })).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("refuses a form with no credentials in it", async () => {
    expect(await connect({ url: ADDRESS, user: "", password: "" })).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("names mixed content before it makes a request", async () => {
    server.unreachable = true;

    expect(await connect({ url: "http://nas.local/dav/", ...credentials })).toEqual({
      ok: false,
      reason: "mixedContent",
    });
  });

  it("lets an http server through when the page is http too", async () => {
    const plain = new FakeWebdav({ base: "http://nas.local/dav/" });
    server = plain;

    expect(await connect({ url: "http://nas.local/dav/", ...credentials }, "http:")).toMatchObject({
      ok: true,
    });
  });

  it("calls a refused preflight a CORS problem, not a failure", async () => {
    server.blocked = true;

    expect(await connect({ url: ADDRESS, ...credentials })).toEqual({ ok: false, reason: "cors" });
  });

  it("calls a server that answers nothing at all a CORS problem too", async () => {
    server.unreachable = true;

    expect(await connect({ url: ADDRESS, ...credentials })).toEqual({ ok: false, reason: "cors" });
  });

  it("says the password was refused rather than blaming the server", async () => {
    expect(await connect({ url: ADDRESS, user: "dan", password: "wrong" })).toEqual({
      ok: false,
      reason: "auth",
    });
  });

  it("says there is nothing at that address when the collection is not there", async () => {
    server.missing = true;

    expect(await connect({ url: ADDRESS, ...credentials })).toEqual({ ok: false, reason: "gone" });
  });
});

describe("the store, once it is open", () => {
  let server: FakeWebdav;

  beforeEach(() => {
    server = new FakeWebdav();
  });

  it("creates the cabinet without writing over one that appeared meanwhile", async () => {
    const store = await openStore(server);
    server.put("thoughtcabinet.json", "theirs");

    expect(await store.push("mine", null, "Cabinet: 1 shelf")).toEqual({
      ok: false,
      reason: "conflict",
    });
    expect(server.textOf("thoughtcabinet.json")).toBe("theirs");
  });

  it("sends the etag back the way the server wrote it", async () => {
    const store = await openStore(server);
    await store.push("mine", null, "Cabinet: 1 shelf");
    const head = await store.head();

    expect(head?.revision).toBe(server.etagOf("thoughtcabinet.json"));
    expect(head?.modifiedAt).toBe(Date.parse("Wed, 03 Sep 2026 10:00:00 GMT"));
    expect(await store.push("later", head!.revision, "Cabinet: 1 shelf")).toMatchObject({
      ok: true,
    });
    expect(server.textOf("thoughtcabinet.json")).toBe("later");
  });

  it("asks for the revision when the server kept its ETag header to itself", async () => {
    const store = await openStore(server);
    server.hidesEtagHeader = true;

    const written = await store.push(FANCY_CABINET, null, "Cabinet: 1 shelf");

    expect(written).toEqual({ ok: true, revision: server.etagOf("thoughtcabinet.json") });
    expect((await store.pull()).revision).toBe(server.etagOf("thoughtcabinet.json"));
  });

  it("calls a share it cannot write to read only, not a failure", async () => {
    const store = await openStore(server);
    server.refusesWrites = true;

    expect(await store.push("mine", null, "Cabinet: 1 shelf")).toEqual({
      ok: false,
      reason: "readonly",
    });
  });

  it("calls a full disk a room problem", async () => {
    const store = await openStore(server);
    server.outOfRoom = true;

    expect(await store.push("mine", null, "Cabinet: 1 shelf")).toEqual({
      ok: false,
      reason: "quota",
    });
  });

  it("steps past a name already taken when it parks a copy", async () => {
    const store = await openStore(server);
    server.put("thoughtcabinet.json", "mine");
    server.put("thoughtcabinet-copy.json", "an older copy");

    expect(await store.sibling("thoughtcabinet-copy.json", "theirs")).toBe(
      "thoughtcabinet-copy-2.json",
    );
    expect(server.textOf("thoughtcabinet-copy.json")).toBe("an older copy");
    expect(server.textOf("thoughtcabinet-copy-2.json")).toBe("theirs");
  });

  it("reads the cabinet past the browser cache, never a stale copy of it", async () => {
    const seen: RequestInit[] = [];
    const watching = new FakeWebdav();
    const inner = watching.fetcher;
    const store = await openStore(
      Object.assign(watching, {
        fetcher: (input: string, init: RequestInit = {}) => {
          seen.push(init);
          return inner(input, init);
        },
      }),
    );
    watching.put("thoughtcabinet.json", "mine");

    await store.pull();

    expect(seen.some((init) => init.cache === "no-store")).toBe(true);
  });

  it("reads a stray beside the cabinet", async () => {
    const store = await openStore(server);
    server.put("thoughtcabinet.json", "mine");
    server.put("thoughtcabinet 2.json", "a conflicted copy");

    expect(await store.siblings?.()).toEqual(["thoughtcabinet.json", "thoughtcabinet 2.json"]);
    expect((await store.pullFrom?.("thoughtcabinet 2.json"))?.text).toBe("a conflicted copy");
  });

  it("reopens from what was written down, with no second connect", async () => {
    const provider = webdavProvider({ fetcher: server.fetcher, pageProtocol: "https:" });
    server.put("thoughtcabinet.json", "mine");

    const reopened = await provider.reopen(
      { collection: ADDRESS, name: "thoughtcabinet.json", user: "dan" },
      "app-password",
      "quiet",
    );

    expect(reopened).toMatchObject({ ok: true });
    if (!reopened.ok) return;
    expect((await reopened.store.pull()).text).toBe("mine");
  });

  it("asks for the password again when there is none written down", async () => {
    const provider = webdavProvider({ fetcher: server.fetcher, pageProtocol: "https:" });

    expect(
      await provider.reopen(
        { collection: ADDRESS, name: "thoughtcabinet.json", user: "dan" },
        null,
        "quiet",
      ),
    ).toEqual({ ok: false, reason: "auth" });
  });
});
