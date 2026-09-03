import { describe, expect, it } from "vitest";
import { FakeGithub } from "@/test/fakeGithub";
import { describeStoreSuite } from "@/test/storeSuite";
import type { RemoteStore } from "../types";
import { githubProvider } from "./github";

const API = "https://api.github.com";
const PATH = "thoughtcabinet.json";

function providerOn(remote: FakeGithub) {
  return githubProvider({ fetcher: remote.fetcher, api: API });
}

async function connected(
  remote: FakeGithub,
  fields: Record<string, string> = {},
): Promise<RemoteStore> {
  const result = await providerOn(remote).connect({
    fields: { owner: remote.owner, repo: remote.repo, token: remote.token, ...fields },
  });
  if (!result.ok) throw new Error(`the fake refused: ${result.reason}`);
  return result.connection.store;
}

describeStoreSuite("github", async () => {
  const remote = new FakeGithub();
  return {
    store: await connected(remote),
    seed: (text: string) => Promise.resolve(remote.put(PATH, text)),
    textOf: (name: string) => Promise.resolve(remote.textOf(name)),
    names: () => Promise.resolve(remote.names()),
    cutOff: () => {
      remote.unreachable = true;
    },
  };
});

describe("connecting to a repository", () => {
  it("keeps the token as the secret and labels the place owner/repo", async () => {
    const remote = new FakeGithub();

    const result = await providerOn(remote).connect({
      fields: { owner: "danielr", repo: "cabinet", token: remote.token },
    });

    expect(result).toMatchObject({
      ok: true,
      connection: { label: "danielr/cabinet", secret: remote.token },
    });
  });

  it("refuses a token the repository does not know", async () => {
    const remote = new FakeGithub();

    const result = await providerOn(remote).connect({
      fields: { owner: "danielr", repo: "cabinet", token: "github_pat_wrong" },
    });

    expect(result).toEqual({ ok: false, reason: "auth" });
  });

  it("refuses a repository that is not there", async () => {
    const remote = new FakeGithub();
    remote.repoGone = true;

    const result = await providerOn(remote).connect({
      fields: { owner: "danielr", repo: "gone", token: remote.token },
    });

    expect(result).toEqual({ ok: false, reason: "gone" });
  });

  it("refuses what is not a repository at all", async () => {
    const remote = new FakeGithub();

    expect(
      await providerOn(remote).connect({ fields: { owner: "", repo: "", token: "x" } }),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(
      await providerOn(remote).connect({
        fields: { owner: "danielr", repo: "cabinet", token: "" },
      }),
    ).toEqual({ ok: false, reason: "invalid" });
  });

  it("takes a public repository on the same terms as a private one", async () => {
    const remote = new FakeGithub({ private: false });

    expect(await providerOn(remote).connect({ fields: fieldsOf(remote) })).toMatchObject({
      ok: true,
    });
  });

  it("refuses rather than assumes when the repository cannot be inspected", async () => {
    const remote = new FakeGithub();
    remote.unreachable = true;

    expect(await providerOn(remote).connect({ fields: fieldsOf(remote) })).toEqual({
      ok: false,
      reason: "auth",
    });
  });

  it("reopens from the locator and the stored token, and not without one", async () => {
    const remote = new FakeGithub();
    const provider = providerOn(remote);
    const locator = { owner: "danielr", repo: "cabinet", path: PATH, name: PATH };

    expect(await provider.reopen(locator, remote.token, "quiet")).toMatchObject({ ok: true });
    expect(await provider.reopen(locator, null, "quiet")).toEqual({ ok: false, reason: "auth" });
    expect(await provider.reopen({ owner: "danielr" }, remote.token, "quiet")).toEqual({
      ok: false,
      reason: "gone",
    });
  });

  it("follows a repository it cannot write to", async () => {
    const remote = new FakeGithub({ push: false });

    const store = await connected(remote);

    expect(await store.writable?.()).toBe(false);
  });
});

function fieldsOf(remote: FakeGithub): Record<string, string> {
  return { owner: remote.owner, repo: remote.repo, token: remote.token };
}

describe("the github store", () => {
  it("writes the counts into the commit message, which is what makes the log readable", async () => {
    const remote = new FakeGithub();
    const store = await connected(remote);

    await store.push("{}", null, "Cabinet: 2 shelves, 0 folders, 7 cards");

    expect(remote.messages).toEqual(["Cabinet: 2 shelves, 0 folders, 7 cards"]);
  });

  it("takes the revision from the blob, so head and pull agree", async () => {
    const remote = new FakeGithub();
    const store = await connected(remote);

    const written = await store.push("the cabinet", null, "Cabinet: 1 shelf");
    const head = await store.head();

    expect(written).toEqual({ ok: true, revision: head?.revision });
    expect((await store.pull()).revision).toBe(head?.revision);
  });

  it("reports a token without write access as read only", async () => {
    const remote = new FakeGithub({ push: false });
    const store = await connected(remote);

    expect(await store.push("mine", null, "Cabinet: 1 shelf")).toEqual({
      ok: false,
      reason: "readonly",
    });
  });

  it("fails rather than calling the cabinet absent when the repository stops answering", async () => {
    const remote = new FakeGithub();
    const store = await connected(remote);
    await store.push("mine", null, "Cabinet: 1 shelf");

    remote.repoGone = true;

    await expect(store.head()).rejects.toThrow();
    expect(await store.push("mine", null, "Cabinet: 1 shelf")).toEqual({
      ok: false,
      reason: "auth",
    });
  });

  it("puts the cabinet where the path says, and its siblings beside it", async () => {
    const remote = new FakeGithub();
    const store = await connected(remote, { path: "backups" });

    await store.push("mine", null, "Cabinet: 1 shelf");
    await store.sibling("thoughtcabinet-copy.json", "theirs");

    expect(remote.textOf("backups/thoughtcabinet.json")).toBe("mine");
    expect(remote.textOf("backups/thoughtcabinet-copy.json")).toBe("theirs");
    expect(await store.siblings?.()).toEqual(["thoughtcabinet.json", "thoughtcabinet-copy.json"]);
  });

  it("takes another name rather than writing over a sibling that is there", async () => {
    const remote = new FakeGithub();
    const store = await connected(remote);
    remote.put("thoughtcabinet-copy.json", "theirs");

    const written = await store.sibling("thoughtcabinet-copy.json", "mine");

    expect(written).toBe("thoughtcabinet-copy-2.json");
    expect(remote.textOf("thoughtcabinet-copy.json")).toBe("theirs");
  });

  it("reads a stray sibling, which is how the conflicted copy offer sees one", async () => {
    const remote = new FakeGithub();
    const store = await connected(remote);
    remote.put("thoughtcabinet 2.json", "stranded");

    expect((await store.pullFrom?.("thoughtcabinet 2.json"))?.text).toBe("stranded");
  });

  it("carries the cabinet's own file name into the locator, so adoption can rename it", async () => {
    const remote = new FakeGithub();
    const provider = providerOn(remote);
    const result = await provider.connect({ fields: { ...fieldsOf(remote), path: "backups" } });
    if (!result.ok) throw new Error("refused");

    const reopened = await provider.reopen(
      { ...result.connection.locator, name: "thoughtcabinet-work-laptop.json" },
      remote.token,
      "quiet",
    );
    if (!reopened.ok) throw new Error("refused");
    await reopened.store.push("mirror", null, "Cabinet: 1 shelf");

    expect(remote.textOf("backups/thoughtcabinet-work-laptop.json")).toBe("mirror");
  });
});
