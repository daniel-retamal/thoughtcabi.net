import { describe, expect, it, vi } from "vitest";
import {
  MAX_BYTES,
  createBroker,
  createHandler,
  credentialsFrom,
  formFor,
  parseRoute,
  tokenFrom,
} from "./authd.mjs";

const ENV = {
  GOOGLE_CLIENT_ID: "google-id",
  GOOGLE_CLIENT_SECRET: "google-secret",
};

const ORIGIN = "https://thoughtcabi.net";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fetcherFor(routes) {
  return vi.fn((url) => {
    const route = routes[url];
    return Promise.resolve(route ? route() : new Response("no", { status: 404 }));
  });
}

function formOf(fetcher, call = 0) {
  return Object.fromEntries(new URLSearchParams(fetcher.mock.calls[call][1].body));
}

function request({ method = "POST", path = "/auth/google/exchange", origin = ORIGIN, body = {} }) {
  const chunks = body === null ? [] : [Buffer.from(JSON.stringify(body))];
  return {
    method,
    url: path,
    headers: origin ? { origin } : {},
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    },
  };
}

function collector() {
  const answer = { status: 0, headers: {}, body: "" };
  return {
    answer,
    res: {
      writeHead(status, headers = {}) {
        answer.status = status;
        answer.headers = headers;
      },
      end(body) {
        answer.body = body ? body.toString("utf8") : "";
      },
    },
  };
}

async function answerFor(handler, options) {
  const { answer, res } = collector();
  await handler(request(options), res);
  return { ...answer, json: answer.body ? JSON.parse(answer.body) : null };
}

describe("parseRoute", () => {
  it("takes the provider and the three actions, under the nginx prefix or without it", () => {
    expect(parseRoute("/auth/google/exchange")).toEqual({
      provider: "google",
      action: "exchange",
    });
    expect(parseRoute("/google/refresh")).toEqual({
      provider: "google",
      action: "refresh",
    });
  });

  it("is an allowlist, and nothing else is a provider", () => {
    expect(parseRoute("/auth/dropbox/exchange")).toBeNull();
    expect(parseRoute("/auth/microsoft/refresh")).toBeNull();
    expect(parseRoute("/auth/https:%2F%2Fevil.example/exchange")).toBeNull();
    expect(parseRoute("/auth/google/delete")).toBeNull();
    expect(parseRoute("/auth/google")).toBeNull();
    expect(parseRoute("/auth/google/exchange/extra")).toBeNull();
  });
});

describe("credentialsFrom", () => {
  it("takes a provider only when both halves of its pair are set", () => {
    expect(Object.keys(credentialsFrom(ENV))).toEqual(["google"]);
    expect(Object.keys(credentialsFrom({ GOOGLE_CLIENT_ID: "id" }))).toEqual([]);
  });
});

describe("formFor", () => {
  const client = { id: "id", secret: "secret" };

  it("builds the authorization code grant, carrying the verifier", () => {
    expect(
      formFor("exchange", { code: "c", code_verifier: "v", redirect_uri: "r" }, client),
    ).toEqual({
      client_id: "id",
      client_secret: "secret",
      grant_type: "authorization_code",
      code: "c",
      code_verifier: "v",
      redirect_uri: "r",
    });
  });

  it("refuses a half-filled exchange rather than sending it upstream", () => {
    expect(formFor("exchange", { code: "c", code_verifier: "v" }, client)).toBeNull();
    expect(formFor("refresh", {}, client)).toBeNull();
    expect(formFor("refresh", { refresh_token: 42 }, client)).toBeNull();
  });

  it("never lets the body choose the grant or the client", () => {
    const form = formFor(
      "refresh",
      { refresh_token: "t", grant_type: "password", client_id: "theirs", scope: "everything" },
      client,
    );

    expect(form).toEqual({
      client_id: "id",
      client_secret: "secret",
      grant_type: "refresh_token",
      refresh_token: "t",
    });
  });
});

describe("tokenFrom", () => {
  it("passes on only the three fields the browser needs", () => {
    expect(
      tokenFrom({
        access_token: "a",
        expires_in: 3599,
        refresh_token: "r",
        id_token: "should not travel",
        scope: "drive.file",
      }),
    ).toEqual({ access_token: "a", expires_in: 3599, refresh_token: "r" });
  });

  it("leaves the refresh token out when the upstream did not send one", () => {
    expect(tokenFrom({ access_token: "a", expires_in: 60 })).toEqual({
      access_token: "a",
      expires_in: 60,
    });
  });

  it("refuses a payload that is not a token", () => {
    expect(tokenFrom(null)).toBeNull();
    expect(tokenFrom({ error: "invalid_grant" })).toBeNull();
    expect(tokenFrom({ access_token: "a" })).toBeNull();
  });
});

