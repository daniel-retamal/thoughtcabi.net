import { hostnameOf } from "../url";

const YOUTUBE_HOSTS = /^(youtube\.com|m\.youtube\.com|music\.youtube\.com|youtube-nocookie\.com)$/;
const SHORT_HOST = /^youtu\.be$/;
const PATH_PREFIXED_ID = /^\/(shorts|live|embed|v)\/([A-Za-z0-9_-]{11})(?:[/?#]|$)/;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function youtubeVideoId(url: URL): string {
  const host = hostnameOf(url);

  if (SHORT_HOST.test(host)) {
    const id = url.pathname.slice(1).split("/")[0] ?? "";
    return VIDEO_ID.test(id) ? id : "";
  }

  if (!YOUTUBE_HOSTS.test(host)) return "";

  const fromQuery = url.searchParams.get("v") ?? "";
  if (VIDEO_ID.test(fromQuery)) return fromQuery;

  return PATH_PREFIXED_ID.exec(url.pathname)?.[2] ?? "";
}

export function isYouTubeUrl(url: URL): boolean {
  return youtubeVideoId(url) !== "";
}

export function youtubeOEmbedUrl(url: URL): string {
  return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.href)}`;
}

export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}

const MAXRES_THUMBNAIL = /^https:\/\/i\.ytimg\.com\/vi\/([A-Za-z0-9_-]{11})\/maxresdefault\.jpg$/;

export function thumbnailFallbackFor(src: string): string {
  const videoId = MAXRES_THUMBNAIL.exec(src)?.[1];
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";
}

export function thumbnailSrcSetFor(src: string): string {
  const videoId = MAXRES_THUMBNAIL.exec(src)?.[1];
  if (!videoId) return "";
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg 320w, ${src} 1280w`;
}
