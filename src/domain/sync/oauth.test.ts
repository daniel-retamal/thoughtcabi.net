import { describe, expect, it } from "vitest";
import { authorizeUrl, grantFrom, isFresh, isRefusal, readAuthReturn } from "./oauth";

const CONFIG = {
  authorizeEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  clientId: "450897477073.apps.googleusercontent.com",
  redirectUri: "https://thoughtcabi.net/",
  scope: "https://www.googleapis.com/auth/drive.file",
};

describe("the authorization address", () => {
  const query = new URL(
    authorizeUrl(CONFIG, { challenge: "the-challenge", state: "the-state" }),
  ).searchParams;

  it("asks for a code against a proof, never for a token", () => {
    expect(query.get("response_type")).toBe("code");
    expect(query.get("code_challenge")).toBe("the-challenge");
    expect(query.get("code_challenge_method")).toBe("S256");
  });

  it("asks for consent every time, which is the only way a refresh token arrives", () => {
    expect(query.get("access_type")).toBe("offline");
    expect(query.get("prompt")).toBe("consent");
  });

  it("carries the state and the one scope it needs", () => {
    expect(query.get("state")).toBe("the-state");
    expect(query.get("scope")).toBe(CONFIG.scope);
    expect(query.get("redirect_uri")).toBe(CONFIG.redirectUri);
  });
});

describe("reading what came back", () => {
  it("takes a code and a state together, or not at all", () => {
    expect(readAuthReturn("?code=abc&state=xyz")).toEqual({ code: "abc", state: "xyz" });
    expect(readAuthReturn("?code=abc")).toBeNull();
    expect(readAuthReturn("")).toBeNull();
  });

  it("reads a refusal as a refusal, not as an absence", () => {
    const arrival = readAuthReturn("?error=access_denied&state=xyz");

    expect(arrival && isRefusal(arrival)).toBe(true);
  });
});

describe("a grant", () => {
  it("reads the token and lands its expiry inside what Google promised", () => {
    const grant = grantFrom({ access_token: "at", expires_in: 3600 }, 1_000);

    expect(grant).toEqual({ accessToken: "at", expiresAt: 1_000 + 3_540_000, refreshToken: null });
  });

  it("is nothing at all without a token or a lifetime", () => {
    expect(grantFrom({ expires_in: 3600 }, 0)).toBeNull();
    expect(grantFrom({ access_token: "at" }, 0)).toBeNull();
    expect(grantFrom(null, 0)).toBeNull();
  });

  it("keeps a refresh token when one is offered, and never invents one", () => {
    expect(grantFrom({ access_token: "at", expires_in: 60, refresh_token: "rt" }, 0)).toMatchObject(
      { refreshToken: "rt" },
    );
    expect(grantFrom({ access_token: "at", expires_in: 60, refresh_token: "" }, 0)).toMatchObject({
      refreshToken: null,
    });
  });

  it("is stale a minute before Google says so, and stale when there is none", () => {
    const grant = grantFrom({ access_token: "at", expires_in: 3600 }, 0);

    expect(isFresh(grant, 3_539_000)).toBe(true);
    expect(isFresh(grant, 3_540_000)).toBe(false);
    expect(isFresh(null, 0)).toBe(false);
  });
});
