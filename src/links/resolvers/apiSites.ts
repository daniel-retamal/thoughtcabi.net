import { blueskyPost, blueskyRecordUrl, previewFromBluesky } from "@/domain/links/sites/bluesky";
import { githubApiUrl, githubRepo, previewFromGitHub } from "@/domain/links/sites/github";
import {
  previewFromWikipedia,
  wikipediaArticle,
  wikipediaSummaryUrl,
} from "@/domain/links/sites/wikipedia";
import type { LinkResolver } from "./types";

export const githubResolver: LinkResolver = {
  id: "github",
  matches: (url) => githubRepo(url) !== null,
  read: async (url, context) => {
    const repo = githubRepo(url);
    if (!repo) return null;
    return previewFromGitHub(await context.fetchJson(githubApiUrl(repo)), url);
  },
};

export const wikipediaResolver: LinkResolver = {
  id: "wikipedia",
  matches: (url) => wikipediaArticle(url) !== "",
  read: async (url, context) => {
    const article = wikipediaArticle(url);
    if (!article) return null;
    return previewFromWikipedia(await context.fetchJson(wikipediaSummaryUrl(url, article)), url);
  },
};

export const blueskyResolver: LinkResolver = {
  id: "bluesky",
  matches: (url) => blueskyPost(url) !== null,
  read: async (url, context) => {
    const post = blueskyPost(url);
    if (!post) return null;
    return previewFromBluesky(await context.fetchJson(blueskyRecordUrl(post)), url, post.handle);
  },
};
