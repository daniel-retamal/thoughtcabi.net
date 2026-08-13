import type { LinkPreview } from "../linkPreview";
import { previewFromPage, type PageContent } from "../metaTags";
import { hostnameOf } from "../url";

const REDDIT_HOSTS = /^([a-z0-9-]+\.)?reddit\.com$/;
const SHORT_HOST = /^redd\.it$/;
const READABLE_ORIGIN = "https://old.reddit.com";

const POST_PATH = /^\/(?:(?:r|u|user)\/[^/]+\/)?comments\/[a-z0-9]+/i;
const USER_PATH = /^\/u(?:ser)?\/([^/]+)/;
const SUBREDDIT_PATH = /^\/r\/([^/]+)/;
const POST_ID = /^[a-z0-9]+$/i;

export type RedditKind = "post" | "user" | "listing";

export interface RedditPage {
  kind: RedditKind;
  name: string;
  path: string;
}

export function redditPage(url: URL): RedditPage | null {
  const host = hostnameOf(url);

  if (SHORT_HOST.test(host)) {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return POST_ID.test(id) ? { kind: "post", name: "", path: `/comments/${id}` } : null;
  }

  if (!REDDIT_HOSTS.test(host)) return null;

  const path = `${url.pathname}${url.search}`;
  if (POST_PATH.test(url.pathname)) return { kind: "post", name: "", path };

  const user = USER_PATH.exec(url.pathname)?.[1];
  if (user) return { kind: "user", name: user, path };

  return { kind: "listing", name: SUBREDDIT_PATH.exec(url.pathname)?.[1] ?? "", path };
}

export function redditReadableUrl({ path }: RedditPage): string {
  return `${READABLE_ORIGIN}${path}`;
}

function nameFromLink({ kind, name }: RedditPage): string {
  if (!name) return "";
  return kind === "user" ? `u/${name} on Reddit` : `r/${name}`;
}

export function previewFromReddit(page: PageContent, url: URL, target: RedditPage): LinkPreview {
  const preview = previewFromPage(page, url);

  preview.title = page.tags["og:title"]?.trim() || nameFromLink(target) || preview.title;
  preview.siteName = "Reddit";

  return preview;
}
