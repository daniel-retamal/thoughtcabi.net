import {
  isTweetUrl,
  previewFromTweet,
  syndicationUrl,
  tweetId,
} from "@/domain/links/sites/twitter";
import type { LinkResolver } from "./types";

export const twitterResolver: LinkResolver = {
  id: "twitter",
  matches: isTweetUrl,
  read: async (url, context) => {
    const payload = await context.fetchJsonViaRelay(syndicationUrl(tweetId(url)));
    return previewFromTweet(payload, url);
  },
};
