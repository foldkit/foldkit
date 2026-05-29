# Foldkit SSR — phase 1 implementation plan

Status: planning. No production code yet.

## Base assumption (read first)

This plan targets the **`devin/perf-and-submodel`** view layer, not the current
`main`/`ssr-plan` base. That branch is a single breaking `feat!` that rewrites the
exact files SSR touches and changes the rendering substrate from Effect-based to
synchronous. SSR work must not begin until perf-and-submodel merges; building
against today's base would encode obsolete entry moves and conflict hard.

The two facts from that branch that reshape the original brief:

1. `Html = VNode | null` (synchronous). Element constructors are plain functions
   that read dispatch and runtime context from a module-level singleton stack
   (`html/runtimeSingleton.ts`: `setRuntime` / `clearRuntime` / `requireDispatch`
   / `requireRuntimeContext`). `createLazy` / `createKeyedLazy` resolve
   synchronously to a `VNode | null`. There is still no snabbdom thunk module, so
   a rendered tree is fully materialized.
2. First-class Submodels add a boundary layer (`html/boundary.ts`,
   `html/submodel.ts`, `html/childAttribute.ts`). Dispatch is late-bound
   per-boundary via a `BoundaryRegistry` and resolved at event-fire time. This
   does not affect HTML output (listeners are dropped on the server) but it
   reshapes hydration: the client must re-establish the same boundary frame, not
   a flat dispatch.

The live render path that both new primitives hook into is `runtime.ts`'s
`render` (perf branch ~932-985):

```ts
const runtimeContext = yield * Effect.context<never>()
beginHtmlRender(boundaryRegistry)
setHtmlRuntime(dispatchService.dispatchSync, runtimeContext, boundaryRegistry)
let nextDocument: Document
try {
  nextDocument = view(model)
} finally {
  clearHtmlRuntime()
}
const nextVNode = nextDocument.body
// ... patch(toVNode(container) | currentVNode, nextVNode) ...
```

## Scope

In scope (phase 1):

1. `Server.renderToString(program, url, flags) => string` — pure, synchronous,
   no DOM, no Effect runtime required.
2. A `{ hydrate: true }` boot path on `Runtime.run`.
3. A shell helper that assembles the SSR HTTP response (HTML + encoded flags).

Out of scope (unchanged from the brief): `ServerCommand` / server-side Command
execution, Model serialization over the wire, streaming SSR, selective
hydration, per-route render-mode config, migrating the website prerender script,
and any shipped server/adapter entry. Developers write their own server entry.

## Resolved open questions

The brief flagged five. Decisions for phase 1:

1. **Flags `<script>` location and id.** A single
   `<script type="application/json" id="foldkit-flags">…</script>` placed at the
   end of `<body>`, after the app container. The shell helper emits it; the
   hydrate boot reads `document.getElementById('foldkit-flags')`. The payload is
   the `Flags` Schema codec encoded to JSON. No new serialization protocol.
2. **Mismatch behavior.** Throw, loudly, with the offending path and a
   tag/structure diff. Silent recovery hides the exact bug SSR is most prone to.
   The throw lives in hydrate mode only; prerender mode keeps today's lossy
   reconcile.
3. **SVG namespaces.** Sidestep XML self-closing entirely: only the HTML void
   element set is emitted without a closing tag; every other element, SVG
   included, gets an explicit `</tag>`. Emit `xmlns="http://www.w3.org/2000/svg"`
   on the root `<svg>` and let the HTML parser namespace descendants. Preserve
   tag-name casing (`foreignObject`, `linearGradient`).
4. **Server entry Effect runtime.** None required. `renderToString` is fully
   synchronous: it pushes a runtime frame with a no-op dispatch and an empty
   `Context.empty()`, calls `view(model)`, and walks the vnode. Nothing mounts on
   the server, so the captured context is inert. Callable from plain async code.
5. **Website migration.** Out of scope; separate task. The prerender script does
   far more than emit HTML (OG images, sitemap, llms.txt, markdown extracts,
   Pagefind). It can later swap headless-Chromium HTML capture for direct
   `renderToString` calls, but nothing here depends on that.

## Component 1 — `Server.renderToString`

### Module layout

- `packages/foldkit/src/server/server.ts` — implementation.
- `packages/foldkit/src/server/index.ts` — barrel (`export * from './server.js'`).
- `packages/foldkit/src/server/public.ts` — public surface
  (`export { renderToString, renderShell } from './index.js'` plus types).
