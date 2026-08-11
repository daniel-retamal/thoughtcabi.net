import { Buffer } from "node:buffer";
import { lookup as dnsLookup } from "node:dns/promises";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

export const MAX_BYTES = 512 * 1024;
export const TIMEOUT_MS = 10_000;
export const MAX_REDIRECTS = 3;
export const MAX_IN_FLIGHT = 8;
export const CACHE_SECONDS = 3600;
export const CACHE_ENTRIES = 256;
export const USER_AGENT = "thoughtcabinet-linkbot/1.0 (+https://thoughtcabi.net)";

const ACCEPT = "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8";
const PLAIN_TEXT = "text/plain; charset=utf-8";

const PRIVATE_HOST =
  /^(localhost$|.+\.localhost$|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0(\.\d{1,3}){3}$|\[?::1?\]?$)/i;

const TEXTUAL =
  /^\s*(text\/|application\/(json|xml|xhtml\+xml|ld\+json|rss\+xml|atom\+xml)\b|application\/[\w.-]+\+(json|xml)\b)/i;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Accept",
};

function ipv4Blocked(address) {
  const parts = address.split(".");
  if (parts.length !== 4) return true;

  const octets = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : -1));
  if (octets.some((octet) => octet < 0 || octet > 255)) return true;

  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function ipv6Bytes(text) {
  const halves = text.split("::");
  if (halves.length > 2) return null;

  const words = (half) => (half ? half.split(":") : []);
  const head = words(halves[0]);
  const tail = halves.length === 2 ? words(halves[1]) : [];
  const groups = [...head, ...tail];
  const last = groups.at(-1);

  let trailing = [];
  if (last?.includes(".")) {
    const octets = last.split(".");
    if (octets.length !== 4) return null;
    const numbers = octets.map((octet) => (/^\d{1,3}$/.test(octet) ? Number(octet) : -1));
    if (numbers.some((octet) => octet < 0 || octet > 255)) return null;
    trailing = numbers;
    if (tail.length) tail.pop();
    else head.pop();
  }

  const wordBytes = (word) => {
    if (!/^[0-9a-f]{1,4}$/.test(word)) return null;
    const value = Number.parseInt(word, 16);
    return [value >> 8, value & 0xff];
  };

  const bytes = [];
  for (const word of head) {
    const pair = wordBytes(word);
    if (!pair) return null;
    bytes.push(...pair);
  }

  const tailBytes = [];
  for (const word of tail) {
    const pair = wordBytes(word);
    if (!pair) return null;
    tailBytes.push(...pair);
  }

  const filled = bytes.length + tailBytes.length + trailing.length;
  if (filled > 16) return null;
  if (halves.length === 1 && filled !== 16) return null;

  return [...bytes, ...new Array(16 - filled).fill(0), ...tailBytes, ...trailing];
}

function ipv6Blocked(address) {
  const plain = address
    .split("%")[0]
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  const bytes = ipv6Bytes(plain);
  if (!bytes) return true;

  const leadingZeros = bytes.slice(0, 10).every((byte) => byte === 0);
  if (leadingZeros && bytes[10] === 0xff && bytes[11] === 0xff) {
    return ipv4Blocked(bytes.slice(12).join("."));
  }
  if (bytes.slice(0, 15).every((byte) => byte === 0)) return true;
  if ((bytes[0] & 0xfe) === 0xfc) return true;
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true;
  return false;
}

export function isBlockedAddress(address) {
  if (typeof address !== "string" || !address) return true;
  return address.includes(":") ? ipv6Blocked(address) : ipv4Blocked(address);
}

