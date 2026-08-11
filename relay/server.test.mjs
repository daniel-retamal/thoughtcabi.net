import { describe, expect, it, vi } from "vitest";
import {
  MAX_BYTES,
  createCache,
  createGate,
  createHandler,
  createRelay,
  isBlockedAddress,
  parseTarget,
} from "./server.mjs";

const PUBLIC = [{ address: "93.184.216.34", family: 4 }];
const LOOPBACK = [{ address: "127.0.0.1", family: 4 }];

function lookupFor(zones) {
  return (hostname) =>
    zones[hostname] ? Promise.resolve(zones[hostname]) : Promise.reject(new Error("ENOTFOUND"));
}

function page(body, { status = 200, contentType = "text/html; charset=utf-8", location } = {}) {
  return () =>
    new Response(body, {
      status,
      headers: { "content-type": contentType, ...(location ? { location } : {}) },
    });
}

function fetcherFor(routes) {
  return vi.fn((url) => {
    const route = routes[url];
    return Promise.resolve(route ? route() : new Response("nothing", { status: 404 }));
  });
}

function text(answer) {
  return answer.body.toString("utf8");
}

describe("isBlockedAddress", () => {
  it("lets a public address through", () => {
    expect(isBlockedAddress("93.184.216.34")).toBe(false);
    expect(isBlockedAddress("8.8.8.8")).toBe(false);
    expect(isBlockedAddress("172.32.0.1")).toBe(false);
    expect(isBlockedAddress("2606:2800:220:1:248:1893:25c8:1946")).toBe(false);
  });

  it("blocks every private and link-local range", () => {
    for (const address of [
      "127.0.0.1",
      "127.1.2.3",
      "10.0.0.5",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254",
      "0.0.0.0",
      "0.1.2.3",
    ]) {
      expect(isBlockedAddress(address), address).toBe(true);
    }
  });

  it("blocks the IPv6 equivalents, including mapped IPv4", () => {
    for (const address of [
      "::1",
      "::",
      "fc00::1",
      "fd12:3456::1",
      "fe80::1",
      "febf::1",
      "::ffff:127.0.0.1",
      "::ffff:7f00:1",
      "fe80::1%eth0",
    ]) {
      expect(isBlockedAddress(address), address).toBe(true);
    }
  });

  it("blocks anything it cannot read", () => {
    expect(isBlockedAddress("nonsense")).toBe(true);
    expect(isBlockedAddress("1.2.3")).toBe(true);
    expect(isBlockedAddress("1:2::3::4")).toBe(true);
    expect(isBlockedAddress("")).toBe(true);
    expect(isBlockedAddress(undefined)).toBe(true);
  });
});

describe("parseTarget", () => {
  it("accepts an ordinary http url", () => {
    expect(parseTarget("https://example.com/a?b=1").url?.href).toBe("https://example.com/a?b=1");
  });

  it("refuses a missing or malformed url", () => {
    expect(parseTarget(null)).toMatchObject({ status: 400 });
    expect(parseTarget("")).toMatchObject({ status: 400 });
    expect(parseTarget("not a url")).toMatchObject({ status: 400 });
  });

  it("refuses a scheme that is not http", () => {
    expect(parseTarget("ftp://example.com/x")).toMatchObject({ status: 400 });
    expect(parseTarget("file:///etc/passwd")).toMatchObject({ status: 400 });
  });

  it("refuses a hostname that names a private address on its face", () => {
    for (const raw of [
      "http://localhost/x",
      "http://app.localhost/x",
      "http://127.0.0.1/x",
      "http://10.1.2.3/x",
      "http://192.168.0.1/x",
      "http://172.20.0.1/x",
      "http://169.254.169.254/latest/meta-data/",
      "http://0.0.0.0/x",
      "http://[::1]/x",
    ]) {
      expect(parseTarget(raw), raw).toMatchObject({ status: 403 });
    }
  });
});

