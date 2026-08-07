import { previewFromPage } from "@/domain/links/metaTags";
import { pageContentFromHtml } from "../parseHtml";
import type { LinkResolver } from "./types";

export const genericResolver: LinkResolver = {
  id: "generic",
  matches: () => true,
  read: async (url, context) => {
    const html = await context.fetchViaRelay(url.href);
    if (!html) return null;
    return previewFromPage(pageContentFromHtml(html), url);
  },
};
