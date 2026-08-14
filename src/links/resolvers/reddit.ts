import { emptyPage } from "@/domain/links/metaTags";
import {
  previewFromReddit,
  previewFromRedditOembed,
  redditGated,
  redditOembedUrl,
  redditPage,
  redditReadableUrl,
  type RedditPage,
} from "@/domain/links/sites/reddit";
import type { LinkPreview } from "@/domain/links/linkPreview";
import { pageContentFromHtml } from "../parseHtml";
import type { LinkResolver, ResolverContext } from "./types";

async function fromOembed(
  url: URL,
  target: RedditPage,
  context: ResolverContext,
): Promise<LinkPreview | null> {
  const endpoint = redditOembedUrl(target);
  if (!endpoint) return null;

  return previewFromRedditOembed(await context.fetchJsonViaRelay(endpoint), url, target);
}

export const redditResolver: LinkResolver = {
  id: "reddit",
  matches: (url) => redditPage(url) !== null,
  read: async (url, context) => {
    const target = redditPage(url);
    if (!target) return null;

    const html = await context.fetchViaRelay(redditReadableUrl(target));
    const page = html ? pageContentFromHtml(html) : emptyPage();
    if (html && !redditGated(page)) return previewFromReddit(page, url, target);

    return (await fromOembed(url, target, context)) ?? previewFromReddit(emptyPage(), url, target);
  },
};