export function parseTarget(raw) {
  if (!raw) return { status: 400, message: "Missing url parameter" };

  let url;
  try {
    url = new URL(raw);
  } catch {
    return { status: 400, message: "Malformed url" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { status: 400, message: "Only http and https are relayed" };
  }
  if (!url.hostname || PRIVATE_HOST.test(url.hostname)) {
    return { status: 403, message: "Refusing to relay a private address" };
  }

  return { url };
}

export function createCache({
  entries = CACHE_ENTRIES,
  ttlMs = CACHE_SECONDS * 1000,
  now = Date.now,
} = {}) {
  const store = new Map();

  return {
    get(key) {
      const hit = store.get(key);
      if (!hit) return null;
      if (hit.expiresAt <= now()) {
        store.delete(key);
        return null;
      }
      store.delete(key);
      store.set(key, hit);
      return hit.value;
    },
    set(key, value) {
      store.delete(key);
      store.set(key, { value, expiresAt: now() + ttlMs });
      while (store.size > entries) store.delete(store.keys().next().value);
    },
    get size() {
      return store.size;
    },
  };
}

export function createGate(limit = MAX_IN_FLIGHT) {
  const waiting = [];
  let active = 0;

  function leave() {
    const next = waiting.shift();
    if (next) next();
    else active -= 1;
  }

  return async function enter(run) {
    if (active >= limit) await new Promise((resolve) => waiting.push(resolve));
    else active += 1;

    try {
      return await run();
    } finally {
      leave();
    }
  };
}

async function readCapped(body) {
  const reader = body.getReader();
  const chunks = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
      total += value.byteLength;
      if (total >= MAX_BYTES) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  return Buffer.concat(chunks).subarray(0, MAX_BYTES);
}

async function discard(response) {
  await response.body?.cancel().catch(() => undefined);
}

export function createRelay({
  fetch: fetchImpl = fetch,
  lookup = dnsLookup,
  now = Date.now,
  cache = createCache({ now }),
  gate = createGate(),
} = {}) {
  async function resolvesPublicly(hostname) {
    let records;
    try {
      records = await lookup(hostname, { all: true });
    } catch {
      return false;
    }
    return records.length > 0 && records.every((record) => !isBlockedAddress(record.address));
  }

  async function follow(startUrl) {
    let url = startUrl;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      if (!(await resolvesPublicly(url.hostname))) {
        return { status: 403, message: "Refusing to relay a private address" };
      }

      let response;
      try {
        response = await fetchImpl(url.href, {
          headers: { "User-Agent": USER_AGENT, Accept: ACCEPT },
          redirect: "manual",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch {
        return { status: 502, message: "Upstream did not answer" };
      }

      const location =
        response.status >= 300 && response.status < 400 ? response.headers.get("location") : null;

      if (location) {
        await discard(response);
        let next;
        try {
          next = parseTarget(new URL(location, url).href);
        } catch {
          return { status: 502, message: "Upstream redirected somewhere unreadable" };
        }
        if (!next.url) return next;
        url = next.url;
        continue;
      }

      if (!response.ok) {
        await discard(response);
        return { status: 502, message: "Upstream did not answer" };
      }

      const contentType = response.headers.get("content-type") ?? PLAIN_TEXT;
      if (!TEXTUAL.test(contentType)) {
        await discard(response);
        return { status: 415, message: "Only text responses are relayed" };
      }

      const body = response.body
        ? await readCapped(response.body)
        : Buffer.from(await response.arrayBuffer()).subarray(0, MAX_BYTES);

      return { status: 200, contentType, body };
    }

    return { status: 502, message: "Too many redirects" };
  }

  async function read(raw) {
    const target = parseTarget(raw);
    if (!target.url) return refusal(target);

    const key = target.url.href;
    const cached = cache.get(key);
    if (cached) return cached;

    const result = await gate(() => follow(target.url));
    if (result.status !== 200) return refusal(result);

    cache.set(key, result);
    return result;
  }

  return { read };
}

function refusal({ status, message }) {
  return { status, contentType: PLAIN_TEXT, body: Buffer.from(message) };
}

function send(res, { status, contentType, body }) {
  res.writeHead(status, {
    ...CORS,
    "Content-Type": contentType,
    "Content-Length": body.length,
    ...(status === 200 ? { "Cache-Control": `public, max-age=${CACHE_SECONDS}` } : {}),
  });
  res.end(body);
}

export function createHandler(deps) {
  const relay = createRelay(deps);

  return async function handle(req, res) {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS);
      res.end();
      return;
    }
    if (req.method !== "GET") {
      send(res, refusal({ status: 405, message: "Only GET is supported" }));
      return;
    }

    const requested = new URL(req.url ?? "/", "http://relay.invalid");
    const path = requested.pathname.replace(/^\/relay(?=\/|$)/, "") || "/";

    if (path === "/healthz") {
      send(res, { status: 200, contentType: PLAIN_TEXT, body: Buffer.from("ok") });
      return;
    }
    if (path !== "/") {
      send(res, refusal({ status: 404, message: "Nothing here" }));
      return;
    }

    send(res, await relay.read(requested.searchParams.get("url")));
  };
}

const PORT = Number(process.env.PORT ?? 8788);
const HOST = process.env.HOST ?? "127.0.0.1";

export function start({ port = PORT, host = HOST, ...deps } = {}) {
  const handle = createHandler(deps);

  const server = createServer((req, res) => {
    handle(req, res).catch(() => {
      send(res, refusal({ status: 500, message: "Relay failed" }));
    });
  });

  return server.listen(port, host);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start().on("listening", () => {
    console.log(`link relay on http://${HOST}:${PORT}`);
  });
}
