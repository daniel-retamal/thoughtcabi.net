import { describe, expect, it, vi } from "vitest";
import type { ImageMeasurement } from "@/domain/links/imageCandidate";
import { relayedUrl } from "./relay";
import { readLink, type ReadLinkDeps } from "./readLink";
import type { ImageMeasurer } from "./measureImage";
import type { Fetcher } from "./fetchText";

const OWN_RELAY = "/relay?url=";
const SPARE_RELAY = "https://relay.example.com/?url=";
const RELAYS = [OWN_RELAY, SPARE_RELAY];

type Routes = Record<string, { body: string; status?: number }>;

const measuresEverything: ImageMeasurer = () =>
  Promise.resolve({ status: "measured", size: { width: 1200, height: 630 } });

function measurerFor(sizes: Record<string, ImageMeasurement>): ImageMeasurer {
  return (url) => Promise.resolve(sizes[url] ?? { status: "unreachable" });
}

function deps(overrides: ReadLinkDeps = {}): ReadLinkDeps {
  return { relays: RELAYS, measureImage: measuresEverything, ...overrides };
}

function fetcherFor(routes: Routes): Fetcher {
  return (input) => {
    const route = routes[input];
    if (!route) return Promise.resolve(new Response("", { status: 404 }));
    return Promise.resolve(new Response(route.body, { status: route.status ?? 200 }));
  };
}

function relayRoute(target: string, body: string, endpoint = OWN_RELAY): Routes {
  return { [relayedUrl(endpoint, target)]: { body } };
}

const ARTICLE_HTML = `
  <html><head>
    <meta property="og:title" content="The Quiet Revolution" />
    <meta property="og:description" content="How reading changed." />
    <meta property="og:image" content="/og.png" />
    <meta property="og:site_name" content="Example" />
    <meta property="og:type" content="article" />
  </head></html>
`;