- `packages/foldkit/src/index.ts` — add `export * as Server from './server/public.js'`.
- `packages/foldkit/package.json` — add the `./server` subpath export, mirroring
  the existing entries.

### Signature

```ts
export const renderToString = <Model, Message, Flags>(
  program: MakeRuntimeReturn, // or a narrower render-only descriptor; see note
  url: Url,
  flags: Flags,
) => string
```

Note on the first argument: `MakeRuntimeReturn` currently exposes only
`{ runtimeId, start }`, which is the live-boot closure and is the wrong shape for
a pure render. `makeProgram` should additionally expose the pure pieces
`renderToString` needs — `init`, `view`, and the `Flags`/`Model` codecs — via the
returned descriptor (e.g. a `renderable` field), so `renderToString` can call
`init(flags, url)` and `view(model)` without constructing a browser runtime.
This keeps `renderToString` decoupled from `start`/HMR/DevTools.

### Entry move (the part that changed from the original brief)

```ts
const [model] = init(flags, url) // pure; same init both sides
const registry = createBoundaryRegistry()
beginHtmlRender(registry)
setHtmlRuntime(noOpDispatchSync, Context.empty(), registry)
let document: Document
try {
  document = view(model)
} finally {
  clearHtmlRuntime()
}
return serialize(document) // walk document.body, drop listeners
```

No `Effect.runSync`, no `Dispatch` service. The view layer is synchronous on the
perf branch; the only requirement is an active runtime frame because
constructors call `requireDispatch()` (handler-free elements skip it, but real
views have handlers). `noOpDispatchSync` is a `(message: unknown) => void` no-op.
The init Commands are discarded on the server in phase 1 (no `ServerCommand`).

### The serializer

Input is a fully materialized snabbdom `VNode` tree (`document.body`). Walk it
recursively. The vnode `data` carries exactly the modules wired in `vdom.ts`:
`attrs`, `class`, `props`, `style`, `dataset`, `on`, `hook`, `key`, `ns`.

Per node:

- **Text node** (`sel === undefined`, `text` set): emit escaped text.
- **Comment / null** (`h('!')`): emit `<!---->` (or nothing). This is how the
  runtime represents a null body.
- **Element** (`sel` set):
  - Parse `sel` (`"div#id.a.b"`) into tag, id, class list.
  - Merge id: `sel` id then `data.attrs.id`.
  - Merge classes: `sel` classes + truthy keys of `data.class` + `data.attrs.class`.
  - Emit `data.attrs` (escape values; booleans rendered as bare/absent per HTML).
  - Emit `data.style` object as `style="k:v;…"` (camelCase → kebab-case).
  - Emit `data.dataset` as `data-*`.
  - Map `data.props` (DOM properties) to attributes via a fixed table (below).
  - **Drop `data.on` and `data.hook`.** No HTML representation.
  - Children: recurse. If `props.innerHTML` is set, emit it raw and skip children.
  - Void elements: no close tag, no children. Everything else gets `</tag>`.

**props → attribute mapping.** This is the one fidelity-sensitive table. The
perf-branch builder routes a known set through `updateDataProps` (e.g.
`Action → props.action`, `Formaction → props.formAction`, plus `value`,
`checked`, `disabled`, `selected`, `innerHTML`, `className`, `htmlFor`). The
serializer must mirror the builder's attr-vs-prop routing exactly:

- `value → value="…"`, `formAction → formaction="…"`, `action → action="…"`.
- boolean props (`checked`, `disabled`, `selected`, `readOnly`, …) → bare
  attribute when truthy, omitted when falsy.
- `className → class`, `htmlFor → for`.
- `innerHTML` → raw child content.

Do not hand-maintain this table from memory. **Derive it by auditing every
`updateDataProps` call site in `html/index.ts`** and lock it with a test that
enumerates all element constructors and asserts a round-trip (see Testing).

**Escaping.** Text: `&`, `<`, `>`. Attribute values: `&`, `"`. Use a single
small escape helper; never interpolate unescaped strings except `innerHTML`.

Estimated size: ~200-300 lines plus a substantial test suite. This is the easy,
well-bounded half of phase 1.

## Component 2 — hydrate boot (`Runtime.run(program, { hydrate: true })`)

This is the hard half and the riskiest piece. Recommend a short spike before
committing to the approach below.

