const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 10_000;
const USER_AGENT = "thoughtcabi-linkbot/1.0 (+https://thoughtcabi.net)";
const CACHE_SECONDS = 3600;

const PRIVATE_HOST =
  /^(localhost$|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0$|\[?::1\]?$)/i;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Accept",
};

function refuse(message, status) {
  return new Response(message, { status, headers: CORS });
}

function targetOf(request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return { error: refuse("Missing url parameter", 400) };

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { error: refuse("Malformed url", 400) };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: refuse("Only http and https are relayed", 400) };
  }
  if (PRIVATE_HOST.test(parsed.hostname)) {
    return { error: refuse("Refusing to relay a private address", 403) };
  }

  return { url: parsed };
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "GET") return refuse("Only GET is supported", 405);

    const { url, error } = targetOf(request);
    if (error) return error;

    const upstream = await fetch(url.href, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
    }).catch(() => null);

    if (!upstream || !upstream.ok) return refuse("Upstream did not answer", 502);

    const body = (await upstream.text()).slice(0, MAX_BYTES);

    return new Response(body, {
      headers: {
        ...CORS,
        "Content-Type": upstream.headers.get("content-type") ?? "text/plain; charset=utf-8",
        "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
      },
    });
  },
};
