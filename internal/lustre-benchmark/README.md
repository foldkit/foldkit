# @foldkit/lustre-benchmark

A Foldkit TodoMVC implementation built to run inside the
[lustre-labs/benchmark](https://github.com/lustre-labs/benchmark) harness for
head-to-head performance comparison against other implementations (Alpine, Elm,
Gren, Lustre, React, Solid, Svelte, Vue).

The harness drives every implementation through the same runbook (add 100
todos, toggle each, destroy the first 100 times) using CSS selectors against
standard TodoMVC markup.

## Two slots: naive and optimised

The package builds two implementation slots, mirroring the harness convention
used by Lustre, Elm, React, Gren, and Svelte. The `view` differs; the model and
update are shared.

- **`foldkit-<version>`**: naive view from `src/main.ts`. No memoization. Every
  Message rebuilds the entire VNode tree.
- **`foldkit-<version>-optimised`**: optimised view from `src/main.optimised.ts`.
  Uses `createLazy` slots for the header, the footer, the footer's filters
  list, and the toggle-all controls, and `createKeyedLazy` per todo item (a
  todo's VNode is reused when its `Todo` is referentially unchanged and it is
  not being edited). The differ short-circuits the subtree diff when a lazy
  slot returns its cached VNode.

## Relationship to `examples/todo`

The app is written for speed within the harness contract: the same TodoMVC
workload and required selectors and structure, with the implementation behind
them free to be as fast as Foldkit allows. Benchmarks measure the framework's
floor, so hot paths deliberately drop convenience idioms the way every other
slot does (Elm and Gleam compile their pattern matches to jump tables; Lustre
uses a bare integer id counter). `examples/todo` remains the idiomatic
reference. Concretely, the model layer diverges from `examples/todo`:

- Todo ids come from a `nextTodoId` counter in the Model, matching the Elm
  and Lustre slots, instead of the example's `GenerateTodo` Command. Adding
  a todo is one Message with no Command round trip, and `createdAt` is
  dropped because nothing in the benchmark reads it.
- `update` dispatches through a handler record keyed by Message tag,
  exhaustive via a mapped type, instead of constructing a
  `M.value(...).pipe(M.tagsExhaustive(...))` matcher per Message.
- View hot paths check tags directly and compute the footer counts in one
  pass. The optimised view nests lazy slots so the footer's filters list
  and the toggle-all controls skip the per-step footer and main rebuilds.
- The document title is a constant. Formatting a live count into the title
  every frame is work no other implementation in the harness does.

The view renders the TodoMVC structure and selectors required by the harness.
Same-batch relative timings are comparable because every implementation runs
through the same driver, runbook, and browser batch, not because their DOM is
byte-for-byte identical. The differences from the example's view:

- TodoMVC class names on the relevant elements (`new-todo`, `todo-list`,
  `toggle`, `destroy`, etc.) instead of Tailwind utilities.
- TodoMVC `header` / `main` / `footer` structure instead of the original's
  layout.
- Direct `OnKeyDownPreventDefault('Enter')` on `.new-todo` instead of a
  wrapping `<form>` with `OnSubmit`. The harness dispatches a synthetic
  `Event('keydown')`, which doesn't trigger implicit form submission.
- `h.keyed('li')` on todo list items.
- TodoMVC edit interaction: double-click the label to enter edit mode; blur,
  Enter, or Escape exit it.
- TodoMVC delete affordance: empty `<button class="destroy">` (the stylesheet
  supplies the glyph).
- TodoMVC filter affordance: `<a href="#/…">` anchors inside
  `<ul class="filters">`.
- No empty-state copy. Main and footer render nothing when there are no
  todos, matching the TodoMVC convention.

There is also no persistence. The example's `SaveTodos` Command and `flags`
localStorage read are removed because no other implementation in the harness
persists, and the synchronous `localStorage.setItem` plus full-array JSON
encode on every step would add measurable overhead not present in the
comparators.

The mount target changes from `#root` to `section.todoapp` to match the
harness's `index.html`.

## Prerequisites

- The Foldkit monorepo, set up as documented at the repo root.
- A clone of [lustre-labs/benchmark](https://github.com/lustre-labs/benchmark)
  somewhere on disk. See its README for Gleam toolchain setup.

## One-time setup (per Foldkit version)

A fresh `lustre-labs/benchmark` clone has no Foldkit entry, so:

1. Create both implementation slots. Replace `<version>` with `version` from
   `packages/foldkit/package.json` (for example `foldkit-0.100.1`):

   ```sh
   mkdir -p <lustre-benchmark>/priv/implementations/foldkit-<version>
   mkdir -p <lustre-benchmark>/priv/implementations/foldkit-<version>-optimised
   ```

2. Register both implementations by adding these entries to the JSON block
   inside `<lustre-benchmark>/index.html`. Entries are sorted alphabetically by
   `name`; insert them between `Elm` and `Gren`:

   ```json
   { "name": "Foldkit", "version": "<version>", "optimised": false },
   { "name": "Foldkit", "version": "<version>", "optimised": true }
   ```

## Build and install

From this directory:

```sh
pnpm build
```

Both variants build through `@foldkit/vite-plugin`, so the bundles carry the
view-identity branding a production Foldkit app ships with; the benchmark
measures the real production pipeline, not a stripped-down one.

That produces two output directories:

- `dist/naive/`: naive view, relative asset URLs, includes the
  `/priv/instrumentation.js` script tag the harness requires.
- `dist/optimised/`: optimised view (using `createLazy` and `createKeyedLazy`),
  same wiring.

Copy each into its slot:

```sh
rm -rf <lustre-benchmark>/priv/implementations/foldkit-<version>/dist
cp -R dist/naive <lustre-benchmark>/priv/implementations/foldkit-<version>/dist

rm -rf <lustre-benchmark>/priv/implementations/foldkit-<version>-optimised/dist
cp -R dist/optimised <lustre-benchmark>/priv/implementations/foldkit-<version>-optimised/dist
```

To build only one variant, use `pnpm build:naive` or `pnpm build:optimised`.

## Run the benchmark

From the lustre-benchmark clone:

```sh
gleam run -m serve
```

Open the URL it prints and run the benchmark from the page UI.

## Local driver (headless, with per-bucket attribution)

`bench/` uses the harness instrumentation, runbook, and one-quiet-frame unload
gate under Playwright so results are scriptable and split by bucket. The
harness measures the SUM of time spent executing inside instrumented async
callbacks (setTimeout, rAF, queueMicrotask, Promise.then) plus synchronous
event-handler time; waiting between steps costs nothing. The runner lets
application boot settle, records it separately, resets immediately before the
runbook, and applies the harness unload gate after the final step. The
per-bucket split is the diagnostic payload: runtime scheduling overhead shows
up as microtask or timeout time that a single total hides. The runner serves
everything cross-origin isolated (full timer precision) and stubs the unpkg
CSS identically for every implementation.

```sh
pnpm build
HARNESS_DIR=~/dev/lustre-benchmark pnpm bench:install
HARNESS_DIR=~/dev/lustre-benchmark pnpm bench:run
HARNESS_DIR=~/dev/lustre-benchmark pnpm bench:verify
```

- `bench:install` copies `dist/naive` and `dist/optimised` into
  `foldkit-dev` / `foldkit-dev-optimised` slots in the clone.
- `bench:run` interleaves implementations by round, drives the runbook, and
  prints per-bucket medians plus each implementation's time relative to the
  fastest median in the same batch. It also prints the harness commit and
  Chromium version so a published batch is reproducible. Compare against the
  clone's committed implementations with
  `IMPLS=foldkit-dev-optimised,elm-0.19.1-optimised,react-19.1.0-optimised`.
  `RUNS` controls the median width. By default, the driver uses the smallest
  multiple of the implementation count that is at least five, so cyclic round
  rotation puts every implementation in every ordinal position equally often.
  If you set `RUNS` to a non-multiple, the driver warns that the order is not
  position-balanced.
- `bench:verify` asserts the slot actually behaves (add, toggle, destroy,
  edit, filters, toggle-all, clear-completed); the benchmark itself never
  checks correctness.

Numbers are machine-specific and drift a few percent between sessions. Run
comparisons in one `bench:run` batch and read the relative column, which is
computed directly from the medians printed beside it, rather than comparing
absolute milliseconds across sessions. If Playwright's managed Chromium is
not installed, point `FOLDKIT_BENCH_CHROMIUM` at a Chromium executable.

## When Foldkit's version bumps

Bump the slot directory name and the `version` value in the `index.html` entry
to match `packages/foldkit/package.json`. Rebuild and re-copy the dist as
above.
