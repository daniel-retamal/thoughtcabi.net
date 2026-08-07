export interface IconLink {
  rel: string;
  href: string;
  sizes: string;
}

const APPLE_TOUCH_RANK = 2;
const PLAIN_ICON_RANK = 1;
const MAX_TRACKED_EDGE = 999;

function relTokens(rel: string): string[] {
  return rel.toLowerCase().split(/\s+/).filter(Boolean);
}

export function largestDeclaredEdge(sizes: string): number {
  let largest = 0;
  for (const entry of sizes.toLowerCase().split(/\s+/)) {
    const edge = Number.parseInt(entry.split("x")[0] ?? "", 10);
    if (Number.isFinite(edge)) largest = Math.max(largest, edge);
  }
  return largest;
}

function rankOf(rel: string): number {
  const tokens = relTokens(rel);
  if (tokens.some((token) => token.startsWith("apple-touch-icon"))) return APPLE_TOUCH_RANK;
  return tokens.includes("icon") ? PLAIN_ICON_RANK : 0;
}

function scoreOf(link: IconLink): number {
  const rank = rankOf(link.rel);
  if (rank === 0) return 0;
  return (
    rank * (MAX_TRACKED_EDGE + 1) + Math.min(largestDeclaredEdge(link.sizes), MAX_TRACKED_EDGE)
  );
}

export function bestIconHref(links: readonly IconLink[]): string {
  let best = "";
  let bestScore = 0;

  for (const link of links) {
    const href = link.href.trim();
    if (!href) continue;
    const score = scoreOf(link);
    if (score > bestScore) {
      bestScore = score;
      best = href;
    }
  }

  return best;
}
