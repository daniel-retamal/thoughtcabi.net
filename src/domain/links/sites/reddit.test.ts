import { describe, expect, it } from "vitest";
import { emptyPage, type PageContent } from "../metaTags";
import {
  previewFromReddit,
  previewFromRedditOembed,
  redditGated,
  redditOembedUrl,
  redditPage,
  redditReadableUrl,
  type RedditPage,
} from "./reddit";

function pageOf(raw: string): RedditPage | null {
  return redditPage(new URL(raw));
}

function readableFor(raw: string): string {
  const target = pageOf(raw);
  return target ? redditReadableUrl(target) : "";
}

function content(overrides: Partial<PageContent> = {}): PageContent {
  return { ...emptyPage(), ...overrides };
}

describe("redditPage", () => {
  it("recognises a subreddit and the ways it is sorted", () => {
    expect(pageOf("https://www.reddit.com/r/spiderman")).toMatchObject({
      kind: "listing",
      name: "spiderman",
    });
    expect(pageOf("https://www.reddit.com/r/spiderman/top/?t=week")).toMatchObject({
      kind: "listing",
      name: "spiderman",
    });
  });

  it("recognises a post wherever the permalink hangs off", () => {
    expect(pageOf("https://www.reddit.com/r/Spiderman/comments/1vmsx27/jonah/")).toMatchObject({
      kind: "post",
    });
    expect(pageOf("https://www.reddit.com/comments/1vmsx27")).toMatchObject({ kind: "post" });
    expect(pageOf("https://www.reddit.com/user/spez/comments/1vmsx27/hello/")).toMatchObject({
      kind: "post",
    });
  });

  it("recognises both spellings of a profile", () => {
    expect(pageOf("https://www.reddit.com/user/spez")).toMatchObject({ kind: "user", name: "spez" });
    expect(pageOf("https://www.reddit.com/u/spez")).toMatchObject({ kind: "user", name: "spez" });
  });

  it("keeps the subreddit of a share link it cannot otherwise name", () => {
    expect(pageOf("https://www.reddit.com/r/spiderman/s/AbCd1234")).toMatchObject({
      kind: "listing",
      name: "spiderman",
    });
  });

  it("expands a short link into a post permalink", () => {
    expect(pageOf("https://redd.it/1vmsx27")).toEqual({
      kind: "post",
      name: "",
      path: "/comments/1vmsx27",
    });
  });

  it("answers for every reddit host, and for no other", () => {
    expect(pageOf("https://old.reddit.com/r/spiderman")).not.toBeNull();
    expect(pageOf("https://sh.reddit.com/r/spiderman")).not.toBeNull();
    expect(pageOf("https://reddit.com/")).toMatchObject({ kind: "listing", name: "" });
    expect(pageOf("https://i.redd.it/abc.jpeg")).toBeNull();
    expect(pageOf("https://notreddit.com/r/spiderman")).toBeNull();
  });
});

describe("redditReadableUrl", () => {
  it("asks the old site, which answers a reader instead of a challenge", () => {
    expect(readableFor("https://www.reddit.com/r/spiderman/")).toBe(
      "https://old.reddit.com/r/spiderman/",
    );
    expect(readableFor("https://sh.reddit.com/r/spiderman/top/?t=week")).toBe(
      "https://old.reddit.com/r/spiderman/top/?t=week",
    );
    expect(readableFor("https://redd.it/1vmsx27")).toBe("https://old.reddit.com/comments/1vmsx27");
  });
});

describe("redditGated", () => {
  it("knows the login wall the old site answers with when it will not read", () => {
    expect(
      redditGated(
        content({
          title: "Welcome to Reddit",
          tags: {
            description:
              "Log in or sign up to personalize your feed, join conversations, vote, and explore communities.",
          },
        }),
      ),
    ).toBe(true);
  });

  it("leaves a profile alone, which has a description and no og:title of its own", () => {
    expect(redditGated(content({ title: "overview for spez", tags: { description: "Reddit CEO." } })))
      .toBe(false);
  });

  it("leaves any page that named itself alone", () => {
    expect(redditGated(content({ tags: { "og:title": "Welcome to Reddit" } }))).toBe(false);
    expect(redditGated(emptyPage())).toBe(false);
  });
});

