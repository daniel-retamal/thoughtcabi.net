# thoughtcabi.net

A warm, local-first cabinet for websites you want to keep. Paste a link anywhere
and it becomes a card; organise cards into folders inside channels; label them
with color-anchored tags.

Everything lives in your browser. There is no account, no backend, and nothing
leaves the machine.

## Running it

Requires Node 18.18 or newer.

```sh
npm install
npm run dev          # http://localhost:5173
```

## Scripts

| Script                  | What it does                                     |
| ----------------------- | ------------------------------------------------ |
| `npm run dev`           | Vite dev server with hot reload                  |
| `npm run build`         | Type-check, then emit a static site into `dist/` |
| `npm run preview`       | Serve the built `dist/` locally                  |
| `npm test`              | Run the test suite once                          |
| `npm run test:watch`    | Re-run tests as you edit                         |
| `npm run test:coverage` | Test suite with a coverage report                |
| `npm run typecheck`     | `tsc --noEmit`                                   |
| `npm run lint`          | ESLint over `src/`                               |
| `npm run format`        | Prettier over the repo                           |
| `npm run verify`        | typecheck → lint → test → build                  |

## Deploying

`npm run build` produces a plain static bundle in `dist/` — HTML, one CSS file
and one JS file. Upload it to any static host (GitHub Pages, Netlify, Cloudflare
Pages, S3). No server-side runtime is involved.

Asset paths are relative, so the site also works from a subdirectory.

## How it is organised

```
src/
  domain/      Pure model and rules. No React, no DOM, no storage.
    links/       Link recognition and the site catalogue
    library/     The channel/folder/note tree: reads, immutable writes, search
    notes/       Building a card from a draft
    tags/        The color-anchored tag palette and its rules
    transfer/    Merging an imported cabinet into this one
    seed/        The starter library
  storage/     localStorage boundary: keys, safe IO, schema validation
  theme/       The color and card-surface axes and how they reach the DOM
  dnd/         Framework-agnostic pointer drag & drop controller
  state/       Reducer, navigation, view derivation, drag wiring
  hooks/       Small reusable React hooks
  components/  UI, one component per file
  styles/      Structure, then the theme layer that owns every color
  icons/       The icon vocabulary and its Lucide bindings
```

Dependencies point one way: `components → state → domain`. `domain/` imports
nothing from React, the DOM, or storage, which is why it is the part covered
most heavily by tests.

`DESIGN.md` records _why_ the product is shaped this way — read it before
changing the card, the sidebar, or the tag model. `CLAUDE.md` is the working
guide for changing the code.

## Keyboard and gestures

| Action                 | How                                              |
| ---------------------- | ------------------------------------------------ |
| Save a pasted link     | `Ctrl`/`Cmd` + `V` anywhere outside a text field |
| Focus search           | `Ctrl`/`Cmd` + `K`                               |
| Submit the card editor | `Ctrl`/`Cmd` + `Enter`                           |
| Close any dialog       | `Esc`, or click the backdrop                     |
| Move a card or folder  | Drag it — the nearest gap between siblings wins  |
| Move into a folder     | Drop onto the folder tile                        |
| Open while dragging    | Hover a breadcrumb or channel for a moment       |
| Assign a tag           | Drag the tag from the sidebar onto a card        |
| Import a cabinet file  | Drop it on the zone in **Export & import**       |
| Cancel a drag          | `Esc`, right-click, or drop on nothing           |

## Stored state

Two `localStorage` keys, split by who would own the data if this ever grew a
server:

- `thoughtcabinet.cabinet.v1` — your stuff: the channel/folder/card tree and the tag
  list, written together so a tag can never outlive the cards carrying it
- `thoughtcabinet.prefs.v1` — this browser's preferences: `grid` or `list`, color,
  and card surface

Clearing them restores the seed library. Stored data is validated on load, so a
corrupt or hand-edited value degrades to a sensible default instead of breaking
the app — and the bytes that failed to parse are kept in
`thoughtcabinet.cabinet.corrupt.v1` rather than being overwritten, so nothing is lost
without a copy.

Libraries saved before this layout are migrated automatically the first time you
open the app, and the old keys are removed only once the new one has been written.

Open the cabinet in two tabs and they stay in step: whichever tab writes last, the
other one follows rather than silently overwriting it. A link still loading in one
tab survives a change made in the other.

If the browser refuses a write — storage full, or blocked entirely in a private
window — the app says so instead of pretending the change was saved.

## Taking your cabinet with you

The archive button in the header opens **Export & import**.

**Export** writes one plain JSON file — `thoughtcabinet-2026-08-08.json` — holding
every channel, folder, card and tag. Nothing else: your color and card surface
belong to this browser, not to the cabinet, so they stay behind. The file is
readable, diffable, and yours; put it in Dropbox, a git repo, or an email to
yourself.

**Import** takes that file back, by drop or by picker, and tells you what is in
it before it touches anything:

- **Merge** keeps everything you have. A channel whose name you already use
  pours its cards into yours; anything else arrives as a new channel. Imported
  cards get fresh ids, so importing the same file twice never collides — it
  duplicates, which is at least visible and undoable.
- **Replace** swaps your cabinet for the one in the file.

Tags come across too. One that shares a name with a tag you already have keeps
yours; one whose color is taken gets the next free one; and if the palette is
full (§ eight colors, one name each) the tag is dropped and its cards arrive
untagged rather than carrying a label the sidebar cannot show.

A file that is not JSON, or has no channels in it, is explained rather than
half-imported.

## The link reader

Paste a URL anywhere and a card appears immediately, then fills itself in with the
page's real title, description, thumbnail and favicon — the way a link behaves when
you paste it into Discord or WhatsApp.

**Nothing is invented.** If a page has no description, the card has no description.
If it has no image, the card has no image. The only thing derived rather than read
is the title, which falls back to the URL's own slug when the page offers none.

A page's image is also checked before it is accepted: something too small, too
lopsided, or that does not load at all is a logo or a tracking pixel rather than a
preview, and is dropped rather than shown.

When there is no usable picture, the card shows the site's own icon instead —
small and centred on a plain field, never blown up to fill the frame. Rows do the
same in their leading column, and when even the icon is missing they fall back to
a letter taken from the domain, so the column is never empty. That letter belongs
to rows only: at card size it stops reading as a mark and starts reading as a
picture that failed. A card with nothing at all to show simply starts at its title.

Some sites are read directly, with no intermediary at all: YouTube, Vimeo,
Spotify and SoundCloud through oEmbed, plus Wikipedia, GitHub and Bluesky through
their public APIs. Everything else is ordinary HTML, and here the browser gets in
the way — a web page cannot read a cross-origin response unless that origin allows
it, and almost none do. Discord solves this with a server-side crawler; WhatsApp
solves it on your phone, where the rule does not apply.

So generic pages are fetched through a relay: a stateless worker that hands over
the bytes and nothing more. All the parsing happens here, in the browser, in
`src/domain/links/`.

```sh
cd worker && npx wrangler deploy
echo 'VITE_LINK_RELAY=https://<your-worker>.workers.dev/?url=' > .env.local
```

Cloudflare's free tier covers 100,000 relayed links a day, so this costs nothing to
run. See `worker/README.md`. Without a relay configured the app falls back to a
public proxy, and if that is unreachable too, a pasted link still becomes a card
with its URL, domain and slug title.

Adding support for another site means one pure file under `src/domain/links/sites/`,
one resolver under `src/links/resolvers/`, and one line in the resolver registry.