### Wiring `{ hydrate: true }` through

- `run(program, options?: { hydrate?: boolean })`. Thread `hydrate` into the
  boot closure: extend `start(hmrModel?, bootOptions?: { hydrate?: boolean })`
  on `MakeRuntimeReturn`, or have `run` pass it in. HMR and hydrate are
  independent; hydrate is a production concern, HMR a dev concern.
- Only the **initial render** branch changes. Steady-state (the render loop, the
  message queue, subscriptions, managed resources) is identical to today.

### Boot sequence in hydrate mode

1. **Decode flags from the DOM.** Read `#foldkit-flags` text, JSON-parse, decode
   with the `Flags` codec (`Schema.decodeUnknown`). On failure, throw with a
   clear message (the server and client disagree on the flags shape).
2. **Run `init(flags, url)`** with `url` from `window.location`. Same `init`,
   same Model the server produced.
3. **Hydrate instead of patch.** Today's first render does
   `patch(toVNode(container), nextVNode)`, which rebuilds/reconciles. Hydrate
   mode replaces only this step with a structural walk (below).
4. **Run the init Commands** exactly as today.
5. Hand off to the existing render loop. From here everything is normal SPA.

### The hydration walk — decision

Two candidate approaches:

- **A. Lean on snabbdom.** `patch(toVNode(container.firstChild), nextVNode)`.
  Reuses the existing first-mount machinery; the `eventListenersModule` and
  `propsModule` `update` hooks attach handlers, and boundary-wrapped dispatchers
  are already baked into the new vnode's `on` data. Cheapest. But snabbdom
  **silently reconciles** on mismatch (recreates DOM) rather than throwing, and
  it is a full diff, not a pure listener-attach. Fails the "throw on mismatch"
  and "attach without re-render" invariants.

- **B. Custom hydration walk (recommended).** Walk the new vnode tree in
  parallel with the existing DOM:
  - Assert structural match per node (tag, then children arity). On mismatch,
    **throw** with the DOM path and expected-vs-found tags.
  - Set each vnode's `.elm` to the corresponding existing DOM node (no
    `createElement`).
  - Attach listeners and reconcile properties by invoking the relevant snabbdom
    module `create` hooks (`eventListenersModule`, `propsModule`, plus
    `attributes`/`class`/`style`/`dataset` for any attribute the server could not
    represent) against the now-`.elm`-bound vnode. This binds handlers to the
    server DOM without recreating it.
  - Store the result as the runtime's current vnode so subsequent renders patch
    against it normally.

Recommend **B**: it is the only path that satisfies the brief's invariants
(throw on mismatch, attach without re-render). A is the documented fallback if B
proves disproportionately costly; A is also already what **SPA-prerender** mode
gets for free via today's `run` (the brief's middle table row: "replaces
prerendered DOM on boot"). So prerender keeps A; SSR-hydrate uses B.

### Submodel / boundary considerations

The hydrate boot must establish the **same** frame the live render uses:
`beginHtmlRender(boundaryRegistry)` + `setHtmlRuntime(realDispatchSync,
runtimeContext, boundaryRegistry)` around the `view(model)` call that produces
the vnode tree to bind. Because `view` runs inside the real Effect runtime here,
`requireRuntimeContext()` returns a populated context (Mount integrations fork
Effects against live services) — this is the asymmetry with `renderToString`,
which uses an empty context. The per-boundary dispatchers are resolved at
event-fire time, so binding handlers means binding the boundary-wrapped
dispatcher, not a flat one; using the same `setHtmlRuntime` frame gets this right
by construction.

## Component 3 — shell helper

A small function the developer's request handler calls to assemble the response:

```ts
export const renderShell = <Flags>(args: {
  html: string                       // from renderToString
  flags: Flags
  FlagsSchema: Schema.Codec<Flags, ...>
  head?: string                      // title, meta, links, script tags
  containerId?: string               // default "app"
}) => string
```

Output shape:

```html
<!doctype html>
<html>
  <head>
    {head}
  </head>
  <body>
    <div id="{containerId}">{html}</div>
    <script type="application/json" id="foldkit-flags">
      {encodedFlags}
    </script>
    <!-- developer includes their bundle script themselves -->
  </body>
</html>
```

