import { describe, expect, it } from "vitest";
import { githubApiUrl, githubRepo, githubSocialImageUrl, previewFromGitHub } from "./github";

function repoOf(raw: string): ReturnType<typeof githubRepo> {
  return githubRepo(new URL(raw));
}

const REPO_PAYLOAD = {
  full_name: "react/react",
  description: "The library for web and native user interfaces.",
  pushed_at: "2026-08-13T03:24:44Z",
  owner: { avatar_url: "https://avatars.githubusercontent.com/u/1024025?v=4" },
};

describe("githubRepo", () => {
  it("reads the owner and repo of a repository page", () => {
    expect(repoOf("https://github.com/facebook/react")).toEqual({
      owner: "facebook",
      repo: "react",
    });
    expect(repoOf("https://github.com/facebook/react/")).toEqual({
      owner: "facebook",
      repo: "react",
    });
    expect(repoOf("https://github.com/facebook/react?tab=readme-ov-file")).toEqual({
      owner: "facebook",
      repo: "react",
    });
  });

  it("drops a clone suffix", () => {
    expect(repoOf("https://github.com/facebook/react.git")).toEqual({
      owner: "facebook",
      repo: "react",
    });
  });

  it("leaves anything deeper than a repository to the generic reader", () => {
    expect(repoOf("https://github.com/facebook/react/pull/34000")).toBeNull();
    expect(repoOf("https://github.com/facebook/react/issues/12")).toBeNull();
    expect(repoOf("https://github.com/facebook/react/tree/main/packages")).toBeNull();
  });

  it("ignores profiles, reserved paths and other hosts", () => {
    expect(repoOf("https://github.com/torvalds")).toBeNull();
    expect(repoOf("https://github.com/topics/react")).toBeNull();
    expect(repoOf("https://github.com/Sponsors/someone")).toBeNull();
    expect(repoOf("https://gist.github.com/defunkt/1")).toBeNull();
    expect(repoOf("https://example.com/facebook/react")).toBeNull();
  });
});

describe("githubApiUrl", () => {
  it("points at the repository endpoint", () => {
    expect(githubApiUrl({ owner: "facebook", repo: "react" })).toBe(
      "https://api.github.com/repos/facebook/react",
    );
  });
});

describe("githubSocialImageUrl", () => {
  const repo = { owner: "react", repo: "react" };

  it("names the repository under a cache key", () => {
    expect(githubSocialImageUrl(repo, "2026-08-13T03:24:44Z")).toBe(
      "https://opengraph.githubassets.com/2026-08-13T03%3A24%3A44Z/react/react",
    );
  });

  it("still makes a whole url when there is no revision to key on", () => {
    expect(githubSocialImageUrl(repo, "  ")).toBe(
      "https://opengraph.githubassets.com/1/react/react",
    );
  });
});

describe("previewFromGitHub", () => {
  const url = new URL("https://github.com/facebook/react");

  it("reads the repository name and description", () => {
    expect(previewFromGitHub(REPO_PAYLOAD, url)).toMatchObject({
      title: "react/react",
      description: "The library for web and native user interfaces.",
      siteName: "GitHub",
      cat: "dev",
      favicon: "https://github.com/favicon.ico",
    });
  });

  it("shows the repository's own social card and never the owner's face", () => {
    const preview = previewFromGitHub(REPO_PAYLOAD, url);

    expect(preview?.image).toBe(
      "https://opengraph.githubassets.com/2026-08-13T03%3A24%3A44Z/react/react",
    );
    expect(preview?.image).not.toContain("avatars.githubusercontent.com");
  });

  it("keys the card on the name the api considers canonical", () => {
    const preview = previewFromGitHub({ ...REPO_PAYLOAD, full_name: "vercel/next.js" }, url);
    expect(preview?.image).toBe(
      "https://opengraph.githubassets.com/2026-08-13T03%3A24%3A44Z/vercel/next.js",
    );
  });

  it("gives up rather than guessing on a useless payload", () => {
    expect(previewFromGitHub(null, url)).toBeNull();
    expect(previewFromGitHub({}, url)).toBeNull();
    expect(previewFromGitHub({ full_name: "react" }, url)).toBeNull();
    expect(previewFromGitHub("not json", url)).toBeNull();
  });
});
