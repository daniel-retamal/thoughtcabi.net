import { beforeEach, describe, expect, it } from "vitest";
import { beginAuth, challengeFor, takeAuthReturn } from "./oauth";

const CONFIG = {
  authorizeEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  clientId: "450897477073.apps.googleusercontent.com",
  redirectUri: "https://thoughtcabi.net/",
  scope: "https://www.googleapis.com/auth/drive.file",
};

function bench() {
  const session = new Map<string, string>();
  const store = {
    getItem: (key: string) => session.get(key) ?? null,
    setItem: (key: string, value: string) => void session.set(key, value),
    removeItem: (key: string) => void session.delete(key),
  } as unknown as Storage;

  const went: string[] = [];
  let forgotten = 0;

  return {
    session: store,
    went,
    forgotten: () => forgotten,
    deps: {
      session: store,
      go: (url: string) => void went.push(url),
      forget: () => {
        forgotten += 1;
      },
      random: (bytes: Uint8Array) => bytes.fill(7),
    },
  };
}

async function stateOf(desk: ReturnType<typeof bench>): Promise<string> {
  await beginAuth("drive", CONFIG, desk.deps);
  const url = new URL(desk.went[0] ?? "");
  return url.searchParams.get("state") ?? "";
}

describe("the proof", () => {
  it("is the SHA-256 of the verifier, in base64url with no padding", async () => {
    expect(await challengeFor("abc")).toBe("ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");
  });
});

describe("starting a sign in", () => {
  it("sends the browser to Google and remembers nothing in localStorage", async () => {
    const desk = bench();

    await beginAuth("drive", CONFIG, desk.deps);

    expect(desk.went[0]).toContain("https://accounts.google.com/o/oauth2/v2/auth?");
    expect(localStorage.length).toBe(0);
  });
});

describe("coming back", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hands the code and the verifier on, and clears the address bar", async () => {
    const desk = bench();
    const state = await stateOf(desk);

    const arrival = takeAuthReturn({ ...desk.deps, search: `?code=the-code&state=${state}` });

    expect(arrival).toMatchObject({ provider: "drive", fields: { code: "the-code" } });
    expect(desk.forgotten()).toBe(1);
  });

  it("takes nothing on a second read, so a reload cannot connect twice", async () => {
    const desk = bench();
    const state = await stateOf(desk);
    const search = `?code=the-code&state=${state}`;

    takeAuthReturn({ ...desk.deps, search });

    expect(takeAuthReturn({ ...desk.deps, search })).toBeNull();
  });

  it("refuses a state that is not the one it sent", async () => {
    const desk = bench();
    await stateOf(desk);

    expect(takeAuthReturn({ ...desk.deps, search: "?code=c&state=somebody-elses" })).toBeNull();
  });

  it("says nothing when the person said no at the consent screen", async () => {
    const desk = bench();
    const state = await stateOf(desk);

    expect(
      takeAuthReturn({ ...desk.deps, search: `?error=access_denied&state=${state}` }),
    ).toBeNull();
    expect(desk.forgotten()).toBe(1);
  });

  it("leaves an ordinary visit entirely alone", () => {
    const desk = bench();

    expect(takeAuthReturn({ ...desk.deps, search: "" })).toBeNull();
    expect(desk.forgotten()).toBe(0);
  });
});
