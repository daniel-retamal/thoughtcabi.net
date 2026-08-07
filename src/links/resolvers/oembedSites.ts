import { previewFromOEmbed } from "@/domain/links/oembed";
import { hostnameOf } from "@/domain/links/url";
import type { LinkResolver } from "./types";

function oembedResolver(id: string, hosts: RegExp, endpoint: string): LinkResolver {
  return {
    id,
    matches: (url) => hosts.test(hostnameOf(url)),
    read: async (url, context) =>
      previewFromOEmbed(await context.fetchJson(endpoint + encodeURIComponent(url.href)), url),
  };
}

export const vimeoResolver = oembedResolver(
  "vimeo",
  /^(vimeo\.com|player\.vimeo\.com)$/,
  "https://vimeo.com/api/oembed.json?url=",
);

export const spotifyResolver = oembedResolver(
  "spotify",
  /^open\.spotify\.com$/,
  "https://open.spotify.com/oembed?url=",
);

export const soundcloudResolver = oembedResolver(
  "soundcloud",
  /^(soundcloud\.com|on\.soundcloud\.com)$/,
  "https://soundcloud.com/oembed?format=json&url=",
);