describe("relay", () => {
  const target = "https://example.com/post";

  function relayWith(routes, zones = { "example.com": PUBLIC }, extra = {}) {
    const fetcher = fetcherFor(routes);
    return { fetcher, relay: createRelay({ fetch: fetcher, lookup: lookupFor(zones), ...extra }) };
  }

  it("returns the upstream bytes and content type", async () => {
    const { relay } = relayWith({ [target]: page("<html>hello</html>") });
    const answer = await relay.read(target);

    expect(answer.status).toBe(200);
    expect(answer.contentType).toBe("text/html; charset=utf-8");
    expect(text(answer)).toBe("<html>hello</html>");
  });

  it("sends the honest user agent", async () => {
    const { relay, fetcher } = relayWith({ [target]: page("ok") });
    await relay.read(target);

    expect(fetcher.mock.calls[0][1].headers["User-Agent"]).toBe(
      "thoughtcabinet-linkbot/1.0 (+https://thoughtcabi.net)",
    );
  });

  it("refuses a public hostname that resolves to a private address", async () => {
    const { relay, fetcher } = relayWith(
      { "https://inside.test/": page("secret") },
      { "inside.test": LOOPBACK },
    );

    const answer = await relay.read("https://inside.test/");

    expect(answer.status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("refuses when any one of several answers is private", async () => {
    const { relay, fetcher } = relayWith(
      { "https://split.test/": page("secret") },
      { "split.test": [...PUBLIC, ...LOOPBACK] },
    );

    expect((await relay.read("https://split.test/")).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("refuses a hostname that does not resolve at all", async () => {
    const { relay } = relayWith({}, {});
    expect((await relay.read("https://nowhere.test/")).status).toBe(403);
  });

  it("follows a redirect and re-checks the address on every hop", async () => {
    const { relay } = relayWith(
      {
        "https://example.com/post": page(null, { status: 301, location: "https://cdn.test/real" }),
        "https://cdn.test/real": page("<html>moved</html>"),
      },
      { "example.com": PUBLIC, "cdn.test": PUBLIC },
    );

    const answer = await relay.read(target);

    expect(answer.status).toBe(200);
    expect(text(answer)).toBe("<html>moved</html>");
  });

  it("blocks a redirect into a private address, which follow would have missed", async () => {
    const { relay, fetcher } = relayWith(
      {
        "https://example.com/post": page(null, {
          status: 302,
          location: "http://inside.test/admin",
        }),
        "http://inside.test/admin": page("secret"),
      },
      { "example.com": PUBLIC, "inside.test": LOOPBACK },
    );

    const answer = await relay.read(target);

    expect(answer.status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("blocks a redirect straight to a loopback literal", async () => {
    const { relay } = relayWith({
      "https://example.com/post": page(null, { status: 302, location: "http://127.0.0.1:8788/" }),
    });

    expect((await relay.read(target)).status).toBe(403);
  });

  it("resolves a relative redirect against the hop it came from", async () => {
    const { relay } = relayWith({
      "https://example.com/post": page(null, { status: 302, location: "/real" }),
      "https://example.com/real": page("<html>here</html>"),
    });

    expect(text(await relay.read(target))).toBe("<html>here</html>");
  });

  it("gives up after three hops", async () => {
    const routes = {};
    for (let hop = 0; hop < 10; hop += 1) {
      routes[`https://example.com/${hop}`] = page(null, {
        status: 302,
        location: `https://example.com/${hop + 1}`,
      });
    }
    const { relay, fetcher } = relayWith(routes);

    const answer = await relay.read("https://example.com/0");

    expect(answer.status).toBe(502);
    expect(text(answer)).toBe("Too many redirects");
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("refuses a body that is not text", async () => {
    const { relay } = relayWith({
      [target]: page("not text at all", { contentType: "image/png" }),
    });

    expect((await relay.read(target)).status).toBe(415);
  });

  it("relays json, which the api resolvers need", async () => {
    const { relay } = relayWith({
      [target]: page('{"ok":true}', { contentType: "application/json" }),
    });

    const answer = await relay.read(target);
    expect(answer.status).toBe(200);
    expect(JSON.parse(text(answer))).toEqual({ ok: true });
  });

  it("caps the body while streaming it", async () => {
    const { relay } = relayWith({ [target]: page("x".repeat(MAX_BYTES + 50_000)) });

    expect((await relay.read(target)).body.length).toBe(MAX_BYTES);
  });

  it("answers 502 when the upstream refuses", async () => {
    const { relay } = relayWith({ [target]: page("nope", { status: 500 }) });
    expect((await relay.read(target)).status).toBe(502);
  });

  it("answers 502 when the fetch throws", async () => {
    const relay = createRelay({
      fetch: () => Promise.reject(new Error("ECONNRESET")),
      lookup: lookupFor({ "example.com": PUBLIC }),
    });

    expect((await relay.read(target)).status).toBe(502);
  });

  it("serves a repeat of the same url from cache", async () => {
    const { relay, fetcher } = relayWith({ [target]: page("<html>once</html>") });

    const first = await relay.read(target);
    const second = await relay.read(target);

    expect(text(second)).toBe(text(first));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not cache a refusal", async () => {
    const { relay, fetcher } = relayWith({ [target]: page("nope", { status: 500 }) });

    await relay.read(target);
    await relay.read(target);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("createCache", () => {
  it("forgets an entry once its ttl has passed", () => {
    let clock = 0;
    const cache = createCache({ ttlMs: 100, now: () => clock });

    cache.set("a", 1);
    clock = 99;
    expect(cache.get("a")).toBe(1);
    clock = 100;
    expect(cache.get("a")).toBeNull();
  });

  it("drops the least recently used entry when full", () => {
    const cache = createCache({ entries: 2 });

    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a");
    cache.set("c", 3);

    expect(cache.size).toBe(2);
    expect(cache.get("b")).toBeNull();
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
  });
});

describe("createGate", () => {
  it("never runs more than the limit at once", async () => {
    const gate = createGate(2);
    const releases = [];
    let active = 0;
    let peak = 0;

    const runs = Array.from({ length: 6 }, () =>
      gate(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => releases.push(resolve));
        active -= 1;
      }),
    );

    while (releases.length) {
      releases.shift()();
      await Promise.resolve();
      await Promise.resolve();
    }
    await Promise.all(runs);

    expect(peak).toBe(2);
  });
});

describe("handler", () => {
  function fakeResponse() {
    const captured = { status: 0, headers: {}, body: "" };
    return {
      captured,
      res: {
        writeHead(status, headers) {
          captured.status = status;
          captured.headers = headers;
        },
        end(body) {
          captured.body = body ? body.toString("utf8") : "";
        },
      },
    };
  }

  async function call(url, method = "GET") {
    const handle = createHandler({
      fetch: fetcherFor({ "https://example.com/": page("<html>hi</html>") }),
      lookup: lookupFor({ "example.com": PUBLIC }),
    });
    const { captured, res } = fakeResponse();
    await handle({ method, url }, res);
    return captured;
  }

  it("answers the health check", async () => {
    expect(await call("/healthz")).toMatchObject({ status: 200, body: "ok" });
  });

  it("answers the health check behind the nginx location too", async () => {
    expect(await call("/relay/healthz")).toMatchObject({ status: 200, body: "ok" });
  });

  it("relays on the bare root", async () => {
    const answer = await call("/?url=" + encodeURIComponent("https://example.com/"));
    expect(answer).toMatchObject({ status: 200, body: "<html>hi</html>" });
  });

  it("relays on /relay, which is the path nginx passes through", async () => {
    const answer = await call("/relay?url=" + encodeURIComponent("https://example.com/"));
    expect(answer).toMatchObject({ status: 200, body: "<html>hi</html>" });
    expect(answer.headers["Cache-Control"]).toBe("public, max-age=3600");
  });

  it("refuses anything but GET", async () => {
    expect(await call("/", "POST")).toMatchObject({ status: 405 });
  });

  it("has nothing at any other path", async () => {
    expect(await call("/relayed")).toMatchObject({ status: 404 });
    expect(await call("/../etc/passwd")).toMatchObject({ status: 404 });
  });
});
