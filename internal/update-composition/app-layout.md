# Application child ownership and UI imports

## Scope

Owned application Blocks now live below the owning Block’s `blocks/` directory.
Explicit barrels expose child namespaces and passive contracts. Child feature
barrels keep construction Layers and intended public accessors; test-only
Commands, Bindings and private Schemas remain structural imports.

| Example         | Relocated children                                                       |
| --------------- | ------------------------------------------------------------------------ |
| Workspace       | Eight application children; CommentComposer belongs to IssueDetail       |
| Auth            | LoggedIn, LoggedOut; Login belongs to LoggedOut                          |
| Job application | Six steps; each repeated entry belongs to its owning step                |
| Routing         | People and its feature tests                                             |
| Shopping cart   | Products; pure Cart/Checkout helpers stay under `page/`                  |
| UI showcase     | The application-owned Ui Block; library UI children stay library imports |
| Counters        | Counter                                                                  |
| Personal blog   | Counter; island attributes stay in the island helper module              |

The exact mapping is [app-layout-moves.json](./app-layout-moves.json).
Parents use explicit `blocks` barrels. Same-owner implementation imports may
remain direct to avoid cycles. No UI library definition was copied into an app.
The convention is recorded in `AGENTS.md` and the scaffold `FOLDKIT.md`.

UI namespace/root imports in 192 files (211 declarations across 29 examples)
were replaced with named UI subpath imports. Colliding names use their component,
including `view as buttonView`, `layer as ListboxLayer`, and
`Multi as MultiListbox`. The public UI API is unchanged.

No unused exported Binding inventory arrays remained to inline. Individual
Binding declarations used by construction, views and OutMessage policy remain.

## Verification

Node 22.22.3 ran the applications’ existing commands directly:

- All 35 `tsc --noEmit` checks passed.
- All 34 `vitest run` scripts passed: 689 tests in 108 runtime files.
- All eight relocated applications passed production Vite builds with their own
  config; output was task-local to avoid changing Website generated assets.
- Application Oxlint and diff whitespace checks passed.

The 109 existing active test files were retained by this move. Pixel Art’s
benchmark file remains excluded by its existing normal-test configuration; no
benchmark loops were edited or run. The separate earlier removal of Workspace’s
framework-type fixture is outside this mechanical move.

A full test-body token comparison against HEAD, ignoring imports and normalizing
UI references to their owning module/export, preserved 108 of 110 original files
exactly. The two explained differences are that earlier removed type fixture and
Todo’s separately authored `Command.expectNone()` assertion. No assertion body
was edited for this move.

A second audit compared every non-module string literal and interpolated template
part across all 978 tracked example TypeScript files after path mapping. All
11,913 literals in 976 files match. The only exceptions are the same removed
fixture and Todo’s separately authored `SucceededSaveTodos` selector. Data such
as `'.'`, `'..'`, URLs, Message tags and payload strings was not rewritten.

The Map test initially could not collect because the new checkout’s shared
`node_modules/.pnpm` and Vite cache resolved its worker into the older checkout.
A private copy of the identical MapLibre package and a private empty app Vite
cache fixed test isolation. No source, test assertion, Vite allowlist or old
checkout dependency was changed. All 20 Map tests then passed.

Compact results are in [app-layout-checks.json](./app-layout-checks.json).
Website/TypingGame relocation and Website source-link updates are owned by the
separate consumer migration and are not counted here.