`encodedFlags` is `JSON.stringify(Schema.encodeSync(FlagsSchema)(flags))`, HTML-
escaped for the `<script>` context (escape `<` to avoid `</script>` injection).
The helper does not inject the app bundle `<script>`; the developer controls that
(and asset hashing). Lives in `server/server.ts` alongside `renderToString`.

Document metadata (title, canonical, ogUrl) already lives on the `Document` the
view returns. `renderToString` should also return these (or expose a variant
that returns `{ body, title, canonical, ogUrl }`) so `renderShell` can populate
`<head>` from the same source the client uses via `applyDocumentMetadata`.
Decide: either `renderToString` returns a struct, or a sibling
`renderDocument` returns the struct and `renderToString` returns just the body
string. Recommend the struct-returning primitive as canonical, with a thin
body-only convenience wrapper.

## File-by-file work breakdown

New:

- `src/server/server.ts` — `renderToString`, `renderDocument`, `renderShell`,
  the serializer, the escape helpers, the void-element set, the props→attr table.
- `src/server/index.ts`, `src/server/public.ts` — barrels.
- `src/server/server.test.ts` — serializer + round-trip tests.
- `src/runtime/hydrate.ts` — the hydration walk (approach B) and flag decode.
- `src/runtime/hydrate.test.ts`.

Modified:

- `src/runtime/runtime.ts` — `run(program, { hydrate })`, thread `hydrate` into
  `start`, branch the initial render to `hydrate(...)`. Expose the pure
  `renderable` pieces (`init`, `view`, codecs) on `MakeRuntimeReturn` for
  `renderToString`.
- `src/runtime/public.ts` — export any new hydrate types.
- `src/index.ts` — `export * as Server`.
- `package.json` — `./server` subpath export.
- `src/html/public.ts` — confirm `__setRuntime`/`__clearRuntime`/
  `__createBoundaryRegistry`/`requireDispatch` (or equivalents) are reachable by
  `server.ts` and `hydrate.ts` without reaching into private modules; promote to
  a shared internal entry if needed.

Examples / docs (separate, after the primitives land):

- An SSR example under `examples/` with a minimal Node request handler.
- Update `packages/website/src/page/whatAboutSsr.ts` to move per-request SSR
  from "on the roadmap" to shipped, once it is.

## Testing strategy

- **Serializer unit tests.** Each vnode feature in isolation: attrs, class merge
  (sel + `data.class` + attrs), style camel→kebab, dataset, void elements,
  text/attr escaping, comment/null, `innerHTML` raw, SVG subtree with root
  `xmlns` and explicit closes, nested children, keys (no HTML effect).
- **Round-trip / fidelity test (the important one).** Enumerate every element
  constructor in `html/index.ts`. For each, render via `renderToString`, parse
  the HTML in jsdom/happy-dom, lift via `toVNode`, and assert the structure
  matches the vnode `view` produced on the client. This is the contract that
  prevents hydration mismatch and pins the props→attr table.
- **Hydration tests.** Render server HTML, mount it, run hydrate, assert: no DOM
  nodes recreated (identity preserved), listeners fire and dispatch through the
  correct (boundary-wrapped) dispatcher, init Commands run, a deliberately
  corrupted DOM throws with a useful message.
- **Submodel hydration test.** A view with an `h.submodel` / `Ui.*` child:
  assert a child-originated event routes through `toParentMessage` after
  hydration, proving boundary dispatch is rebound correctly.

## Sequencing

1. Land perf-and-submodel (blocker; do not start before).
2. Build the serializer + `renderToString` (Component 1). Self-contained,
   testable, no runtime changes beyond exposing `renderable`.
3. Spike the hydration walk (Component 2, approach B) on one real example.
   Decide B-vs-A based on the spike.
4. Implement hydrate boot + `run({ hydrate })`.
5. Shell helper (Component 3) + an SSR example.
6. Docs/website update (separate task).

## Invariants preserved

- Elm Architecture intact: `init`/`update`/`view` unchanged in shape; `init`
  stays `(flags, url)` everywhere; Messages as facts; side effects in Commands.
- View is a pure function of the Model — the basis for structural hydration.
- SPA-mode and SPA-prerender behavior unchanged. Hydrate is strictly opt-in via
  `{ hydrate: true }`.

## Deferred to phase 2

- `ServerCommand` and server-side Command execution (HTML ships with data, not a
  loading state).
- Model serialization over the wire (needed once Commands populate Model with
  data the URL alone can't reproduce).
- Streaming and selective hydration.
