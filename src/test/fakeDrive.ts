import type { Fetcher } from "@/sync/types";

export interface FakeDriveOptions {
  account?: string;
  refreshToken?: string;
}

interface StoredFile {
  id: string;
  name: string;
  revision: number;
  text: string;
  modifiedTime: string;
}

const MODIFIED = "2026-09-01T12:00:00.000Z";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function quotedValue(query: string, field: string): string | null {
  const found = new RegExp(`${field} = '((?:[^'\\\\]|\\\\.)*)'`).exec(query);
  return found?.[1]?.replace(/\\(.)/g, "$1") ?? null;
}

function partsOf(body: string): string[] {
  return body
    .split(/--thoughtcabinet-boundary(?:--)?\r\n?/)
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

function bodyOf(part: string): string {
  const at = part.indexOf("\r\n\r\n");
  return at === -1 ? part : part.slice(at + 4);
}

export class FakeDrive {
  readonly files: StoredFile[] = [];
  readonly account: string;
  readonly refreshToken: string;

  accessToken = "access-1";
  unreachable = false;
  revoked = false;
  refuses = false;
  refreshes = 0;

  private next = 1;
  private rotations = 1;

  constructor(options: FakeDriveOptions = {}) {
    this.account = options.account ?? "danielr@example.com";
    this.refreshToken = options.refreshToken ?? "refresh-token";
  }

  put(name: string, text: string): StoredFile {
    const found = this.files.find((file) => file.name === name);
    if (found) {
      found.text = text;
      found.revision += 1;
      return found;
    }

    const created: StoredFile = {
      id: `f-${this.next++}`,
      name,
      revision: 1,
      text,
      modifiedTime: MODIFIED,
    };
    this.files.push(created);
    return created;
  }

  textOf(name: string): string | null {
    return this.files.find((file) => file.name === name)?.text ?? null;
  }

  names(): string[] {
    return this.files.map((file) => file.name);
  }

  expire(): void {
    this.rotations += 1;
    this.accessToken = `access-${this.rotations}`;
  }

  readonly fetcher: Fetcher = (input, init = {}) =>
    this.unreachable
      ? Promise.reject(new TypeError("Failed to fetch"))
      : Promise.resolve(this.answer(input, init));

  private answer(input: string, init: RequestInit): Response {
    const url = new URL(input, "https://thoughtcabi.net");
    if (url.pathname.startsWith("/auth/")) return this.broker(url.pathname, init);

    const headers = new Headers(init.headers);
    if (headers.get("Authorization") !== `Bearer ${this.accessToken}`) {
      return json({ error: { errors: [{ reason: "authError" }] } }, 401);
    }

    if (url.pathname === "/drive/v3/about") return json({ user: { emailAddress: this.account } });
    if (url.pathname === "/drive/v3/files") return this.list(url);
    if (url.pathname === "/upload/drive/v3/files") return this.create(init);

    const listed = /^\/drive\/v3\/files\/([^/]+)$/.exec(url.pathname);
    if (listed?.[1]) return this.readOne(listed[1], url);

    const uploaded = /^\/upload\/drive\/v3\/files\/([^/]+)$/.exec(url.pathname);
    if (uploaded?.[1]) return this.write(uploaded[1], init);

    return json({ error: { errors: [{ reason: "notFound" }] } }, 404);
  }

  private broker(pathname: string, init: RequestInit): Response {
    const body = typeof init.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {};

    if (pathname.endsWith("/exchange")) {
      if (this.refuses) return json({ error: "upstream_refused" }, 400);
      return json({ access_token: this.accessToken, expires_in: 3600, refresh_token: this.refreshToken });
    }

    if (pathname.endsWith("/refresh")) {
      if (this.revoked || body.refresh_token !== this.refreshToken) {
        return json({ error: "upstream_refused" }, 400);
      }
      this.refreshes += 1;
      return json({ access_token: this.accessToken, expires_in: 3600 });
    }

    this.revoked = true;
    return new Response(null, { status: 204 });
  }

  private view(file: StoredFile): Record<string, string> {
    return {
      id: file.id,
      name: file.name,
      headRevisionId: `r${file.revision}`,
      modifiedTime: file.modifiedTime,
    };
  }

  private list(url: URL): Response {
    const query = url.searchParams.get("q") ?? "";
    const wanted = quotedValue(query, "name");
    const found = wanted === null ? this.files : this.files.filter((file) => file.name === wanted);
    return json({ files: found.map((file) => this.view(file)) });
  }

  private readOne(id: string, url: URL): Response {
    const file = this.files.find((entry) => entry.id === id);
    if (!file) return json({ error: { errors: [{ reason: "notFound" }] } }, 404);
    if (url.searchParams.get("alt") === "media") return new Response(file.text, { status: 200 });
    return json(this.view(file));
  }

  private create(init: RequestInit): Response {
    const body = typeof init.body === "string" ? init.body : "";
    const [metadata, content] = partsOf(body).map((part) => bodyOf(part));
    if (metadata === undefined || content === undefined) return json({ error: {} }, 400);

    const { name } = JSON.parse(metadata) as { name: string };
    return json(this.view(this.put(name, content)));
  }

  private write(id: string, init: RequestInit): Response {
    const file = this.files.find((entry) => entry.id === id);
    if (!file) return json({ error: { errors: [{ reason: "notFound" }] } }, 404);

    file.text = typeof init.body === "string" ? init.body : "";
    file.revision += 1;
    return json(this.view(file));
  }
}
