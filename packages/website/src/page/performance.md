# Performance

## Overview

This page compares Foldkit with peer frameworks in a keyed table workload, measured on October 30, 2026. The Foldkit results use [commit `a664f983`](https://github.com/foldkit/foldkit/commit/a664f9834f0398807d748071cc402a991861a870), an unreleased build based on 0.170.0.

## Benchmarks

### Workload

Foldkit uses [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) for its public rendering comparison. The suite creates, updates, selects, swaps, removes, and clears table rows. Every entry in this comparison is keyed: a row's DOM identity follows its id when the rows move.

The [measured Foldkit implementation](https://github.com/foldkit/foldkit/blob/6991555d65d9fd6e5199acbf3693a31b05f72898/internal/js-framework-benchmark/src/main.ts) uses keyed rows with per-row view memoization. Framework entries use production builds.

### Operation timings

Values are median milliseconds; lower is faster. Vanilla is the upstream `vanillajs-lite` direct DOM implementation, and React is `react-hooks`. Partial update changes every tenth row of 1,000. Append adds 1,000 rows to an existing 1,000.

::BenchmarkResults{kind="CPU"}

Among these seven entries, Foldkit had the slowest median in five of nine operations and the lowest median for removing one row. Selection was close to React, at 9.1 ms versus 8.9 ms. For creating 10,000 rows and swapping, Foldkit's median was lower than React and Elm, and higher than Solid, Svelte, and Vue.

These table operations measure rendering workloads. They do not establish how a complete application performs, or isolate the cost of Foldkit's architecture.

### Memory

Values are median MiB across five samples, measured after garbage collection with the browser's memory measurement API. Memory tests ran separately in seven isolated headless Chrome instances, one per entry, under normal system memory pressure. Each create/clear sample performs five cycles of creating and clearing 1,000 rows.

::BenchmarkResults{kind="Memory"}

Foldkit had the highest median memory use in all three measurements. After creating 1,000 rows, it used 6.21 MiB, compared with 2.68 MiB for Solid and 4.43 MiB for React.

### Measurement

The timings come from Chrome traces and include scripting and rendering. The harness applies 4× CPU throttling to partial update, selection, swapping, and clearing, and 2× to removal. The other operations run without throttling. See the [operation definitions at the tested revision](https://github.com/krausest/js-framework-benchmark/blob/ca8715d9ae84916fd24de3a79457d8c328f9b766/webdriver-ts/src/benchmarksCommon.ts).

The timing batch used harness commit `ca8715d9`, Chrome for Testing 156.0.8078.75 in a visible window, and an Apple M1 Max with 64 GiB of memory running macOS 26.6.2 on AC power. Each operation has 15 samples, except selection, which the upstream runner samples 25 times. Each sample starts from a fresh page and follows the harness's warmup procedure. Frameworks run sequentially within each operation.

These are local measurements, separate from the [official upstream results](https://krausest.github.io/js-framework-benchmark/index.html). The [raw samples and run metadata](https://github.com/foldkit/foldkit/tree/6991555d65d9fd6e5199acbf3693a31b05f72898/internal/js-framework-benchmark/results/2026-10-30) record the entry versions, build details, and commands.

## Where the time goes

Every state change in a Foldkit app flows through one pipeline, so the cost model fits in a few sentences:

### Dispatch and Rendering

- A dispatched Message runs `update` synchronously, right on the dispatching stack, in arrival order. The runtime compares the returned Model to the previous one by reference. If nothing changed, nothing renders.
- Renders coalesce. Any number of Messages arriving between frames mark at most one pending frame; the next animation frame renders once with the latest Model. A burst of two hundred Messages inside one frame costs two hundred update calls and a single render.
- A render is `view` plus diff plus patch: build the new virtual tree, diff it against the previous one, and touch only the DOM that changed.
- Command results always arrive asynchronously. A synchronous burst that exhausts its time budget defers its remaining Messages to a new task, yielding to the browser. Rendering waits for the deferred drain to finish so it does not restore older controlled input values.

### Model Size and Change Detection

The production hot path does no work proportional to Model size. No serialization, no deep comparison, no freezing, no snapshots. Change detection is reference equality, and `modifyFields` preserves unchanged branches by reference, so the cost of a Message is the cost of your `update` logic, and the cost of a frame is the cost of the subtrees that actually changed.

## What the abstractions cost

The cost model above puts the cost of a Message on your `update` logic. What the update-side abstractions add on top of that is small, and worth spelling out, because they are the first thing people suspect when an app feels slow:

### Child Folds and Model Updates

- `Update.foldChild` adds a function call and an arity check over the wiring you would otherwise write by hand. Inside, it does exactly what the hand-written handler does: read the child out of the Model, run its update, write it back, and lift the child’s Commands through `toParentMessage`.
- `modifyFields` is Effect’s `Struct.evolve` at runtime; the wrapper adds key checking at the type level only. It walks the struct’s own enumerable keys once and applies a transform only where you provided one, copying everything else by reference. The cost is proportional to the Model’s top-level field count, the same as an object spread, and that reference preservation is what lets [createLazy](/core/view-memoization) hit its `===` check.

### Exhaustive Message Matching

`Message.match` is the one whose cost scales with your app. It dispatches directly on `_tag`, but the handler object and one closure per arm are still allocated on every dispatch. Because the arms close over `model`, they cannot be hoisted to module scope.

Keep `Message.match` anyway. Its signature requires a handler for every tag in the union, so adding a Message variant fails to compile in every update that does not handle it. It also avoids the matcher pipeline that Effect `Match` builds for more general pattern matching. An `if`/`else` chain on `_tag` gives up exhaustiveness for less allocation. If a profile ever puts a genuinely hot update at the top, that trade is available, but it is the last change to reach for rather than the first.

## Development mode is not production

### Development-Only Systems

The dev server runs several systems that production builds strip entirely:

- [Freeze Model](/core/freeze-model) deep-freezes the Model after every update to catch accidental mutation at the write site.
- [DevTools](/core/devtools) records each Message with Model snapshots and diffs for time travel.
- The [Slow Warnings](/core/slow-warnings) can time update, subscriptions, view, and patch work against phase budgets.
- Model preservation encodes the Model so state survives development reloads.

### Measure a Production Build

All of it is gated behind `import.meta.hot` and eliminated from production bundles. The consequence: judge performance with a production build. An animation-heavy app dispatching Messages at 60Hz pays the dev-mode systems on every single update, so the dev server systematically understates how the deployed app performs. If DevTools is enabled, use `excludeFromHistory` to skip history recording for high-frequency Messages like frame ticks and pointer moves.

## The optimization toolkit

When something is slow, work through this list in order:

- Let the [Slow Warnings](/core/slow-warnings) tell you which synchronous phase is actually slow before optimizing anything.
- Memoize expensive subtrees with [createLazy and createKeyedLazy](/core/view-memoization). The keyed cache releases entries absent from a completed render.
- [Key](/best-practices/keying) mapped list items by stable Model ids, the one identity only your data can provide, so the differ moves nodes instead of rebuilding them. Branching views need no keys when built with `@foldkit/vite-plugin`: view functions carry identity, and the differ replaces DOM when a position’s identity changes. Without the plugin, branch identity falls back to positional-plus-key semantics and each branch point needs an explicit key.
- Cache expensive derived data on the Model when memoization cannot cover it. The view recomputes a derived value on every render whether or not its inputs changed; update can compute it once, in the branches that change those inputs. The price is a derived field every such branch must keep in sync, so reach for this after `createLazy`, not before.
- Render long lists with [Virtual List](/ui/virtual-list) so only visible items mount.

## Bundle size and code splitting

### Benchmark Bundle

The package is ESM-only, marked side-effect-free, and exposed through subpath exports, so bundlers tree-shake everything an app does not import. The table app measured with Foldkit `a664f983` contained about 306 kB of JavaScript, or 100 kB gzipped. That includes the table app, the Foldkit runtime, its vendored differ, and Effect. The application also uses Effect for Commands, Schemas, and data manipulation. The exact byte counts and build hash are in the run metadata.

### What Splits Today

What splits today:

- Heavy dependencies behind dynamic `import()`. This site loads the Monaco editor that way, only on the playground.
- Independent apps on one page via [embedding](/core/embedding), each with its own bundle and lifecycle.

### Route Splitting

What does not split today: the routes of a single app. A Foldkit program is one statically composed Model, update, and view, so the code for every page ships in the initial bundle. Elm shares this property for the same reason. Splitting a program by route would take design work against the single-Model architecture, not a configuration flag.

For first-paint and SEO concerns, see [Server Rendering](/core/server-rendering). Rendering a route on the server or at build time puts real content in the response before the bundle loads.
