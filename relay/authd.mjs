import { Buffer } from "node:buffer";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

export const MAX_BYTES = 4 * 1024;
export const TIMEOUT_MS = 10_000;
export const MAX_IN_FLIGHT = 8;

export const PROVIDERS = {
  google: {
    token: "https://oauth2.googleapis.com/token",
    revoke: "https://oauth2.googleapis.com/revoke",
    revokeField: "token",
  },
};

export const ACTIONS = ["exchange", "refresh", "revoke"];

const JSON_TYPE = "application/json; charset=utf-8";
const FORM_TYPE = "application/x-www-form-urlencoded";

const ALLOWED_ORIGINS = ["https://thoughtcabi.net", "https://www.thoughtcabi.net"];
const DEV_ORIGIN = "http://localhost:5173";

export function allowedOrigins({ dev = false } = {}) {
  return dev ? [...ALLOWED_ORIGINS, DEV_ORIGIN] : ALLOWED_ORIGINS;
}

export function parseRoute(pathname) {
  const parts = pathname
    .replace(/^\/auth(?=\/|$)/, "")
    .split("/")
    .filter(Boolean);
  if (parts.length !== 2) return null;

  const [provider, action] = parts;
  if (!Object.hasOwn(PROVIDERS, provider) || !ACTIONS.includes(action)) return null;

  return { provider, action };
}

export function credentialsFrom(env) {
  const secrets = {};
  for (const provider of Object.keys(PROVIDERS)) {
    const id = env[`${provider.toUpperCase()}_CLIENT_ID`];
    const secret = env[`${provider.toUpperCase()}_CLIENT_SECRET`];
    if (id && secret) secrets[provider] = { id, secret };
  }
  return secrets;
}

function str(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function formFor(action, body, client) {
  const shared = { client_id: client.id, client_secret: client.secret };

  if (action === "exchange") {
    const code = str(body.code);
    const verifier = str(body.code_verifier);
    const redirect = str(body.redirect_uri);
    if (!code || !verifier || !redirect) return null;

    return {
      ...shared,
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: redirect,
    };
  }

  const token = str(body.refresh_token);
  if (!token) return null;

  if (action === "refresh") {
    return { ...shared, grant_type: "refresh_token", refresh_token: token };
  }

  return { ...shared, refresh_token: token };
}

export function tokenFrom(payload) {
  if (typeof payload !== "object" || payload === null) return null;

  const access = str(payload.access_token);
  const expires = Number(payload.expires_in);
  if (!access || !Number.isFinite(expires)) return null;

  const refresh = str(payload.refresh_token);
  return {
    access_token: access,
    expires_in: Math.floor(expires),
    ...(refresh ? { refresh_token: refresh } : {}),
  };
}

export async function readBody(req, max = MAX_BYTES) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > max) return null;
    chunks.push(chunk);
  }

  if (total === 0) return {};

  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function createGate(limit = MAX_IN_FLIGHT) {
  let running = 0;
  const waiting = [];

  const next = () => {
    running -= 1;
    waiting.shift()?.();
  };

  return async function gate(run) {
    if (running >= limit) await new Promise((resolve) => waiting.push(resolve));
    running += 1;
    try {
      return await run();
    } finally {
      next();
    }
  };
}

export function createBroker({ fetchImpl = fetch, env = process.env, gate = createGate() } = {}) {
  const clients = credentialsFrom(env);

  async function call(url, form) {
    let response;
    try {
      response = await gate(() =>
        fetchImpl(url, {
          method: "POST",
          headers: { "Content-Type": FORM_TYPE, Accept: "application/json" },
          body: new URLSearchParams(form).toString(),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        }),
      );
    } catch {
      return { status: 502, payload: { error: "upstream_unreachable" } };
    }

    if (!response.ok) {
      return {
        status: response.status === 400 ? 400 : 502,
        payload: { error: "upstream_refused" },
      };
    }

    return { status: 200, payload: await response.json().catch(() => null) };
  }

  return async function broker(route, body) {
    const client = clients[route.provider];
    if (!client) return { status: 501, payload: { error: "provider_not_configured" } };

    const form = formFor(route.action, body, client);
    if (!form) return { status: 400, payload: { error: "missing_fields" } };

    const upstream = PROVIDERS[route.provider];

    if (route.action === "revoke") {
      if (!upstream.revoke) return { status: 204, payload: null };
      const result = await call(upstream.revoke, {
        [upstream.revokeField]: form.refresh_token,
        client_id: client.id,
        client_secret: client.secret,
      });
      return result.status === 200 ? { status: 204, payload: null } : result;
    }

    const result = await call(upstream.token, form);
    if (result.status !== 200) return result;

    const token = tokenFrom(result.payload);
    return token
      ? { status: 200, payload: token }
      : { status: 502, payload: { error: "upstream_unreadable" } };
  };
}

function corsFor(origin, origins) {
  const allowed = origin && origins.includes(origin);
  return {
    Vary: "Origin",
    ...(allowed
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "600",
        }
      : {}),
  };
}

function send(res, headers, status, payload) {
  if (payload === null) {
    res.writeHead(status, headers);
    res.end();
    return;
  }

  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, { ...headers, "Content-Type": JSON_TYPE, "Content-Length": body.length });
  res.end(body);
}

export function createHandler({ dev = false, ...deps } = {}) {
  const broker = createBroker(deps);
  const origins = allowedOrigins({ dev });

  return async function handle(req, res) {
    const origin = req.headers.origin ?? null;
    const cors = corsFor(origin, origins);
    const path = new URL(req.url ?? "/", "http://authd.invalid").pathname;

    if (req.method === "OPTIONS") {
      res.writeHead(204, cors);
      res.end();
      return;
    }

    if (path === "/healthz" || path === "/auth/healthz") {
      send(res, cors, 200, { ok: true });
      return;
    }

    if (req.method !== "POST") {
      send(res, cors, 405, { error: "post_only" });
      return;
    }

    if (!cors["Access-Control-Allow-Origin"]) {
      send(res, cors, 403, { error: "origin_not_allowed" });
      return;
    }

    const route = parseRoute(path);
    if (!route) {
      send(res, cors, 404, { error: "no_such_route" });
      return;
    }

    const body = await readBody(req);
    if (!body) {
      send(res, cors, 400, { error: "bad_body" });
      return;
    }

    const { status, payload } = await broker(route, body);
    send(res, cors, status, payload);
  };
}

const PORT = Number(process.env.PORT ?? 8789);
const HOST = process.env.HOST ?? "127.0.0.1";

export function start({ port = PORT, host = HOST, ...deps } = {}) {
  const handle = createHandler(deps);

  const server = createServer((req, res) => {
    handle(req, res).catch(() => {
      send(res, {}, 500, { error: "broker_failed" });
    });
  });

  return server.listen(port, host);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start({ dev: process.env.AUTHD_DEV === "1" }).on("listening", () => {
    console.log(`token broker on http://${HOST}:${PORT}`);
  });
}
