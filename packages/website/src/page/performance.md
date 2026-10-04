# Performance

## Overview

Performance questions about a framework usually mean three different things: how fast is the renderer, what does the architecture cost as an app grows, and how much JavaScript ships to the browser. This page answers all three, with numbers where numbers exist, and points at the tools Foldkit gives you when something is slow.

## Where the time goes

Every state change in a Foldkit app flows through one pipeline, so the cost model fits in a few sentences:

- A dispatched Message runs `update` synchronously, right on the dispatching stack, in arrival order. The runtime compares the returned Model to the previous one by reference. If nothing changed, nothing renders.
- Renders coalesce. Any number of Messages arriving between frames mark at most one pending frame; the next animation frame renders once with the latest Model. A burst of two hundred Messages inside one frame costs two hundred update calls and a single render.
- A render is `view` plus diff plus patch: build the new virtual tree, diff it against the previous one, and touch only the DOM that changed.
- Command results always arrive asynchronously, and a synchronous burst that holds the stack past a small budget defers its remaining Messages to a new task so the page keeps painting.

The production hot path does no work proportional to Model size. No serialization, no deep comparison, no freezing, no snapshots. Change detection is reference equality, and `modifyFields` preserves unchanged branches by reference, so the cost of a Message is the cost of your `update` logic, and the cost of a frame is the cost of the subtrees that actually changed.

## What the abstractions cost

The cost model above puts the cost of a Message on your `update` logic. What the update-side abstractions add on top of that is small, and worth spelling out, because they are the first thing people suspect when an app feels slow:

- `Update.foldChild` adds a function call and an arity check over the wiring you would otherwise write by hand. Inside, it does exactly what the hand-written handler does: read the child out of the Model, run its update, write it back, and lift the child’s Commands through `toParentMessage`.
- `modifyFields` is Effect’s `Struct.evolve` at runtime; the wrapper adds key checking at the type level only. It walks the struct’s own enumerable keys once and applies a transform only where you provided one, copying everything else by reference. The cost is proportional to the Model’s top-level field count, the same as an object spread, and that reference preservation is what lets [createLazy](/core/view-memoization) hit its `===` check.
- `Message.match` is the one whose cost scales with your app. It dispatches directly on `_tag`, but the handler object and one closure per arm are still allocated on every dispatch. Because the arms close over `model`, they cannot be hoisted to module scope.

Keep `Message.match` anyway. Its signature requires a handler for every tag in the union, so adding a Message variant fails to compile in every update that does not handle it. It also avoids the matcher pipeline that Effect `Match` builds for more general pattern matching. An `if`/`else` chain on `_tag` gives up exhaustiveness for less allocation. If a profile ever puts a genuinely hot update at the top, that trade is available, but it is the last change to reach for rather than the first.

## Benchmarks

