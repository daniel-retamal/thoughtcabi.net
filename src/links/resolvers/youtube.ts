import { emptyPreview } from "@/domain/links/linkPreview";
import { previewFromOEmbed } from "@/domain/links/oembed";
import {
  isYouTubeUrl,
  youtubeOEmbedUrl,
  youtubeThumbnail,
  youtubeVideoId,
} from "@/domain/links/sites/youtube";
import { hostnameOf } from "@/domain/links/url";
import type { LinkResolver } from "./types";

export const youtubeResolver: LinkResolver = {
  id: "youtube",
  matches: isYouTubeUrl,
  read: async (url, context) => {
    const oembed = previewFromOEmbed(await context.fetchJson(youtubeOEmbedUrl(url)), url);
    const preview = oembed ?? emptyPreview(url.href, hostnameOf(url));

    return {
      ...preview,
      siteName: preview.siteName || "YouTube",
      image: youtubeThumbnail(youtubeVideoId(url)),
      cat: "video",
    };
  },
};