describe("readLink", () => {
  it("refuses anything that is not a link", async () => {
    expect(await readLink("just a thought")).toBeNull();
    expect(await readLink("")).toBeNull();
    expect(await readLink(null)).toBeNull();
  });

  it("reads a normal page through the relay", async () => {
    const url = "https://example.com/posts/quiet";
    const preview = await readLink(
      url,
      deps({ fetcher: fetcherFor(relayRoute(url, ARTICLE_HTML)) }),
    );

    expect(preview).toMatchObject({
      url,
      domain: "example.com",
      title: "The Quiet Revolution",
      description: "How reading changed.",
      image: "https://example.com/og.png",
      siteName: "Example",
      cat: "article",
    });
  });

  it("falls through to the next relay when the first one fails", async () => {
    const url = "https://example.com/posts/quiet";
    const fetcher = vi.fn(fetcherFor(relayRoute(url, ARTICLE_HTML, SPARE_RELAY)));

    const preview = await readLink(url, deps({ fetcher }));

    expect(preview?.title).toBe("The Quiet Revolution");
    expect(fetcher.mock.calls[0]?.[0]).toBe(relayedUrl(OWN_RELAY, url));
    expect(fetcher.mock.calls[1]?.[0]).toBe(relayedUrl(SPARE_RELAY, url));
  });

  it("reads a youtube video straight from oembed, with no relay involved", async () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const oembed =
      "https://www.youtube.com/oembed?format=json&url=" +
      encodeURIComponent("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    const fetcher = vi.fn(
      fetcherFor({
        [oembed]: {
          body: JSON.stringify({
            title: "Never Gonna Give You Up",
            author_name: "Rick Astley",
            thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
            provider_name: "YouTube",
          }),
        },
      }),
    );

    const preview = await readLink(url, deps({ fetcher }));

    expect(preview).toMatchObject({
      title: "Never Gonna Give You Up",
      description: "Rick Astley",
      siteName: "YouTube",
      image: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      cat: "video",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("strips tracking parameters from what it stores", async () => {
    const clean = "https://example.com/posts/quiet";
    const preview = await readLink(
      `${clean}?utm_source=newsletter`,
      deps({ fetcher: fetcherFor(relayRoute(clean, ARTICLE_HTML)) }),
    );
    expect(preview?.url).toBe(clean);
  });

  it("still returns a usable card when every fetch fails", async () => {
    const preview = await readLink(
      "https://example.com/posts/the-quiet-revolution",
      deps({ fetcher: fetcherFor({}) }),
    );

    expect(preview).toMatchObject({
      url: "https://example.com/posts/the-quiet-revolution",
      domain: "example.com",
      title: "The Quiet Revolution",
      description: "",
      image: "",
      siteName: "",
    });
  });

  it("adds nothing at all when the page has no metadata", async () => {
    const url = "https://example.com/x1";
    const preview = await readLink(
      url,
      deps({ fetcher: fetcherFor(relayRoute(url, "<html><head></head><body></body></html>")) }),
    );

    expect(preview?.title).toBe("");
    expect(preview?.description).toBe("");
    expect(preview?.image).toBe("");
    expect(preview?.siteName).toBe("");
  });

  it("falls back to the generic reader when a site resolver comes up empty", async () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const preview = await readLink(
      url,
      deps({ fetcher: fetcherFor(relayRoute(url, ARTICLE_HTML)) }),
    );
    expect(preview?.title).toBe("The Quiet Revolution");
  });

  it("survives a resolver that throws", async () => {
    const fetcher: Fetcher = () => Promise.reject(new Error("network down"));
    const preview = await readLink(
      "https://example.com/posts/quiet-page",
      deps({ fetcher, relays: [] }),
    );
    expect(preview).toMatchObject({ domain: "example.com", title: "Quiet Page" });
  });

  it("ignores a relay that answers with an error status", async () => {
    const url = "https://example.com/x2";
    const preview = await readLink(
      url,
      deps({
        fetcher: fetcherFor({ [relayedUrl(OWN_RELAY, url)]: { body: ARTICLE_HTML, status: 502 } }),
        relays: [OWN_RELAY],
      }),
    );
    expect(preview?.title).toBe("");
  });

  it("drops a preview image that turns out to be a tracking pixel", async () => {
    const url = "https://example.com/posts/quiet";
    const preview = await readLink(
      url,
      deps({
        fetcher: fetcherFor(relayRoute(url, ARTICLE_HTML)),
        measureImage: measurerFor({
          "https://example.com/og.png": { status: "measured", size: { width: 1, height: 1 } },
        }),
      }),
    );

    expect(preview?.image).toBe("");
    expect(preview?.title).toBe("The Quiet Revolution");
  });

  it("drops a preview image that cannot be loaded at all", async () => {
    const url = "https://example.com/posts/quiet";
    const preview = await readLink(
      url,
      deps({
        fetcher: fetcherFor(relayRoute(url, ARTICLE_HTML)),
        measureImage: measurerFor({}),
      }),
    );

    expect(preview?.image).toBe("");
  });

  it("keeps a preview image it was unable to measure", async () => {
    const url = "https://example.com/posts/quiet";
    const preview = await readLink(
      url,
      deps({
        fetcher: fetcherFor(relayRoute(url, ARTICLE_HTML)),
        measureImage: () => Promise.resolve({ status: "unknown" }),
      }),
    );

    expect(preview?.image).toBe("https://example.com/og.png");
  });

  it("ignores an og:image the page itself declares as icon-sized", async () => {
    const url = "https://example.com/posts/tiny";
    const html = `
      <meta property="og:image" content="https://example.com/logo.png" />
      <meta property="og:image:width" content="48" />
      <meta property="og:image:height" content="48" />
    `;
    const measureImage = vi.fn(measuresEverything);

    const preview = await readLink(
      url,
      deps({ fetcher: fetcherFor(relayRoute(url, html)), measureImage }),
    );

    expect(preview?.image).toBe("");
    expect(measureImage).not.toHaveBeenCalled();
  });

  it("puts a repository's social card on a github link, with no relay involved", async () => {
    const url = "https://github.com/facebook/react";
    const fetcher = vi.fn(
      fetcherFor({
        "https://api.github.com/repos/facebook/react": {
          body: JSON.stringify({
            full_name: "react/react",
            description: "The library for web and native user interfaces.",
            pushed_at: "2026-08-13T03:24:44Z",
            owner: { avatar_url: "https://avatars.githubusercontent.com/u/1024025?v=4" },
          }),
        },
      }),
    );

    const preview = await readLink(url, deps({ fetcher }));

    expect(preview).toMatchObject({
      title: "react/react",
      description: "The library for web and native user interfaces.",
      siteName: "GitHub",
      image: "https://opengraph.githubassets.com/2026-08-13T03%3A24%3A44Z/react/react",
      cat: "dev",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reads a pull request as itself rather than as its repository", async () => {
    const url = "https://github.com/facebook/react/pull/34000";
    const html = `
      <meta property="og:title" content="[compiler] Fixes by josephsavona · Pull Request #34000" />
      <meta property="og:image" content="https://opengraph.githubassets.com/abc/react/react/pull/34000" />
      <meta property="og:site_name" content="GitHub" />
    `;

    const preview = await readLink(url, deps({ fetcher: fetcherFor(relayRoute(url, html)) }));

    expect(preview).toMatchObject({
      title: "[compiler] Fixes by josephsavona · Pull Request #34000",
      image: "https://opengraph.githubassets.com/abc/react/react/pull/34000",
      cat: "dev",
    });
  });

  it("reads a subreddit through the old site, which is the one that answers", async () => {
    const url = "https://www.reddit.com/r/spiderman/";
    const html = `
      <meta property="og:title" content="Spider-Man &bull; r/Spiderman" />
      <meta property="og:description" content="The friendly neighborhood wall crawler." />
      <meta property="og:image" content="https://styles.redditmedia.com/t5_2rw42/banner.png" />
      <meta property="og:site_name" content="reddit" />
    `;
    const fetcher = vi.fn(fetcherFor(relayRoute("https://old.reddit.com/r/spiderman/", html)));

    const preview = await readLink(url, deps({ fetcher }));

    expect(preview).toMatchObject({
      url,
      domain: "reddit.com",
      title: "Spider-Man • r/Spiderman",
      description: "The friendly neighborhood wall crawler.",
      image: "https://styles.redditmedia.com/t5_2rw42/banner.png",
      siteName: "Reddit",
      cat: "forum",
    });
    expect(fetcher.mock.calls.map((call) => call[0])).not.toContain(relayedUrl(OWN_RELAY, url));
  });

  it("never asks www.reddit.com, whose answer to a robot is a holding page", async () => {
    const url = "https://www.reddit.com/r/spiderman/";
    const holdingPage = "<html><head><title>Reddit</title></head><body></body></html>";
    const fetcher = vi.fn(fetcherFor(relayRoute(url, holdingPage)));

    const preview = await readLink(url, deps({ fetcher }));

    expect(preview).toMatchObject({ title: "r/spiderman", siteName: "Reddit", cat: "forum" });
  });

  it("steps down to the smaller youtube thumbnail when the large one is missing", async () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const oembed =
      "https://www.youtube.com/oembed?format=json&url=" +
      encodeURIComponent("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    const preview = await readLink(
      url,
      deps({
        fetcher: fetcherFor({
          [oembed]: { body: JSON.stringify({ title: "Never Gonna Give You Up" }) },
        }),
        measureImage: measurerFor({
          "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg": {
            status: "measured",
            size: { width: 480, height: 360 },
          },
        }),
      }),
    );

    expect(preview?.image).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });
});
