import { base64FromText } from "@/lib/base64";
import type { Fetcher } from "@/sync/types";

export interface FakeWebdavOptions {
  base?: string;
  user?: string;
  password?: string;
}

interface Stored {
  text: string;
  etag: string;
}

function escaped(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function multistatus(body: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="utf-8"?><d:multistatus xmlns:d="DAV:">${body}</d:multistatus>`,
    { status: 207, headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}

function propstat(href: string, properties: string): string {
  return `<d:response><d:href>${escaped(href)}</d:href><d:propstat><d:prop>${properties}</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>`;
}

export class FakeWebdav {
  readonly base: string;
  readonly user: string;
  readonly password: string;

  unreachable = false;
  blocked = false;
  missing = false;
  refusesWrites = false;
  outOfRoom = false;
  hidesEtagHeader = false;

  private readonly stored = new Map<string, Stored>();
  private counter = 0;

  constructor(options: FakeWebdavOptions = {}) {
    this.base = options.base ?? "https://cloud.example.test/dav/dan/";
    this.user = options.user ?? "dan";
    this.password = options.password ?? "app-password";
  }

  put(name: string, text: string): void {
    this.counter += 1;
    this.stored.set(name, { text, etag: `"rev-${this.counter}"` });
  }

  textOf(name: string): string | null {
    return this.stored.get(name)?.text ?? null;
  }

  names(): string[] {
    return [...this.stored.keys()];
  }

  etagOf(name: string): string | null {
    return this.stored.get(name)?.etag ?? null;
  }

  readonly fetcher: Fetcher = (input, init = {}) => {
    if (this.unreachable) return Promise.reject(new TypeError("Failed to fetch"));

    const method = (init.method ?? "GET").toUpperCase();
    const headers = new Headers(init.headers);
    const collection = new URL(this.base).pathname;
    const path = new URL(input).pathname;

    if (method === "OPTIONS") {
      if (this.blocked) return Promise.reject(new TypeError("Failed to fetch"));
      return Promise.resolve(new Response(null, { status: 204, headers: { DAV: "1,2" } }));
    }

    if (
      headers.get("Authorization") !== `Basic ${base64FromText(`${this.user}:${this.password}`)}`
    ) {
      return Promise.resolve(new Response("Unauthorized", { status: 401 }));
    }

    if (this.missing || !path.startsWith(collection)) {
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    }

    const name = decodeURIComponent(path.slice(collection.length));
    if (method === "PROPFIND") return Promise.resolve(this.propfind(name, headers.get("Depth")));
    if (method === "GET") return Promise.resolve(this.read(name));
    if (method === "PUT") return Promise.resolve(this.write(name, headers, init.body));

    return Promise.resolve(new Response("Method Not Allowed", { status: 405 }));
  };

  private hrefOf(name: string): string {
    return `${new URL(this.base).pathname}${encodeURIComponent(name)}`;
  }

  private entry(name: string, held: Stored): string {
    return propstat(
      this.hrefOf(name),
      `<d:getetag>${escaped(held.etag)}</d:getetag><d:getlastmodified>Wed, 03 Sep 2026 10:00:00 GMT</d:getlastmodified>`,
    );
  }

  private propfind(name: string, depth: string | null): Response {
    if (name === "") {
      const self = propstat(
        new URL(this.base).pathname,
        "<d:resourcetype><d:collection/></d:resourcetype>",
      );
      if (depth === "0") return multistatus(self);
      const inside = [...this.stored].map(([held, value]) => this.entry(held, value)).join("");
      return multistatus(self + inside);
    }

    const held = this.stored.get(name);
    return held ? multistatus(this.entry(name, held)) : new Response("Not Found", { status: 404 });
  }

  private read(name: string): Response {
    const held = this.stored.get(name);
    if (!held) return new Response("Not Found", { status: 404 });
    return new Response(held.text, { status: 200, headers: this.etagHeader(held.etag) });
  }

  private write(name: string, headers: Headers, body: BodyInit | null | undefined): Response {
    if (this.refusesWrites) return new Response("Forbidden", { status: 403 });
    if (this.outOfRoom) return new Response("Insufficient Storage", { status: 507 });

    const held = this.stored.get(name);
    const ifMatch = headers.get("If-Match");
    const ifNone = headers.get("If-None-Match");

    if (ifNone === "*" && held) return new Response("Precondition Failed", { status: 412 });
    if (ifMatch !== null && ifMatch !== held?.etag) {
      return new Response("Precondition Failed", { status: 412 });
    }

    this.put(name, typeof body === "string" ? body : "");
    const written = this.stored.get(name);
    return new Response(null, {
      status: held ? 204 : 201,
      headers: this.etagHeader(written?.etag ?? ""),
    });
  }

  private etagHeader(etag: string): Record<string, string> {
    return this.hidesEtagHeader ? {} : { ETag: etag };
  }
}
