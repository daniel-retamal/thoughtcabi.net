# Contributing

Issues and pull requests are welcome.

## Issues

Open one for anything that looks wrong, or for anything you wish the app did differently. What helps: what you did, what you saw, and which browser you saw it in. A screenshot usually says it faster than a paragraph, and if a link is involved, include it.

## Pull requests

```sh
npm install
npm run verify
```

`verify` runs the typecheck, the linter, the tests and the build, and it is the same command CI runs.

A few conventions the codebase already follows: no code comments, named exports, one component per file, and no colour literals outside `src/styles/theme/`. Tests reach the UI through accessible queries rather than class names. Commit messages are lowercase and present tense.
