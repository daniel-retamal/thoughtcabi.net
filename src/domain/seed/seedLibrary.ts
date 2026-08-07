import { createId } from "@/domain/ids";
import { previewFromUrl } from "@/domain/links/fromUrl";
import { previewToNote } from "@/domain/links/linkPreview";
import type {
  Channel,
  Folder,
  Library,
  LibraryNode,
  Note,
  SiteCategory,
  Tag,
} from "@/domain/model";
import { TAG_PALETTE } from "@/domain/tags/palette";
import type { IconName } from "@/icons/names";

const DAY_IN_MS = 86_400_000;

interface SeedEntry {
  url: string;
  title: string;
  siteName: string;
  cat: SiteCategory;
  daysAgo: number;
  description?: string;
  image?: string;
}

function seedNote(entry: SeedEntry): Note {
  const url = new URL(entry.url);

  return previewToNote(
    {
      ...previewFromUrl(url),
      title: entry.title,
      description: entry.description ?? "",
      siteName: entry.siteName,
      image: entry.image ?? "",
      cat: entry.cat,
    },
    { id: createId("n"), addedAt: Date.now() - entry.daysAgo * DAY_IN_MS },
  );
}

function seedFolder(name: string, entries: SeedEntry[]): Folder {
  return { id: createId("f"), type: "folder", name, children: entries.map(seedNote) };
}

function seedChannel(name: string, icon: IconName, children: LibraryNode[]): Channel {
  return { id: createId("ch"), name, icon, children };
}

const WIKIMEDIA = "https://upload.wikimedia.org/wikipedia/commons/thumb";
const YOUTUBE_THUMB = "https://i.ytimg.com/vi";

export function createSeedLibrary(): Library {
  return [
    seedChannel("Reading", "book-open", [
      seedFolder("Essays", [
        {
          url: "https://www.paulgraham.com/greatwork.html",
          title: "How to Do Great Work",
          siteName: "Paul Graham",
          cat: "article",
          daysAgo: 2,
        },
        {
          url: "https://www.paulgraham.com/makersschedule.html",
          title: "Maker's Schedule, Manager's Schedule",
          siteName: "Paul Graham",
          cat: "article",
          daysAgo: 9,
        },
      ]),
      seedFolder("Ideas worth keeping", [
        {
          url: "https://en.wikipedia.org/wiki/Commonplace_book",
          title: "Commonplace book",
          description:
            "Commonplace books are personal notebooks used to compile any information the owner finds interesting or useful.",
          siteName: "Wikipedia",
          cat: "research",
          image: `${WIKIMEDIA}/5/50/Commonplace_book_mid_17th_century.jpg/330px-Commonplace_book_mid_17th_century.jpg`,
          daysAgo: 4,
        },
        {
          url: "https://en.wikipedia.org/wiki/Memex",
          title: "Memex",
          description:
            'A memex is a hypothetical electromechanical device for interacting with microform documents, described in Vannevar Bush\'s 1945 article "As We May Think".',
          siteName: "Wikipedia",
          cat: "research",
          image: `${WIKIMEDIA}/f/fb/Memex_at_Das_Netz_exhibition_of_Deutsches_Technikmuseum.jpg/330px-Memex_at_Das_Netz_exhibition_of_Deutsches_Technikmuseum.jpg`,
          daysAgo: 6,
        },
        {
          url: "https://en.wikipedia.org/wiki/Hypertext",
          title: "Hypertext",
          description:
            "Hypertext is text displayed on a computer display or other electronic devices with references to other text that the reader can immediately access.",
          siteName: "Wikipedia",
          cat: "research",
          image: `${WIKIMEDIA}/1/19/Hyperlinks_scheme.svg/330px-Hyperlinks_scheme.svg.png`,
          daysAgo: 13,
        },
      ]),
    ]),

    seedChannel("Watch & Listen", "play", [
      seedFolder("Talks", [
        {
          url: "https://www.youtube.com/watch?v=6avJHaC3C2U",
          title: "The Art of Code - Dylan Beattie",
          description: "NDC Conferences",
          siteName: "YouTube",
          cat: "video",
          image: `${YOUTUBE_THUMB}/6avJHaC3C2U/mqdefault.jpg`,
          daysAgo: 1,
        },
        {
          url: "https://www.youtube.com/watch?v=8pTEmbeENF4",
          title: "Bret Victor   The Future of Programming",
          description: "Joey Reid",
          siteName: "YouTube",
          cat: "video",
          image: `${YOUTUBE_THUMB}/8pTEmbeENF4/maxresdefault.jpg`,
          daysAgo: 5,
        },
        {
          url: "https://www.youtube.com/watch?v=kb-m2fasdDY",
          title:
            "What I Wish I Had Known Before Scaling Uber to 1000 Services • Matt Ranney • GOTO 2016",
          description: "GOTO Conferences",
          siteName: "YouTube",
          cat: "video",
          image: `${YOUTUBE_THUMB}/kb-m2fasdDY/maxresdefault.jpg`,
          daysAgo: 11,
        },
      ]),
    ]),

    seedChannel("Research", "flask-conical", [
      seedFolder("Method", [
        {
          url: "https://en.wikipedia.org/wiki/Zettelkasten",
          title: "Zettelkasten",
          description:
            "A Zettelkasten or card file consists of small items of information stored on paper slips or cards, that may be linked to each other through subject headings or other metadata.",
          siteName: "Wikipedia",
          cat: "research",
          image: `${WIKIMEDIA}/3/33/Zettelkasten_%28514941699%29.jpg/330px-Zettelkasten_%28514941699%29.jpg`,
          daysAgo: 3,
        },
      ]),
    ]),

    seedChannel("Dev", "terminal", [
      seedFolder("Tools", [
        {
          url: "https://github.com/vitejs/vite",
          title: "vitejs/vite",
          description: "Next generation frontend tooling. It's fast!",
          siteName: "GitHub",
          cat: "dev",
          image: "https://avatars.githubusercontent.com/u/65625612?v=4",
          daysAgo: 0,
        },
        {
          url: "https://github.com/microsoft/TypeScript",
          title: "microsoft/TypeScript",
          description:
            "TypeScript is a superset of JavaScript that compiles to clean JavaScript output.",
          siteName: "GitHub",
          cat: "dev",
          image: "https://avatars.githubusercontent.com/u/6154722?v=4",
          daysAgo: 7,
        },
      ]),
    ]),
  ];
}

export function createSeedTags(): Tag[] {
  return [
    { name: "Inspiration", color: TAG_PALETTE[0] },
    { name: "To read", color: TAG_PALETTE[2] },
    { name: "Reference", color: TAG_PALETTE[4] },
    { name: "Favorites", color: TAG_PALETTE[5] },
  ];
}
