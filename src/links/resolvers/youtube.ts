import { previewFromOEmbed } from "@/domain/links/oembed";
import {
  isYouTubeUrl,
  youtubeOEmbedUrl,
  youtubeThumbnail,
  youtubeVideoId,
} from "@/domain/links/sites/youtube";
import type { LinkResolver } from "./types";

export const youtubeResolver: LinkResolver = {
  id: "youtube",
  matches: isYouTubeUrl,
  read: async (url, context) => {
    const preview = previewFromOEmbed(await context.fetchJson(youtubeOEmbedUrl(url)), url);
    if (!preview) return null;

    return {
      ...preview,
      siteName: preview.siteName || "YouTube",
      image: youtubeThumbnail(youtubeVideoId(url)),
      cat: "video",
    };
  },
};
