import { describe, expect, it } from "vitest";
import {
  isYouTubeUrl,
  thumbnailFallbackFor,
  thumbnailSrcSetFor,
  youtubeOEmbedUrl,
  youtubeThumbnail,
  youtubeVideoId,
} from "./youtube";

const ID = "dQw4w9WgXcQ";

function idOf(raw: string): string {
  return youtubeVideoId(new URL(raw));
}

describe("youtubeVideoId", () => {
  it("reads every shape of youtube url", () => {
    expect(idOf(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(idOf(`https://youtu.be/${ID}`)).toBe(ID);
    expect(idOf(`https://www.youtube.com/shorts/${ID}`)).toBe(ID);
    expect(idOf(`https://www.youtube.com/live/${ID}`)).toBe(ID);
    expect(idOf(`https://www.youtube.com/embed/${ID}`)).toBe(ID);
    expect(idOf(`https://m.youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(idOf(`https://music.youtube.com/watch?v=${ID}`)).toBe(ID);
  });

  it("survives extra parameters and timestamps", () => {
    expect(idOf(`https://www.youtube.com/watch?v=${ID}&t=42s&list=PLabc`)).toBe(ID);
    expect(idOf(`https://youtu.be/${ID}?t=42`)).toBe(ID);
    expect(idOf(`https://www.youtube.com/watch?app=desktop&v=${ID}`)).toBe(ID);
  });

  it("gives nothing back for non-videos and other hosts", () => {
    expect(idOf("https://www.youtube.com/")).toBe("");
    expect(idOf("https://www.youtube.com/@someChannel")).toBe("");
    expect(idOf("https://www.youtube.com/watch?v=tooshort")).toBe("");
    expect(idOf("https://example.com/watch?v=dQw4w9WgXcQ")).toBe("");
  });

  it("drives the resolver's match check", () => {
    expect(isYouTubeUrl(new URL(`https://youtu.be/${ID}`))).toBe(true);
    expect(isYouTubeUrl(new URL("https://example.com/a"))).toBe(false);
  });
});

describe("youtubeOEmbedUrl", () => {
  it("encodes the video url into the oembed endpoint", () => {
    expect(youtubeOEmbedUrl(new URL(`https://youtu.be/${ID}`))).toBe(
      `https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fyoutu.be%2F${ID}`,
    );
  });
});

describe("thumbnails", () => {
  it("asks for the largest thumbnail first", () => {
    expect(youtubeThumbnail(ID)).toBe(`https://i.ytimg.com/vi/${ID}/maxresdefault.jpg`);
  });

  it("steps down to hqdefault when maxres is missing", () => {
    expect(thumbnailFallbackFor(youtubeThumbnail(ID))).toBe(
      `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`,
    );
  });

  it("has nothing to offer for any other image", () => {
    expect(thumbnailFallbackFor("https://example.com/og.png")).toBe("");
    expect(thumbnailFallbackFor(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`)).toBe("");
  });

  it("offers a small widescreen source so a 72px slot never decodes 1280px", () => {
    expect(thumbnailSrcSetFor(youtubeThumbnail(ID))).toBe(
      `https://i.ytimg.com/vi/${ID}/mqdefault.jpg 320w, https://i.ytimg.com/vi/${ID}/maxresdefault.jpg 1280w`,
    );
  });

  it("describes no sizes for an image it does not own", () => {
    expect(thumbnailSrcSetFor("https://example.com/og.png")).toBe("");
  });
});
