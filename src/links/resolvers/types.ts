import type { LinkPreview } from "@/domain/links/linkPreview";

export interface ResolverContext {
  fetchJson: (url: string) => Promise<unknown>;
  fetchViaRelay: (url: string) => Promise<string | null>;
  fetchJsonViaRelay: (url: string) => Promise<unknown>;
}

export interface LinkResolver {
  id: string;
  matches: (url: URL) => boolean;
  read: (url: URL, context: ResolverContext) => Promise<LinkPreview | null>;
}
