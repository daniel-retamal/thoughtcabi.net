import { describe, expect, it } from "vitest";
import { isTweetUrl, previewFromTweet, syndicationUrl, tweetId } from "./twitter";

function idOf(raw: string): string {
  return tweetId(new URL(raw));
}

describe("tweetId", () => {
  it("reads the status id from both hosts", () => {
    expect(idOf("https://twitter.com/jack/status/20")).toBe("20");
    expect(idOf("https://x.com/jack/status/20")).toBe("20");
    expect(idOf("https://x.com/jack/status/20?s=46&t=abc")).toBe("20");
  });

  it("ignores profiles and other hosts", () => {
    expect(idOf("https://x.com/jack")).toBe("");
    expect(idOf("https://example.com/jack/status/20")).toBe("");
    expect(isTweetUrl(new URL("https://x.com/jack"))).toBe(false);
  });
});

describe("syndicationUrl", () => {
  it("carries the id and a derived token", () => {
    const url = new URL(syndicationUrl("1234567890123456789"));
    expect(url.origin + url.pathname).toBe("https://cdn.syndication.twimg.com/tweet-result");
    expect(url.searchParams.get("id")).toBe("1234567890123456789");
    expect(url.searchParams.get("token")).toMatch(/^[a-z0-9]+$/);
  });
});

describe("previewFromTweet", () => {
  const url = new URL("https://x.com/jack/status/20");

  it("reads the author, text and first image", () => {
    const preview = previewFromTweet(
      {
        text: "just setting up my twttr",
        user: { name: "jack", screen_name: "jack" },
        mediaDetails: [{ media_url_https: "https://pbs.twimg.com/media/a.jpg" }],
      },
      url,
    );

    expect(preview).toMatchObject({
      title: "jack (@jack) on X",
      description: "just setting up my twttr",
      siteName: "X",
      image: "https://pbs.twimg.com/media/a.jpg",
    });
  });

  it("leaves the image empty when the tweet had no media", () => {
    const preview = previewFromTweet(
      { text: "text only", user: { name: "jack", screen_name: "jack" } },
      url,
    );
    expect(preview?.image).toBe("");
  });

  it("gives up rather than guessing on a useless payload", () => {
    expect(previewFromTweet(null, url)).toBeNull();
    expect(previewFromTweet({}, url)).toBeNull();
    expect(previewFromTweet("not json", url)).toBeNull();
  });
});
