# VirtualList browser tests

Run `pnpm --filter @foldkit/ui test:e2e:virtual-list` from the repository root.
The fixture uses the current Foldkit and UI source through the Foldkit Vite plugin.
Its application is private test infrastructure.

Chromium runs at desktop and narrow viewport sizes. WebKit and Firefox join the
matrix when their Playwright executables are installed. Set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE`, `PLAYWRIGHT_WEBKIT_EXECUTABLE`, or
`PLAYWRIGHT_FIREFOX_EXECUTABLE` to use an existing browser executable.

The fixture starts its own server on port 4197. Set
`FOLDKIT_VIRTUAL_LIST_E2E_PORT` to select another port. An occupied port fails the
run; teardown terminates the server process group.

Geometry tests cover each scroll owner and supported row layout. They exercise
partially visible content, logical scroll targets, ordinary surrounding content,
native table structure, measured row resizing, and Mount cleanup. A complete
traversal of every row runs once per layout on desktop Chromium; other projects
exercise the same geometry and target cases with a bounded rendered slice.
