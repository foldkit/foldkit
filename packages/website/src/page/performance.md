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

## Compiled Schema parsers

Out of the box, every `Schema.decode*` call walks its Schema at runtime. Effect calls this the interpreter. It is fast enough for most apps, but an app that decodes large API responses or a steady stream of WebSocket frames spends measurable time in it.

`@foldkit/vite-plugin` can compile those Schemas ahead of time instead. Keep the Schemas in their own modules and export them:

::Snippet{name="performanceSchemaCompilerModule" label="Schema module example"}

Then list those modules in the plugin options:

::Snippet{name="performanceSchemaCompilerViteConfig" label="Vite config example"}

During `vite build`, the plugin imports the listed modules in Node, passes every exported Schema to Effect's `SchemaAOTCompiler`, and adds the generated parsers to the client bundle. The built app installs them before your entry runs. After that, `Schema.decodeUnknownSync(TodosResponse)` uses the compiled parser for `TodosResponse` and for the `Todo` inside it. The code that decodes does not change.

The gain shows up where your app decodes data itself. For example: HTTP responses in Commands, WebSocket and Port messages, Flags, and saved state. Foldkit does not decode the Model on every update in production, so listing only the Model changes little.

These medians come from a production build in headless Chromium 153 on one desktop machine, and allocation from the same Schemas in Node 26:

| Operation                                   | Interpreted | Compiled | Allocated per call |
| ------------------------------------------- | ----------- | -------- | ------------------ |
| Decode a 1,000-item API response            | 1.41 ms     | 0.14 ms  | 1.1 MB → 214 KB    |
| Encode the same response                    | 1.37 ms     | 0.14 ms  | 1.1 MB → 212 KB    |
| `Schema.is` on the same response            | 1.35 ms     | 0.09 ms  | 1.1 MB → 2 KB      |
| Decode 1,000 WebSocket frames (5-way union) | 0.44 ms     | 0.11 ms  | 223 KB → 162 KB    |
| Decode one small struct                     | 288 ns      | 60 ns    | 92 B → 82 B        |

The price is bundle size. The compiler's runtime adds about 1.6 KB gzipped, and each compiled Schema adds its own generated code. The Kanban example, with three Schemas compiled for decoding and encoding, grows by 4.5 KB gzipped (4%). Each operation you add to `operations` generates more code, so list only the ones your app calls.

Some limits to plan around:

- The listed modules run in Node at build time, with your resolve settings but without your other Vite plugins. A module that renders the view, touches the DOM, or starts the Runtime cannot be listed. That is why the Schemas live in a module of their own.
- A listed module must build the same Schemas in Node as in the browser. A Schema that branches on `import.meta.env.SSR` or `typeof window` is compiled from its Node definition and then decodes browser data against the wrong shape.
- A Schema built at the call site, such as `Schema.fromJsonString(TodosResponse)`, is a new Schema. Its own step is interpreted, while the compiled `TodosResponse` inside it is still used. Export it too to compile the whole thing.
- The listed modules load with the entry, ahead of the installation. A Schema that a lazily imported route would otherwise load later now ships in the initial bundle, and a `Schema.decode*` call that runs while those modules are first evaluated still interprets.
- `operations` defaults to `['decode']`. Add `'encode'` for `Schema.encode*`, `'is'` for `Schema.is`, and `'make'` for Schema constructors.
- The plugin installs the parsers through the page's HTML. A client build with no HTML entry warns and ships without them until its entry imports `virtual:foldkit/schema-compiler` first. TypeScript needs `declare module 'virtual:foldkit/schema-compiler' {}` in a declaration file for that import. On the dev server the import resolves to an empty module.
- Only the production client bundle gets compiled parsers. The dev server and the server bundle keep interpreting.
- The compiler is part of Effect's unstable API. Schema features it does not handle yet, such as most transformations, fall back to the interpreter, and its output can change between Effect releases.

## Bundle size and code splitting

The package is ESM-only, marked side-effect-free, and exposed through subpath exports, so bundlers tree-shake everything an app does not import. A minimal counter app builds to about 270 KB raw and just under 90 KB gzipped, and that includes the Foldkit runtime, its vendored differ, and Effect itself. Effect is the largest share of the baseline, and it is not dead weight: it is the same library your application code uses for Commands, Schemas, and data manipulation.

What splits today:

- Heavy dependencies behind dynamic `import()`. This site loads the Monaco editor that way, only on the playground.
- Independent apps on one page via [embedding](/core/embedding), each with its own bundle and lifecycle.

What does not split today: the routes of a single app. A Foldkit program is one statically composed Model, update, and view, so the code for every page ships in the initial bundle. Elm shares this property for the same reason. Splitting a program by route would take design work against the single-Model architecture, not a configuration flag.

For first-paint and SEO concerns, see [Server Rendering](/core/server-rendering). Rendering a route on the server or at build time puts real content in the response before the bundle loads.
