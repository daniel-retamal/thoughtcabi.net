export const DEFAULT_REPO_PATH = "thoughtcabinet.json";

export interface RepoTarget {
  owner: string;
  repo: string;
  path: string;
}

const OWNER = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const REPO = /^[\w.-]{1,100}$/;

function trimmed(value: string | undefined): string {
  return (value ?? "").trim();
}

function fromUrl(value: string): string[] {
  const withoutScheme = value.replace(/^[a-z+]+:\/\//i, "").replace(/^git@/i, "");
  const withoutHost = withoutScheme.replace(/^[^/:]*github[^/:]*[/:]/i, "");
  return withoutHost.split("/").filter((part) => part.length > 0);
}

function repoParts(owner: string, repo: string): string[] {
  const joined = repo ? `${owner}/${repo}` : owner;
  const parts = fromUrl(joined);
  return parts.map((part, at) => (at === parts.length - 1 ? part.replace(/\.git$/i, "") : part));
}

export function normalizeRepoPath(path: string): string {
  const cleaned = trimmed(path).replace(/^\/+|\/+$/g, "");
  if (!cleaned || cleaned.split("/").some((part) => part === "." || part === "..")) {
    return DEFAULT_REPO_PATH;
  }
  return cleaned.endsWith(".json") ? cleaned : `${cleaned}/${DEFAULT_REPO_PATH}`;
}

export function repoTargetFrom(fields: Readonly<Record<string, string>>): RepoTarget | null {
  const parts = repoParts(trimmed(fields.owner), trimmed(fields.repo));
  const [owner, repo] = parts;
  if (!owner || !repo || parts.length > 2) return null;
  if (!OWNER.test(owner) || !REPO.test(repo)) return null;

  return { owner, repo, path: normalizeRepoPath(fields.path ?? "") };
}

export function repoLabel(target: RepoTarget): string {
  return `${target.owner}/${target.repo}`;
}

export function directoryOf(path: string): string {
  const at = path.lastIndexOf("/");
  return at < 0 ? "" : path.slice(0, at);
}

export function fileNameOf(path: string): string {
  const at = path.lastIndexOf("/");
  return at < 0 ? path : path.slice(at + 1);
}

export function pathBeside(path: string, name: string): string {
  const directory = directoryOf(path);
  return directory ? `${directory}/${name}` : name;
}
