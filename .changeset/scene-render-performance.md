---
'foldkit': minor
---

Add tools for measuring render performance: `Perf` and `expectDomInSync` for Scene tests, a runtime `instrument` hook for interaction timing, the `scroll` and `unhover` Scene steps, and optional labels for lazy slots.

Before this, the only performance signal was `slow`, which warns about a single phase after it has gone over budget, at runtime. A test could not say "hovering a row should rebuild two rows", and an app could not report how long an interaction took from input to paint. Scene runs update and view on every step, so it already does the work it needs to count.

`Perf.measure(onProfile, ...steps)` wraps steps like `inside` and reports, for every step that ran update, the Message tags, update and view time, how many VNodes the view built and how many it reused from the previous render, lazy cache hits and misses with their reasons, and an estimate of the DOM patch. `Perf.budget(limits, ...steps)` fails when a total goes over its limit and prints the full profile. Counts such as `vnodesBuilt`, `lazyInvalidations` and `nodesChanged` are deterministic, so budgets hold in CI. `vnodesBuilt` is the one that catches a view that memoizes nothing: such a view has no lazy misses and may patch almost nothing, while still rebuilding its whole tree.

`expectDomInSync(...steps)` patches every render into a real DOM the way the runtime does and fails when the patched DOM differs from a fresh render. Scene asserts against VNodes, so it could not see a patch landing on the wrong element. The motivating case is a lazy-cached row reused at a different position among unkeyed siblings in a virtualized list, which leaves stale and missing rows after scrolling. It compares markup only, does not run hooks or listeners, and needs a DOM environment such as happy-dom.

`instrument: { onFrame, minDurationMs?, sampleRate?, show? }` on `makeApplication` and `makeElement` reports one record per rendered frame after it paints: the Messages it processed with their update time and the DOM event that dispatched each one, view and patch time, and `durationMs` from the event timestamp to the next paint, the latency INP measures. A Message that leaves the Model unchanged is reported at once without a render. When `instrument` is not configured the runtime measures nothing extra. `messageTagPath` names a Message by its tag path, following wrapped Submodel Messages.

`scroll(target, { scrollTop })` fires `OnScroll`, and `unhover(target)` fires `OnMouseLeave`, falling back to `OnPointerLeave` and `OnMouseOut`. Previously a test fed those Messages through `Subscription.emit`. A `.class` selector now also matches a class set with `h.Attribute('class', ...)`. `createLazy` and `createKeyedLazy` take an optional label that names the slot in `Lazy.expectAllReused` failures and `Perf` reports; it does not affect caching.

Scene now keeps one boundary registry per scene, as the runtime keeps one per application. Before, each render created a fresh registry, so Submodel dispatchers changed identity between steps and a lazy view inside a Submodel missed its cache on every step.
