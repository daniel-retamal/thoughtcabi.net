import { directoryOf, fileNameOf } from "@/domain/sync/github";
import { gitBlobSha } from "@/sync/providers/gitSha";
import type { Fetcher } from "@/sync/types";

export interface FakeGithubOptions {
  owner?: string;
  repo?: string;
  token?: string;
  private?: boolean;
  push?: boolean;
}

interface Written {
  message: string;
  content: string;
  sha?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function decode(content: string): string {
  const binary = atob(content.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, (letter) => letter.charCodeAt(0)));
}

export class FakeGithub {
  readonly files = new Map<string, string>();
  readonly messages: string[] = [];
  readonly owner: string;
  readonly repo: string;
  readonly token: string;

  private: boolean;
  push: boolean;
  unreachable = false;
  repoGone = false;

  constructor(options: FakeGithubOptions = {}) {
    this.owner = options.owner ?? "danielr";
    this.repo = options.repo ?? "cabinet";
    this.token = options.token ?? "github_pat_valid";
    this.private = options.private ?? true;
    this.push = options.push ?? true;
  }

  put(path: string, text: string): void {
    this.files.set(path, text);
  }

  textOf(path: string): string | null {
    return this.files.get(path) ?? null;
  }

  names(directory = ""): string[] {
    return [...this.files.keys()]
      .filter((path) => directoryOf(path) === directory)
      .map((path) => fileNameOf(path));
  }

  readonly fetcher: Fetcher = async (input, init = {}) => {
    if (this.unreachable) throw new TypeError("Failed to fetch");

    const url = new URL(input);
    const headers = new Headers(init.headers);
    if (headers.get("Authorization") !== `Bearer ${this.token}`) {
      return json({ message: "Bad credentials" }, 401);
    }

    const repoPath = `/repos/${this.owner}/${this.repo}`;
    if (this.repoGone || !url.pathname.startsWith(repoPath)) {
      return json({ message: "Not Found" }, 404);
    }

    const rest = url.pathname.slice(repoPath.length);
    if (rest === "") return json({ private: this.private, permissions: { push: this.push } });
    if (!rest.startsWith("/contents/")) return json({ message: "Not Found" }, 404);

    const path = decodeURIComponent(rest.slice("/contents/".length));
    if (init.method !== "PUT") return await this.read(path, headers.get("Accept") ?? "");

    const body = typeof init.body === "string" ? (JSON.parse(init.body) as Written) : null;
    return body ? await this.write(path, body) : json({ message: "Bad request" }, 400);
  };

  private async read(path: string, accept: string): Promise<Response> {
    const text = this.files.get(path);

    if (text !== undefined) {
      if (accept.includes("raw")) return new Response(text, { status: 200 });
      return json({ type: "file", name: fileNameOf(path), sha: await gitBlobSha(text) });
    }

    const inside = [...this.files.keys()].filter((entry) => directoryOf(entry) === path);
    if (path !== "" && inside.length === 0) return json({ message: "Not Found" }, 404);

    return json({
      type: "dir",
      entries: this.names(path).map((name) => ({ name, type: "file" })),
    });
  }

  private async write(path: string, body: Written): Promise<Response> {
    if (!this.push)
      return json({ message: "Resource not accessible by personal access token" }, 403);

    const current = this.files.get(path);
    const sha = current === undefined ? null : await gitBlobSha(current);

    if (body.sha === undefined && current !== undefined) return json({ message: "Invalid" }, 422);
    if (body.sha !== undefined && body.sha !== sha) return json({ message: "Conflict" }, 409);

    const text = decode(body.content);
    this.files.set(path, text);
    this.messages.push(body.message);

    return json({ content: { name: fileNameOf(path), sha: await gitBlobSha(text) } }, 200);
  }
}