describe("the broker", () => {
  const GOOGLE = "https://oauth2.googleapis.com/token";

  it("posts an exchange to the hardcoded upstream, with the secret the request never saw", async () => {
    const fetcher = fetcherFor({
      [GOOGLE]: () => jsonResponse({ access_token: "a", expires_in: 3599, refresh_token: "r" }),
    });
    const broker = createBroker({ fetchImpl: fetcher, env: ENV });

    const result = await broker(
      { provider: "google", action: "exchange" },
      { code: "c", code_verifier: "v", redirect_uri: "https://thoughtcabi.net/" },
    );

    expect(result).toEqual({
      status: 200,
      payload: { access_token: "a", expires_in: 3599, refresh_token: "r" },
    });
    expect(formOf(fetcher)).toMatchObject({ client_secret: "google-secret", code: "c" });
  });

  it("passes an upstream refusal through as a status rather than swallowing it", async () => {
    const fetcher = fetcherFor({
      [GOOGLE]: () => jsonResponse({ error: "invalid_grant" }, 400),
    });
    const broker = createBroker({ fetchImpl: fetcher, env: ENV });

    expect(await broker({ provider: "google", action: "refresh" }, { refresh_token: "t" })).toEqual(
      { status: 400, payload: { error: "upstream_refused" } },
    );
  });

  it("reports an upstream that does not answer as a gateway problem", async () => {
    const broker = createBroker({
      fetchImpl: () => Promise.reject(new Error("ECONNRESET")),
      env: ENV,
    });

    expect(
      await broker({ provider: "google", action: "refresh" }, { refresh_token: "t" }),
    ).toMatchObject({ status: 502 });
  });

  it("refuses a payload that is not a token, rather than handing the browser junk", async () => {
    const fetcher = fetcherFor({ [GOOGLE]: () => jsonResponse({ hello: "there" }) });
    const broker = createBroker({ fetchImpl: fetcher, env: ENV });

    expect(await broker({ provider: "google", action: "refresh" }, { refresh_token: "t" })).toEqual(
      { status: 502, payload: { error: "upstream_unreadable" } },
    );
  });

  it("revokes at google's own endpoint", async () => {
    const fetcher = fetcherFor({
      "https://oauth2.googleapis.com/revoke": () => jsonResponse({}),
    });
    const broker = createBroker({ fetchImpl: fetcher, env: ENV });

    expect(await broker({ provider: "google", action: "revoke" }, { refresh_token: "t" })).toEqual({
      status: 204,
      payload: null,
    });
    expect(formOf(fetcher)).toMatchObject({ token: "t" });
  });

  it("says so plainly when a provider has no secret configured", async () => {
    const broker = createBroker({ fetchImpl: fetcherFor({}), env: {} });

    expect(
      await broker({ provider: "google", action: "refresh" }, { refresh_token: "t" }),
    ).toMatchObject({ status: 501 });
  });
});

describe("the handler", () => {
  const GOOGLE = "https://oauth2.googleapis.com/token";

  function handlerFor(routes = {}, options = {}) {
    return createHandler({ fetchImpl: fetcherFor(routes), env: ENV, ...options });
  }

  it("answers only the site's own origin, and refuses another one", async () => {
    const handler = handlerFor({
      [GOOGLE]: () => jsonResponse({ access_token: "a", expires_in: 60 }),
    });

    const mine = await answerFor(handler, {
      body: { refresh_token: "t" },
      path: "/auth/google/refresh",
    });
    expect(mine.headers["Access-Control-Allow-Origin"]).toBe(ORIGIN);

    const theirs = await answerFor(handler, {
      origin: "https://evil.example",
      path: "/auth/google/refresh",
      body: { refresh_token: "t" },
    });
    expect(theirs.status).toBe(403);
    expect(theirs.headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("takes localhost only when the dev flag is set", async () => {
    const off = await answerFor(handlerFor(), { origin: "http://localhost:5173" });
    expect(off.status).toBe(403);

    const on = await answerFor(handlerFor({}, { dev: true }), {
      origin: "http://localhost:5173",
      path: "/auth/google/refresh",
      body: {},
    });
    expect(on.status).toBe(400);
  });

  it("says a provider is not configured, which is not the same as refusing it", async () => {
    const bare = createHandler({ fetchImpl: fetcherFor({}), env: {} });

    expect(
      await answerFor(bare, { path: "/auth/google/refresh", body: { refresh_token: "t" } }),
    ).toMatchObject({ status: 501 });
  });

  it("is POST only, and answers a preflight without a body", async () => {
    expect(await answerFor(handlerFor(), { method: "GET" })).toMatchObject({ status: 405 });

    const preflight = await answerFor(handlerFor(), { method: "OPTIONS" });
    expect(preflight.status).toBe(204);
    expect(preflight.body).toBe("");
  });

  it("has a health check that needs no origin", async () => {
    expect(await answerFor(handlerFor(), { path: "/healthz", origin: null })).toMatchObject({
      status: 200,
    });
  });

  it("refuses a body over the cap rather than reading it", async () => {
    const { answer, res } = collector();
    const oversized = {
      method: "POST",
      url: "/auth/google/refresh",
      headers: { origin: ORIGIN },
      async *[Symbol.asyncIterator]() {
        yield Buffer.alloc(MAX_BYTES + 1);
      },
    };

    await handlerFor()(oversized, res);

    expect(answer.status).toBe(400);
  });

  it("has no route for a provider it does not serve", async () => {
    for (const path of ["/auth/dropbox/exchange", "/auth/microsoft/refresh"]) {
      expect(await answerFor(handlerFor(), { path, body: {} })).toMatchObject({ status: 404 });
    }
  });
});
