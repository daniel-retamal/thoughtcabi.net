import { emptyPage } from "@/domain/links/metaTags";
import { previewFromReddit, redditPage, redditReadableUrl } from "@/domain/links/sites/reddit";
import { pageContentFromHtml } from "../parseHtml";
import type { LinkResolver } from "./types";

export const redditResolver: LinkResolver = {
  id: "reddit",
  matches: (url) => redditPage(url) !== null,
  read: async (url, context) => {
    const target = redditPage(url);
    if (!target) return null;

    const html = await context.fetchViaRelay(redditReadableUrl(target));
    return previewFromReddit(html ? pageContentFromHtml(html) : emptyPage(), url, target);
  },
};
