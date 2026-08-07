import { createId } from "@/domain/ids";
import { recognizeLink } from "@/domain/links/recognizeLink";
import type { Channel, Folder, Library, LibraryNode, Note, Tag } from "@/domain/model";
import { TAG_PALETTE } from "@/domain/tags/palette";
import type { IconName } from "@/icons/names";

const DAY_IN_MS = 86_400_000;

function seedNote(url: string, daysAgo: number): Note {
  const recognized = recognizeLink(url);
  if (!recognized) throw new Error(`Seed link is not recognizable: ${url}`);

  return {
    ...recognized,
    id: createId("n"),
    type: "note",
    tag: "",
    addedAt: Date.now() - daysAgo * DAY_IN_MS,
  };
}

function seedFolder(name: string, children: LibraryNode[]): Folder {
  return { id: createId("f"), type: "folder", name, children };
}

function seedChannel(name: string, icon: IconName, children: LibraryNode[]): Channel {
  return { id: createId("ch"), name, icon, children };
}

export function createSeedLibrary(): Library {
  return [
    seedChannel("Reading", "book-open", [
      seedFolder("Essays", [
        seedNote("https://www.newyorker.com/culture/the-art-of-doing-nothing", 2),
        seedNote("https://www.theatlantic.com/ideas/the-forgotten-history-of-the-index-card", 5),
        seedNote("https://www.theatlantic.com/culture/why-we-cant-stop-organizing-things", 9),
        seedNote("https://newyorker.com/books/on-rereading", 14),
      ]),
      seedFolder("Tech & Culture", [
        seedNote("https://www.theverge.com/software-got-soft-again", 1),
        seedNote("https://www.wired.com/story/the-people-who-save-everything", 3),
        seedNote("https://stratechery.com/2026/aggregation-and-the-bookmark", 4),
        seedFolder("Newsletters", [
          seedNote("https://everything.substack.com/p/things-i-changed-my-mind-about", 6),
          seedNote("https://thingsworthsaving.substack.com/p/the-weekly-142", 8),
        ]),
      ]),
      seedFolder("Saved for later", [
        seedNote("https://www.nytimes.com/2026/interactive/the-quiet-revolution-in-how-we-read", 0),
        seedNote("https://medium.com/@reader/what-i-learned-saving-5000-links", 7),
        seedNote("https://www.nytimes.com/2026/magazine/a-year-inside-the-archive", 12),
      ]),
    ]),
    seedChannel("Watch & Listen", "play", [
      seedFolder("Talks & Essays", [
        seedNote("https://www.youtube.com/watch?v=a1B2c3D4e5F", 1),
        seedNote("https://www.youtube.com/watch?v=traffic-problem-solved", 2),
        seedNote("https://vimeo.com/the-making-of-a-title-sequence", 6),
      ]),
      seedFolder("Music", [
        seedNote("https://open.spotify.com/playlist/late-night-focus", 0),
        seedNote("https://open.spotify.com/album/the-album-that-changed-everything", 3),
        seedNote("https://music.apple.com/playlist/rainy-day-jazz", 5),
      ]),
      seedFolder("Short films", [
        seedNote("https://vimeo.com/quiet-mornings-a-short-film", 4),
        seedNote("https://vimeo.com/slow-light", 11),
      ]),
    ]),
    seedChannel("Research", "flask-conical", [
      seedFolder("AI & memory", [
        seedNote("https://arxiv.org/abs/2604.01821", 1),
        seedNote("https://arxiv.org/abs/2603.11902", 4),
        seedNote("https://arxiv.org/abs/2602.00455", 10),
      ]),
      seedFolder("References", [
        seedNote("https://en.wikipedia.org/wiki/Commonplace_book", 2),
        seedNote("https://en.wikipedia.org/wiki/Memex", 2),
        seedNote("https://en.wikipedia.org/wiki/Zettelkasten", 8),
      ]),
      seedFolder("Design", [
        seedNote("https://www.figma.com/file/thoughtcabi-design-system", 0),
        seedNote("https://www.smashingmagazine.com/2026/designing-calm-software", 3),
      ]),
    ]),
    seedChannel("Dev / HN", "terminal", [
      seedFolder("Tools", [
        seedNote("https://github.com/thoughtcabi/core", 0),
        seedNote("https://github.com/awesome/awesome-personal-knowledge", 2),
        seedNote("https://github.com/rust-lang/rust-url-parser", 9),
      ]),
      seedFolder("Reading list", [
        seedNote("https://news.ycombinator.com/item?id=40123456", 0),
        seedNote("https://news.ycombinator.com/item?id=ask-how-organize", 1),
        seedNote("https://css-tricks.com/a-complete-guide-to-css-grid", 3),
        seedNote("https://developer.mozilla.org/en-US/docs/Web/API/URL/parse", 5),
      ]),
      seedFolder("Snippets", [
        seedNote("https://stackoverflow.com/questions/how-to-parse-url-into-title-favicon", 4),
        seedNote("https://developer.mozilla.org/en-US/docs/Web/API/structuredClone", 7),
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