describe("redditOembedUrl", () => {
  function embedFor(raw: string): string | null {
    const target = pageOf(raw);
    return target ? redditOembedUrl(target) : null;
  }

  it("asks about a post by its canonical permalink, without the host or the sort it was pasted with", () => {
    expect(embedFor("https://sh.reddit.com/r/JRPG/comments/1pok2l5/art/?utm_source=share")).toBe(
      "https://www.reddit.com/oembed?url=https%3A%2F%2Fwww.reddit.com%2Fr%2FJRPG%2Fcomments%2F1pok2l5%2Fart%2F",
    );
  });

  it("declines everything oembed has no answer for", () => {
    expect(embedFor("https://www.reddit.com/r/JRPG/")).toBeNull();
    expect(embedFor("https://www.reddit.com/user/spez")).toBeNull();
    expect(embedFor("https://www.reddit.com/comments/1pok2l5")).toBeNull();
    expect(embedFor("https://redd.it/1pok2l5")).toBeNull();
  });
});

describe("previewFromRedditOembed", () => {
  const url = new URL("https://www.reddit.com/r/JRPG/comments/1pok2l5/art/");
  const target: RedditPage = { kind: "post", name: "", path: "/r/JRPG/comments/1pok2l5/art/" };

  it("takes the post's real title and credits the author", () => {
    expect(
      previewFromRedditOembed(
        { title: "Jrpgs with experimental/unique art direction?", author_name: "WingNo4260" },
        url,
        target,
      ),
    ).toMatchObject({
      title: "Jrpgs with experimental/unique art direction?",
      description: "u/WingNo4260",
      siteName: "Reddit",
      cat: "forum",
      image: "",
    });
  });

  it("declines a payload that carries no title", () => {
    expect(previewFromRedditOembed({ author_name: "WingNo4260" }, url, target)).toBeNull();
    expect(previewFromRedditOembed(null, url, target)).toBeNull();
  });
});

describe("previewFromReddit", () => {
  const subredditUrl = new URL("https://www.reddit.com/r/spiderman/");
  const subreddit: RedditPage = { kind: "listing", name: "spiderman", path: "/r/spiderman/" };

  it("reads the subreddit's own title, description and banner", () => {
    const preview = previewFromReddit(
      content({
        tags: {
          "og:title": "Spider-Man • r/Spiderman",
          "og:description": "The subreddit for the friendly neighborhood wall crawler.",
          "og:image": "https://styles.redditmedia.com/t5_2rw42/styles/banner.png",
          "og:site_name": "reddit",
        },
        title: "Spider-Man",
      }),
      subredditUrl,
      subreddit,
    );

    expect(preview).toMatchObject({
      title: "Spider-Man • r/Spiderman",
      description: "The subreddit for the friendly neighborhood wall crawler.",
      image: "https://styles.redditmedia.com/t5_2rw42/styles/banner.png",
      siteName: "Reddit",
      domain: "reddit.com",
      cat: "forum",
    });
  });

  it("names the subreddit itself when the page could not be read", () => {
    const preview = previewFromReddit(emptyPage(), subredditUrl, subreddit);

    expect(preview).toMatchObject({
      title: "r/spiderman",
      description: "",
      image: "",
      siteName: "Reddit",
      cat: "forum",
    });
  });

  it("names a profile after its owner rather than after the page heading", () => {
    const preview = previewFromReddit(
      content({ tags: { description: "Reddit CEO." }, title: "overview for spez" }),
      new URL("https://www.reddit.com/user/spez"),
      { kind: "user", name: "spez", path: "/user/spez" },
    );

    expect(preview).toMatchObject({ title: "u/spez on Reddit", description: "Reddit CEO." });
  });

  it("keeps a post's own title and picture", () => {
    const preview = previewFromReddit(
      content({
        tags: {
          "og:title": "Jonah respects Spider-Woman's transition",
          "og:description": "This kind of art is becoming a trend.",
          "og:image": "https://preview.redd.it/opyu2di5u0jh1.jpeg?width=768",
          "og:image:width": "768",
          "og:image:height": "402.094240838",
        },
      }),
      new URL("https://www.reddit.com/r/Spiderman/comments/1vmsx27/jonah/"),
      { kind: "post", name: "", path: "/r/Spiderman/comments/1vmsx27/jonah/" },
    );

    expect(preview).toMatchObject({
      title: "Jonah respects Spider-Woman's transition",
      image: "https://preview.redd.it/opyu2di5u0jh1.jpeg?width=768",
      siteName: "Reddit",
    });
  });

  it("falls back to the permalink slug for a post it could not read", () => {
    const preview = previewFromReddit(
      emptyPage(),
      new URL("https://www.reddit.com/r/Spiderman/comments/1vmsx27/jonah_respects_spider_woman/"),
      { kind: "post", name: "", path: "/r/Spiderman/comments/1vmsx27/jonah_respects_spider_woman/" },
    );

    expect(preview.title).toBe("Jonah Respects Spider Woman");
  });
});