Foldkit ships a TodoMVC implementation for the [lustre-labs/benchmark](https://github.com/lustre-labs/benchmark) harness, which drives each implementation through the same TodoMVC workload and required selectors (add 100 todos, toggle each one, destroy the first one 100 times). Same-batch timings are comparable because every implementation uses the same driver, runbook, and browser batch. Foldkit registers two slots: an unoptimized view that rebuilds the entire tree on every Message with no memoization, and an optimized view that adds `createLazy` slots for the header, the footer, the filters list, and the toggle-all controls, and `createKeyedLazy` per todo item. The Model and update logic are identical in both. The implementation lives [in the Foldkit repo](https://github.com/foldkit/foldkit/tree/main/internal/lustre-benchmark), so you can run the comparison yourself.

These cover every current-version framework variant in the harness plus Foldkit’s two current development slots; the legacy Lustre 4 and older Foldkit slots are excluded. The medians come from fifteen interleaved runs in one position-balanced batch, so every implementation occupied every ordinal run position once. The batch used harness commit 03fff17 and Chromium 152.0.7977.65. The relative column divides each displayed median by the fastest median from that same batch. A parenthesized label appears only where the harness registers both a baseline and a memoized slot. Solid and Alpine drive the DOM without a diff to skip, so each registers one implementation and its row carries a bare name. Absolute times depend on hardware and browser conditions; the same-run relationships are the result to compare.

| Implementation         | Median time | Relative to fastest |
| ---------------------- | ----------- | ------------------- |
| Svelte (optimized)     | 104.5ms     | 1.00×               |
| Gren (optimized)       | 114.3ms     | 1.09×               |
| Elm (optimized)        | 116.3ms     | 1.11×               |
| Svelte (unoptimized)   | 156.2ms     | 1.49×               |
| Lustre 5 (optimized)   | 192.8ms     | 1.84×               |
| Solid                  | 192.9ms     | 1.85×               |
| Foldkit (optimized)    | 210.0ms     | 2.01×               |
| Vue (unoptimized)      | 270.6ms     | 2.59×               |
| React 19 (optimized)   | 279.1ms     | 2.67×               |
| Gren (unoptimized)     | 306.4ms     | 2.93×               |
| Elm (unoptimized)      | 309.1ms     | 2.96×               |
| Lustre 5 (unoptimized) | 405.2ms     | 3.88×               |
| React 19 (unoptimized) | 503.8ms     | 4.82×               |
| Alpine                 | 540.3ms     | 5.17×               |
| Foldkit (unoptimized)  | 614.0ms     | 5.88×               |

### Reading the numbers

Foldkit optimized ranks seventh of fifteen in this batch. It takes 2.01 times the fastest row, about 1.09 times optimized Lustre’s time, and 1.09 times Solid’s. Vue takes about 1.29 times Foldkit’s time, while optimized React takes about 1.33 times Foldkit’s. Per-bucket attribution puts the remaining distance in view and patch work inside animation frames rather than Message dispatch.

Elm is the proof of what this architecture can do. Elm renders a pure view into a virtual DOM with lazy memoization, exactly Foldkit’s design, and sits near the batch leaders at 1.11 times the fastest row. Foldkit takes 1.81 times Elm’s time. That distance is runtime implementation, not architecture, which is why optimization work targets runtime hot paths rather than replacing the rendering model.

## Development mode is not production

The dev server runs several systems that production builds strip entirely:

- [Freeze Model](/core/freeze-model) deep-freezes the Model after every update to catch accidental mutation at the write site.
- [DevTools](/core/devtools) records each Message with Model snapshots and diffs for time travel.
- The [Slow Warnings](/core/slow-warnings) can time update, subscriptions, view, and patch work against phase budgets.
- Model preservation encodes the Model so state survives development reloads.

All of it is gated behind `import.meta.hot` and eliminated from production bundles. The consequence: judge performance with a production build. An animation-heavy app dispatching Messages at 60Hz pays the dev-mode systems on every single update, so the dev server systematically understates how the deployed app performs. If DevTools is enabled, use `excludeFromHistory` to skip history recording for high-frequency Messages like frame ticks and pointer moves.

## The optimization toolkit

When something is slow, work through this list in order:

- Let the [Slow Warnings](/core/slow-warnings) tell you which synchronous phase is actually slow before optimizing anything.
- Memoize expensive subtrees with [createLazy and createKeyedLazy](/core/view-memoization). This is the single highest-leverage tool, and it is what separates the Foldkit (unoptimized) row from the Foldkit (optimized) row in the benchmark table above.
- [Key](/best-practices/keying) mapped list items by stable Model ids, the one identity only your data can provide, so the differ moves nodes instead of rebuilding them. Branching views need no keys when built with `@foldkit/vite-plugin`: view functions carry identity, and the differ replaces DOM when a position’s identity changes. Without the plugin, branch identity falls back to positional-plus-key semantics and each branch point needs an explicit key.
- Cache expensive derived data on the Model when memoization cannot cover it. The view recomputes a derived value on every render whether or not its inputs changed; update can compute it once, in the branches that change those inputs. The price is a derived field every such branch must keep in sync, so reach for this after `createLazy`, not before.
- Render long lists with [Virtual List](/ui/virtual-list) so only visible items mount.

## Bundle size and code splitting

The counter fixture ships 94.9 KB of initial JavaScript after gzip. Adding the Popover API raises that to 101.5 KB and defers 8.0 KB until its positioning Mount runs. These are consumer bundle measurements, not standalone package sizes.

Both `foldkit` and `@foldkit/ui` are ESM-only, marked side-effect-free, and exposed through subpath exports. A [consumer bundle-size harness](https://github.com/foldkit/foldkit/tree/main/internal/bundle-size) builds against their compiled package exports with Vite, the Foldkit plugin, Oxc minification, and an ES2022 target. It records raw, gzip, and Brotli sizes for emitted browser files and checks that unrelated modules stay out of small applications.

The fixtures have no CSS. The table separates initial from deferred JavaScript; each UI row starts with the same minimal Foldkit counter:

### Measurements

| Consumer                  | Initial raw | Initial gzip | Initial Brotli | Deferred gzip |
| ------------------------- | ----------: | -----------: | -------------: | ------------: |
| Effect Schema decode only |     67.5 KB |      22.1 KB |        20.1 KB |             — |
| Foldkit counter           |    290.9 KB |      94.9 KB |        83.1 KB |             — |
| Counter + Button          |    291.2 KB |      95.3 KB |        83.3 KB |             — |
| Counter + Dialog API      |    310.7 KB |      99.8 KB |        87.4 KB |             — |
| Counter + Popover API     |    316.0 KB |     101.5 KB |        88.8 KB |        8.0 KB |
| Counter + Combobox API    |    349.2 KB |     111.7 KB |        97.5 KB |             — |
| Counter + DatePicker API  |    349.1 KB |     109.8 KB |        95.6 KB |        8.0 KB |

### Interpretation

The Button row is a working app. The other UI rows retain each component's public runtime API in that app, which shows its loading cost without treating any one consumer's integration code as part of the component. Their differences are not additive. The [baseline and methodology](https://github.com/foldkit/foldkit/tree/main/internal/bundle-size) are versioned with the source. Foldkit's base includes the runtime, renderer, and Effect. Popover and DatePicker defer Floating UI until a Popover positioning Mount runs. This trades a smaller initial download for a first-open chunk request. The root and subpath Button imports produce the same raw size in this build, while the root Popover import is within 0.5 KB gzip of its subpath import.

A separate lazy Popover probe keeps the entire UI API out of the initial chunk: it measures 99.5 KB gzip initially and 13.8 KB gzip deferred. This consumer-level split is independent of the component's own deferred positioning code. The dynamic-import loader adds some initial bytes, so these numbers describe loading tradeoffs rather than smaller total bundles.

What splits today:

- Heavy dependencies behind dynamic `import()`. This site loads the Monaco editor that way, only on the playground.
- Independent apps on one page via [embedding](/core/embedding), each with its own bundle and lifecycle.

What does not split today: the routes of a single app. A Foldkit program is one statically composed Model, update, and view, so the code for every page ships in the initial bundle. Elm shares this property for the same reason. Splitting a program by route would take design work against the single-Model architecture, not a configuration flag.

For first-paint and SEO concerns, see [Server Rendering](/core/server-rendering). Rendering a route on the server or at build time puts real content in the response before the bundle loads.
