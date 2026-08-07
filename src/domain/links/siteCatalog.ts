import type { SiteCategory } from "@/domain/model";

export interface SiteProfile {
  name: string;
  domain: string;
  cat: SiteCategory;
  color: string;
  glyph: string;
  titles: readonly string[];
  descriptions: readonly string[];
}

export const SITE_CATALOG: Readonly<Record<string, SiteProfile>> = {
  "youtube.com": {
    name: "YouTube",
    domain: "youtube.com",
    cat: "video",
    color: "#C4302B",
    glyph: "▶",
    titles: [
      "The Most Important Skill Nobody Taught You",
      "How This City Solved Its Traffic Problem",
      "I Built a Synth From Scratch",
      "A Brief History of the Color Blue",
    ],
    descriptions: [
      "A deep, beautifully shot video essay on the small decisions that compound over a lifetime.",
      "Urban planning explained through one street, three redesigns, and forty years of data.",
    ],
  },
  "vimeo.com": {
    name: "Vimeo",
    domain: "vimeo.com",
    cat: "video",
    color: "#1AB7EA",
    glyph: "▷",
    titles: ["Quiet Mornings — A Short Film", "The Making of a Title Sequence", "Slow Light"],
    descriptions: [
      "A meditative 9-minute short about routine, shot entirely on 16mm.",
      "Behind the scenes on a hand-animated opening title.",
    ],
  },
  "open.spotify.com": {
    name: "Spotify",
    domain: "open.spotify.com",
    cat: "music",
    color: "#1DB954",
    glyph: "♪",
    titles: [
      "Late Night Focus — Playlist",
      "Ambient Works for Deep Work",
      "Sunday Coffee",
      "The Album That Changed Everything",
    ],
    descriptions: [
      "3h 12m of low-key instrumental tracks for long stretches of focus.",
      "A hand-built playlist that gets better around the 40-minute mark.",
    ],
  },
  "music.apple.com": {
    name: "Apple Music",
    domain: "music.apple.com",
    cat: "music",
    color: "#FA2D48",
    glyph: "♫",
    titles: ["New Music Daily", "Piano Essentials", "Rainy Day Jazz"],
    descriptions: [
      "A curated mix updated every morning.",
      "Two hours of solo piano for slow afternoons.",
    ],
  },
  "nytimes.com": {
    name: "The New York Times",
    domain: "nytimes.com",
    cat: "article",
    color: "#1A1A1A",
    glyph: "T",
    titles: [
      "The Quiet Revolution in How We Read",
      "What the Numbers Don't Tell You",
      "A Year Inside the Archive",
    ],
    descriptions: [
      "A long, reported feature on the habits that shape attention in 2026.",
      "An investigation that took eighteen months and changed the reporter's mind.",
    ],
  },
  "newyorker.com": {
    name: "The New Yorker",
    domain: "newyorker.com",
    cat: "article",
    color: "#000000",
    glyph: "N",
    titles: [
      "The Art of Doing Nothing, Carefully",
      "On Rereading",
      "The Last of the Independent Bookshops",
    ],
    descriptions: [
      "A characteristically unhurried essay on attention, leisure, and guilt.",
      "10,000 words you'll be glad you set aside an evening for.",
    ],
  },
  "theatlantic.com": {
    name: "The Atlantic",
    domain: "theatlantic.com",
    cat: "article",
    color: "#C2261F",
    glyph: "A",
    titles: [
      "Why We Can't Stop Organizing Things",
      "The Case for Doing One Thing at a Time",
      "The Forgotten History of the Index Card",
    ],
    descriptions: [
      "An argument, well made, about the small systems we build to feel in control.",
      "A surprisingly moving history of how we filed the world before search.",
    ],
  },
  "stratechery.com": {
    name: "Stratechery",
    domain: "stratechery.com",
    cat: "article",
    color: "#4E8542",
    glyph: "S",
    titles: [
      "Aggregation and the Bookmark",
      "The Bundling of Everything",
      "Platforms, Notes, and Moats",
    ],
    descriptions: [
      "Ben Thompson on why organization is the next great consumer surface.",
      "A clear-eyed take on where attention and storage are converging.",
    ],
  },
  "substack.com": {
    name: "Substack",
    domain: "substack.com",
    cat: "article",
    color: "#FF6719",
    glyph: "S",
    titles: [
      "Things I Changed My Mind About",
      "A Field Guide to Saving Links",
      "The Weekly — Issue 142",
    ],
    descriptions: [
      "This week: taste, archives, and the joy of a well-kept list.",
      "A personal newsletter that reads like a letter from a thoughtful friend.",
    ],
  },
  "theverge.com": {
    name: "The Verge",
    domain: "theverge.com",
    cat: "article",
    color: "#5200FF",
    glyph: "V",
    titles: [
      "The Tools We Actually Keep",
      "Hands-On With the New Everything",
      "How Software Got Soft Again",
    ],
    descriptions: [
      "A reported look at the apps that survive past the first week.",
      "Why warmth and craft are quietly back in product design.",
    ],
  },
  "arstechnica.com": {
    name: "Ars Technica",
    domain: "arstechnica.com",
    cat: "dev",
    color: "#FF4E00",
    glyph: "Ar",
    titles: [
      "A Deep Dive Into How Browsers Render Text",
      "The File System That Refuses to Die",
      "Inside a Modern Search Index",
    ],
    descriptions: [
      "Long, technical, and genuinely fun. ~6,000 words with diagrams.",
      "More detail than you needed and exactly as much as you wanted.",
    ],
  },
  "wired.com": {
    name: "WIRED",
    domain: "wired.com",
    cat: "article",
    color: "#1A1A1A",
    glyph: "W",
    titles: [
      "The People Who Save Everything",
      "Inside the Personal Knowledge Movement",
      "The New Shape of Memory",
    ],
    descriptions: [
      "A feature on archivists, hoarders, and the rest of us in between.",
      "What happens when remembering becomes a design problem.",
    ],
  },
  "medium.com": {
    name: "Medium",
    domain: "medium.com",
    cat: "article",
    color: "#000000",
    glyph: "M",
    titles: [
      "What I Learned Saving 5,000 Links",
      "A Simpler Way to Organize Your Reading",
      "On Keeping a Commonplace Book",
    ],
    descriptions: [
      "A practical, honest write-up with a few ideas worth stealing.",
      "Seven minutes on building a system you'll actually maintain.",
    ],
  },
  "news.ycombinator.com": {
    name: "Hacker News",
    domain: "news.ycombinator.com",
    cat: "hn",
    color: "#FF6600",
    glyph: "Y",
    titles: [
      "Show HN: A pretty home for your bookmarks",
      "Ask HN: How do you organize saved links?",
      "The web is for saving, not just scrolling",
    ],
    descriptions: [
      "428 points · 211 comments — a lively thread on personal archives.",
      "Ask HN thread with a few genuinely good systems in the replies.",
    ],
  },
  "github.com": {
    name: "GitHub",
    domain: "github.com",
    cat: "dev",
    color: "#24292F",
    glyph: "{ }",
    titles: [
      "thoughtcabi / core",
      "a tiny, fast local-first link saver",
      "awesome-personal-knowledge",
      "rust-url-parser",
    ],
    descriptions: [
      "★ 2.4k — A local-first, offline-friendly bookmarking core in TypeScript.",
      "★ 8.1k — A curated list of tools for keeping what you read.",
    ],
  },
  "stackoverflow.com": {
    name: "Stack Overflow",
    domain: "stackoverflow.com",
    cat: "dev",
    color: "#F48024",
    glyph: "S",
    titles: [
      "How do I parse a URL into title + favicon?",
      "Best way to store a nested folder tree?",
      "Debounce a search input in React",
    ],
    descriptions: [
      "Accepted answer with 312 upvotes and a clean code sample.",
      "Three good approaches and a warning about the obvious one.",
    ],
  },
  "developer.mozilla.org": {
    name: "MDN Web Docs",
    domain: "developer.mozilla.org",
    cat: "dev",
    color: "#000000",
    glyph: "M",
    titles: ["URL.parse() — Web APIs", "CSS color-mix()", "Drag and Drop API", "structuredClone()"],
    descriptions: [
      "The reference page, with examples and a clear browser-support table.",
      "Everything you need and nothing you don't.",
    ],
  },
  "css-tricks.com": {
    name: "CSS-Tricks",
    domain: "css-tricks.com",
    cat: "dev",
    color: "#FF7A18",
    glyph: "C",
    titles: [
      "A Complete Guide to CSS Grid",
      "Masonry Without JavaScript (Almost)",
      "Color in 2026",
    ],
    descriptions: [
      "The guide everyone bookmarks and nobody finishes in one sitting.",
      "Practical, copy-pasteable, and refreshingly opinionated.",
    ],
  },
  "smashingmagazine.com": {
    name: "Smashing Magazine",
    domain: "smashingmagazine.com",
    cat: "dev",
    color: "#E85C41",
    glyph: "S",
    titles: [
      "Designing Calm Software",
      "The Anatomy of a Good Card",
      "Typographic Scale, Demystified",
    ],
    descriptions: [
      "A thorough piece on restraint, warmth, and craft in UI.",
      "With do/don't examples you'll want to keep.",
    ],
  },
  "arxiv.org": {
    name: "arXiv",
    domain: "arxiv.org",
    cat: "research",
    color: "#B31B1B",
    glyph: "𝜉",
    titles: [
      "Retrieval-Augmented Memory for Personal Archives",
      "On the Geometry of Saved Things",
      "Learning to Rank Bookmarks",
    ],
    descriptions: [
      "Preprint · 14 pages — a tidy method with a strong related-work section.",
      "Dense but readable; the introduction alone is worth the save.",
    ],
  },
  "en.wikipedia.org": {
    name: "Wikipedia",
    domain: "en.wikipedia.org",
    cat: "research",
    color: "#3366CC",
    glyph: "W",
    titles: ["Commonplace book", "Memex", "Zettelkasten", "Card catalog"],
    descriptions: [
      "A surprisingly deep entry with a great history section and citations.",
      "The origin story for half the note-taking apps you've tried.",
    ],
  },
  "figma.com": {
    name: "Figma",
    domain: "figma.com",
    cat: "design",
    color: "#A259FF",
    glyph: "F",
    titles: ["thoughtcabi.net — Design System", "Card explorations v3", "Warm UI Kit"],
    descriptions: [
      "A shared file with the full component set and color tokens.",
      "Auto-layout components, ready to copy.",
    ],
  },
};

export const CATEGORY_LABELS: Readonly<Record<SiteCategory, string>> = {
  video: "Video",
  music: "Music",
  article: "Article",
  hn: "Discussion",
  dev: "Code",
  research: "Paper",
  design: "Design",
  link: "Link",
  note: "",
};

export function findSiteProfile(hostname: string): { site: SiteProfile; host: string } | null {
  const direct = SITE_CATALOG[hostname];
  if (direct) return { site: direct, host: hostname };

  const baseDomain = hostname.split(".").slice(-2).join(".");
  const base = SITE_CATALOG[baseDomain];
  if (base) return { site: base, host: baseDomain };

  return null;
}
