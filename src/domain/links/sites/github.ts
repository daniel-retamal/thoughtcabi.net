import { asRecord, asText, at } from "@/lib/json";
import { emptyPreview, type LinkPreview } from "../linkPreview";
import { faviconUrl, hostnameOf } from "../url";

const GITHUB_HOST = /^github\.com$/;
const RESERVED_OWNERS = new Set([
  "features",
  "topics",
  "collections",
  "sponsors",
  "settings",
  "marketplace",
  "explore",
  "orgs",
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

  const [owner, repo] = url.pathname.split("/").filter(Boolean);
  if (!owner || !repo || RESERVED_OWNERS.has(owner)) return null;

  return { owner, repo: repo.replace(/\.git$/, "") };
}

export function githubApiUrl({ owner, repo }: GitHubRepo): string {
  return `https://api.github.com/repos/${owner}/${repo}`;
}

export function previewFromGitHub(payload: unknown, url: URL): LinkPreview | null {
  const record = asRecord(payload);
  if (!record) return null;

  const fullName = asText(record.full_name).trim();
  if (!fullName) return null;

  const preview = emptyPreview(url.href, hostnameOf(url));
  preview.title = fullName;
  preview.description = asText(record.description).trim();
  preview.siteName = "GitHub";
  preview.image = asText(at(record, "owner", "avatar_url")).trim();
  preview.favicon = faviconUrl(url);
  preview.cat = "dev";

  return preview;
}
