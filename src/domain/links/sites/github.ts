import { asRecord, asText } from "@/lib/json";
import { emptyPreview, type LinkPreview } from "../linkPreview";
import { faviconUrl, hostnameOf } from "../url";

const GITHUB_HOST = /^github\.com$/;
const REPO_PATH = /^\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/;
const SOCIAL_CARD_ORIGIN = "https://opengraph.githubassets.com";
const UNVERSIONED_CARD = "1";
const RESERVED_OWNERS = new Set([
  "features",
  "topics",
  "collections",
  "sponsors",
  "settings",
  "marketplace",
  "explore",
  "orgs",
  "apps",
  "notifications",
  "pulls",
  "issues",
]);

export interface GitHubRepo {
  owner: string;
  repo: string;
}

export function githubRepo(url: URL): GitHubRepo | null {
  if (!GITHUB_HOST.test(hostnameOf(url))) return null;

  const match = REPO_PATH.exec(url.pathname);
  const owner = match?.[1];
  const repo = match?.[2];
  if (!owner || !repo || RESERVED_OWNERS.has(owner.toLowerCase())) return null;

  return { owner, repo };
}

export function githubApiUrl({ owner, repo }: GitHubRepo): string {
  return `https://api.github.com/repos/${owner}/${repo}`;
}

export function githubSocialImageUrl({ owner, repo }: GitHubRepo, revision: string): string {
  const key = encodeURIComponent(revision.trim()) || UNVERSIONED_CARD;
  return `${SOCIAL_CARD_ORIGIN}/${key}/${owner}/${repo}`;
}

export function previewFromGitHub(payload: unknown, url: URL): LinkPreview | null {
  const record = asRecord(payload);
  if (!record) return null;

  const fullName = asText(record.full_name).trim();
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) return null;

  const preview = emptyPreview(url.href, hostnameOf(url));
  preview.title = fullName;
  preview.description = asText(record.description).trim();
  preview.siteName = "GitHub";
  preview.image = githubSocialImageUrl({ owner, repo }, asText(record.pushed_at));
  preview.favicon = faviconUrl(url);
  preview.cat = "dev";

  return preview;
}
