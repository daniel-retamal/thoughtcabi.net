# thoughtcabi.net

A warm, local-first cabinet for websites you want to keep. Paste a link anywhere
and it becomes a card; organise cards into folders inside channels; label them
with colour-anchored tags.

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
    tags/        The colour-anchored tag palette and its rules
    seed/        The starter library
  storage/     localStorage boundary: keys, safe IO, schema validation
  theme/       The Azul appearance axes and how they reach the DOM
  dnd/         Framework-agnostic pointer drag & drop controller
  state/       Reducer, navigation, view derivation, drag wiring
  hooks/       Small reusable React hooks
  components/  UI, one component per file
  styles/      Structure, then the theme layer that owns every colour
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
| Cancel a drag          | `Esc`, right-click, or drop on nothing           |

## Stored state

Four `localStorage` keys, all namespaced `thoughtcabi.*`:

- `thoughtcabi.data.v1` — the channel/folder/card tree
- `thoughtcabi.tags.v1` — the tag list (`{ name, color }`)
- `thoughtcabi.view.v1` — `grid` or `list`
- `thoughtcabi.azul.v1` — palette and card surface

Clearing them restores the seed library. Stored data is validated on load, so a
corrupt or hand-edited value degrades to a sensible default instead of breaking
the app.

## Link recognition

Pasting a URL produces a card with a title, description, source label and
generated cover art. This is derived locally from a curated catalogue of sites
in `src/domain/links/siteCatalog.ts` — nothing is fetched. Unknown domains still
get a believable card, coloured deterministically from the hostname.

Fetching real page metadata would need a network round trip and is deliberately
left out of the local-first build.
