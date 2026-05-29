# Foldkit SSR: phase 1 implementation plan

Status: planning. No production code yet. This file has been reconciled with
`internal/plans/ssr-handoff-prompt.md`. Where the two ever disagree, the handoff
prompt is the source of truth; this file holds the detailed mechanics that match
those decisions.

## Base assumption (read first)

This plan targets the **`devin/perf-and-submodel`** view layer, not the current
`main`. That branch is a single breaking `feat!` that rewrites the exact files
SSR touches and changes the rendering substrate from Effect-based to synchronous.
SSR work must not begin until perf-and-submodel merges. Building against today's
base would encode obsolete entry moves and conflict hard.

The two facts from that branch that reshape the original brief:

1. `Html = VNode | null` (synchronous). Element constructors are plain functions
   that read dispatch and runtime context from a module-level singleton stack in
   `html/runtimeSingleton.ts`: `setRuntime` / `clearRuntime` / `requireDispatch` /
   `requireRuntimeContext`, plus the boundary stack `pushBoundary` / `pushFrame` /
   `requireBoundary` / `getCurrentFrame`. `createLazy` / `createKeyedLazy` resolve
   synchronously to a `VNode | null`. There is no snabbdom thunk module, so a
   rendered tree is fully materialized.
2. First-class Submodels add a boundary layer (`html/boundary.ts`,
   `html/submodel.ts`, `html/childAttribute.ts`). `html/boundary.ts` exports the
   `BoundaryRegistry` type, `createBoundaryRegistry`, and `beginRender`. Dispatch
   is late-bound per boundary via the registry and resolved at event-fire time.
   This does not affect HTML output (listeners are dropped on the server) but it
   reshapes hydration: the client must re-establish the same boundary frame, not a
   flat dispatch.

### The live render seam (accurate symbols)

The render path that both SSR primitives hook into lives in `runtime.ts`. One
registry is created per runtime instance and shared across renders, then each
render pass pushes a frame:

```ts
// once per runtime instance (~607)
const boundaryRegistry: BoundaryRegistry = createHtmlBoundaryRegistry()

// per render pass, inside the render Effect (~937-985)
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
const patchedVNode = patchVNode(maybeCurrentVNode, nextVNode, container)
applyDocumentMetadata(nextDocument, patchedVNode.elm)
```

`patchVNode` (~1370) is the first-mount-vs-update fork: with no current vnode it
does `patch(toVNode(container), nextVNode)`; otherwise `patch(currentVNode,
nextVNode)`. A null body becomes `h('!')`. The SSR hydrate boot replaces only the
first-mount branch (`patch(toVNode(container), nextVNode)`) with a hydration walk.

### A note on the three naming layers

The same functions appear under three names depending on the import site. Do not
let this confuse the implementation:

- Canonical definitions: `setRuntime` / `clearRuntime` / `requireDispatch` /
  `requireRuntimeContext` in `html/runtimeSingleton.ts`; `createBoundaryRegistry`
  / `beginRender` / `BoundaryRegistry` in `html/boundary.ts`.
- Internal cross-module entry: `html/index.ts` re-exports the ones runtime-side
  consumers need with a `__` prefix (`__setRuntime`, `__clearRuntime`,
  `__beginRender`, `__createBoundaryRegistry`).
- Local aliases in `runtime.ts`: it imports those `__`-prefixed names as
  `setHtmlRuntime`, `clearHtmlRuntime`, `beginHtmlRender`,
  `createHtmlBoundaryRegistry`.

The server and hydrate modules import the same `__`-prefixed internal entry that
`runtime.ts` already uses. No new promotion of private symbols is required for the
four render-frame functions.

## The mental model

- SSR moves the **first render** to the server so the first HTML response
  contains real content (fast first paint, crawlable) instead of an empty SPA
  shell. The JS still loads as a separate request afterward and hydrates.
- The app's live runtime stays in the browser. The server does not host a running
  app and **never runs `update`**. Per request it runs only `serverFlags -> init
-> view -> serialize`, then forgets everything. The server is stateless;
  identity and data come from the request each time.
- Hydration is safe because `view` is a pure function of the Model. Same Model in,
  same tree out, so the client can adopt the server's HTML instead of rebuilding.
- SSR is an **enhancement, never a hard dependency**. If a server render fails,
  send the plain SPA shell and let the client boot normally. A render failure
  degrades to "it is an SPA this request," not an outage.

## Operating model

- The server runs a pure per-request render and is stateless. No per-user state in
  module globals; identity is re-resolved from the request each time. This is what
  the Elm Architecture already guarantees (pure view, effects in Commands, Model
  as the single source of truth), so statelessness is free if you do not cheat.
- The render primitive must be agnostic to the full deployment spectrum: an
  always-on Node process; serverless functions (cold starts); and edge runtimes
  (V8 isolates, no full Node, no DOM). This is why the server unit must avoid both
  DOM-specific and Node-specific APIs in the render path.
- Degrade to SPA on failure, as above.

## Scope

In scope (phase 1):

1. `renderToString(renderable, url, flags)`: pure, synchronous, no DOM, no Effect
   runtime. The serializer core.
2. `renderRequest(program, request): Effect<{ html, headMetadata }>`: the
   `'Ssr'`-mode wrapper that runs `serverFlags` once and embeds the same flags.
3. `renderShell(...)`: assembles the document (HTML container plus encoded flags).
4. A `{ hydrate: true }` boot path on `Runtime.run`.
5. The `'Spa' | 'Ssr'` discriminated program config and `serverFlags`.

Out of scope (phase 2 or later):

- `ServerCommand` as typed client/server RPC. Phase 2, possibly its own track.
- Model serialization over the wire. Not needed by phase 1, and (see the
  ServerCommand section) not needed by ServerCommand either; the earlier claim is
  retracted.
- Streaming SSR, selective hydration, per-route render modes.
- The website prerender swap (sequencing step 6; uses the primitive but ships
  separately and changes no deploy output).
- Any shipped server adapter and any deployment tooling. Developers write their
  own server entry.

## Flags: a discriminated config on mode

This supersedes the original brief, which treated flags as a value passed to
`renderToString` and embedded separately.

`flags` is an `Effect<Flags>` that produces a value, and in a pure SPA it is where
browser-only reads (localStorage, time, random) happen. That collides with SSR,
because the server cannot run a browser Effect, and hydration requires the client
to start from the **same** flags the server used.

Resolution: make the program config a discriminated union on mode. One `Flags`
type throughout (there is no separate `ServerFlags` type). What changes is where
flags are produced.

```ts
// SPA: produce flags in the browser at boot
{ mode: 'Spa', Flags: FlagsSchema, flags: Effect<Flags>, init, update, view, ... }

// SSR: produce flags on the server from the request
{ mode: 'Ssr', Flags: FlagsSchema, serverFlags: (request) => Effect<Flags, FlagsError, ServerServices>, init, update, view, ... }
```

The current `makeProgram` config destructures a single `flags` field (the Effect,
aliased internally as `resolveFlags`). The change introduces `mode` and splits
that one field: `'Spa'` keeps `flags`, `'Ssr'` replaces it with `serverFlags`.

- In `'Ssr'` mode there is no client `flags` Effect. At hydration the client
  **decodes the server's flags** from the embedded `<script>` and runs `init` with
  them. It does not, and must not, recompute flags, or it would diverge from the
  server's HTML.
- `serverFlags` receives only the request, so it can read cookies, headers,
  session, and fetch data, but it physically cannot reach localStorage. This turns
  the SPA footgun (a localStorage read that silently no-ops under SSR) into a
  design constraint surfaced by the type.
- Migration rule for browser-only state: if a flag must influence the
  server-rendered HTML, it has to be readable from the HTTP request, so move it to
  a **cookie** (server-readable). If it genuinely cannot be on the request (for
  example viewport width), it does not belong in `init` under SSR. Bring it in
  after boot as a Subscription or Message. Do not add a second client-side flags
  channel in SSR mode; that reintroduces the divergence hydration forbids.

## Type-boundary enforcement

`serverFlags` (and later, ServerCommand handlers) must be unable to touch browser
globals. The mechanisms, in order of strength:

1. **Compile the server unit without the DOM lib.** TypeScript decides DOM versus
   Node per tsconfig/project, not per file. Put `serverFlags` in a server-only
   module whose tsconfig sets `lib` without `"DOM"` and includes `@types/node`.
   Then `window` / `document` / `localStorage` are not declared, and referencing
   them is a compile error. The hard rule: **`serverFlags` is defined in the
   server unit, never in a file that also imports the view.** In SSR you already
   have a separate server entry, so this falls out of the architecture rather than
   being extra structure.
2. **Pin the Effect requirement channel.** Type `serverFlags` as
   `(request) => Effect<Flags, FlagsError, ServerServices>`. Because R is
   contravariant, using any capability outside `ServerServices` widens R and fails
   the annotation. This catches service-shaped browser access at the signature. It
   does not catch ambient globals; that is what (1) is for.
3. Optional CI backstop: eslint `no-restricted-globals` on server files.

## renderToString and renderRequest (the request wrapper)

Keep the pure core; add an Effect wrapper above it. This reconciles the original
open-question #4 ("server entry Effect runtime") by splitting the concern in two.

- `renderToString(renderable, url, flags)`: pure, synchronous, no DOM, no Effect
  runtime. This is the serializer core. The "no Effect runtime required" property
  holds for this function. Used directly for build-time SSG and in tests.
- `renderRequest(program, request): Effect<{ html, headMetadata }>`: the
  `'Ssr'`-mode wrapper. It runs `serverFlags(request)` once, then passes the
  result to both `init` (via `renderToString`) and the embedded flags `<script>`,
  so the rendered flags and the embedded flags are the **same value**. This closes
  a desync hole in the original brief, where the developer produced flags and the
  shell embedded flags as two separate steps that could drift. This function is
  Effect-returning because `serverFlags` is an Effect.

The server entry move inside `renderToString`:

```ts
const [model] = init(flags, url) // pure; same init both sides
const boundaryRegistry = createHtmlBoundaryRegistry()
beginHtmlRender(boundaryRegistry)
setHtmlRuntime(noOpDispatchSync, Context.empty(), boundaryRegistry)
let document: Document
try {
  document = view(model)
} finally {
  clearHtmlRuntime()
}
return {
  body: serialize(document.body), // walk, drop listeners
  title: document.title,
  canonical: document.canonical,
  ogUrl: document.ogUrl,
}
```

No `Effect.runSync`, no live `Dispatch` service. The view layer is synchronous on
the perf branch; the only requirement is an active runtime frame because
constructors call `requireDispatch()` (handler-free elements skip it, but real
views have handlers). `noOpDispatchSync` is a `(message: unknown) => void` no-op,
and the captured context is `Context.empty()` because nothing mounts on the
server. The init Commands are discarded on the server in phase 1 (no
`ServerCommand` yet).

Document metadata (title, canonical, ogUrl) already lives on the `Document` the
view returns. `renderToString` returns a struct that includes it, so `renderShell`
can populate `<head>` from the same source the client feeds to
`applyDocumentMetadata`. A thin body-only convenience wrapper can sit on top of
the struct-returning primitive if call sites want just the string.

## Resolved open questions

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
4. **Server entry Effect runtime.** Split into two functions (see above).
   `renderToString` is fully synchronous: it pushes a runtime frame with a no-op
   dispatch and `Context.empty()`, calls `view(model)`, and walks the vnode.
   Nothing mounts on the server, so the captured context is inert; it is callable
   from plain async code. `renderRequest` is the Effect-returning wrapper that
   exists only because `serverFlags` is an Effect; it calls `renderToString`
   internally. The "no Effect runtime required" property is a property of
   `renderToString`, not of the whole request path.
5. **Website migration.** See the Deployment section. The prerender script does
   far more than emit HTML (OG images, sitemap, llms.txt, markdown extracts,
   Pagefind). Only its headless-Chromium HTML-capture step is swapped for direct
   `renderToString` calls at build time. This is sequencing step 6 and ships
   separately from the primitive; nothing in phase 1 depends on it.

## Component 1: renderToString (the serializer)

### Module layout

- `packages/foldkit/src/server/server.ts`: implementation.
- `packages/foldkit/src/server/index.ts`: barrel (`export * from './server.js'`).
- `packages/foldkit/src/server/public.ts`: public surface
  (`export { renderToString, renderRequest, renderShell } from './index.js'` plus
  types).
- `packages/foldkit/src/index.ts`: add `export * as Server from './server/public.js'`.
- `packages/foldkit/package.json`: add the `./server` subpath export, mirroring
  the existing entries.

### Signature

```ts
export const renderToString = <Model, Message, Flags>(
  renderable: Renderable<Model, Message, Flags>, // render-only descriptor; see note
  url: Url,
  flags: Flags,
): Readonly<{ body: string; title: string; canonical?: string; ogUrl?: string }>
```

Note on the first argument: `MakeRuntimeReturn` currently exposes only
`{ runtimeId, start }`, which is the live-boot closure and is the wrong shape for
a pure render. `makeProgram` should additionally expose the pure pieces
`renderToString` needs (`init`, `view`, and the `Flags`/`Model` codecs) via a
render-only descriptor, so `renderToString` can call `init(flags, url)` and
`view(model)` without constructing a browser runtime. This keeps `renderToString`
decoupled from `start`, HMR, and DevTools. The exact shape of this descriptor is
open spike #3.

### The serializer

These details are carried over from the original brief and remain correct.

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
  - Emit `data.style` object as `style="k:v;…"` (camelCase to kebab-case).
  - Emit `data.dataset` as `data-*`.
  - Map `data.props` (DOM properties) to attributes via a fixed table (below).
  - **Drop `data.on` and `data.hook`.** No HTML representation.
  - Children: recurse. If `props.innerHTML` is set, emit it raw and skip children.
  - Void elements: no close tag, no children. Everything else gets `</tag>`.

**props to attribute mapping.** This is the one fidelity-sensitive table. The
perf-branch builder routes a known set through `updateDataProps` (for example
`Action -> props.action`, `Formaction -> props.formAction`, plus `value`,
`checked`, `disabled`, `selected`, `innerHTML`, `className`, `htmlFor`). The
serializer must mirror the builder's attribute-versus-prop routing exactly:

- `value -> value="…"`, `formAction -> formaction="…"`, `action -> action="…"`.
- boolean props (`checked`, `disabled`, `selected`, `readOnly`, …) -> bare
  attribute when truthy, omitted when falsy.
- `className -> class`, `htmlFor -> for`.
- `innerHTML` -> raw child content.

Do not hand-maintain this table from memory. **Derive it by auditing every
`updateDataProps` call site in `html/index.ts`** and lock it with a test that
enumerates all element constructors and asserts a round-trip (see Testing).

**Escaping.** Text: `&`, `<`, `>`. Attribute values: `&`, `"`. Use a single small
escape helper; never interpolate unescaped strings except `innerHTML`.

Estimated size: roughly 200 to 300 lines plus a substantial test suite. This is
the easy, well-bounded half of phase 1.

## Component 2: hydrate boot (`Runtime.run(program, { hydrate: true })`)

This is the hard half and the riskiest piece. Spike the walk before committing to
the approach below.

### Wiring `{ hydrate: true }` through

- `run(program, options?: { hydrate?: boolean })`. Thread `hydrate` into the boot
  closure by extending `start(hmrModel?, bootOptions?: { hydrate?: boolean })` on
  `MakeRuntimeReturn`, or have `run` pass it in. HMR and hydrate are independent;
  hydrate is a production concern, HMR a dev concern.
- Only the **initial render** branch changes. Steady state (the render loop, the
  message queue, subscriptions, managed resources) is identical to today.

### Boot sequence in hydrate mode

1. **Decode flags from the DOM.** Read `#foldkit-flags` text, JSON-parse, decode
   with the `Flags` codec (`Schema.decodeUnknown`). On failure, throw with a clear
   message (the server and client disagree on the flags shape).
2. **Run `init(flags, url)`** with `url` from `window.location`. Same `init`, same
   Model the server produced.
3. **Hydrate instead of patch.** Today's first render does
   `patch(toVNode(container), nextVNode)` inside `patchVNode`, which
   rebuilds/reconciles. Hydrate mode replaces only this step with a structural
   walk (below).
4. **Run the init Commands** exactly as today.
5. Hand off to the existing render loop. From here everything is normal SPA.

### The hydration walk: decision (open spike #1)

Two candidate approaches:

- **A. Lean on snabbdom.** `patch(toVNode(container.firstChild), nextVNode)`.
  Reuses the existing first-mount machinery; the `eventListenersModule` and
  `propsModule` `update` hooks attach handlers, and boundary-wrapped dispatchers
  are already baked into the new vnode's `on` data. Cheapest. But snabbdom
  **silently reconciles** on mismatch (recreates DOM) rather than throwing, and it
  is a full diff, not a pure listener-attach. Fails the "throw on mismatch" and
  "attach without re-render" invariants.

- **B. Custom hydration walk (recommended).** Walk the new vnode tree in parallel
  with the existing DOM:
  - Assert structural match per node (tag, then children arity). On mismatch,
    **throw** with the DOM path and expected-versus-found tags.
  - Set each vnode's `.elm` to the corresponding existing DOM node (no
    `createElement`).
  - Attach listeners and reconcile properties by invoking the relevant snabbdom
    module `create` hooks (`eventListenersModule`, `propsModule`, plus
    `attributes` / `class` / `style` / `dataset` for any attribute the server
    could not represent) against the now-`.elm`-bound vnode. This binds handlers
    to the server DOM without recreating it.
  - Store the result as the runtime's current vnode so subsequent renders patch
    against it normally.

Recommend **B**: it is the only path that satisfies the invariants (throw on
mismatch, attach without re-render). A is the documented fallback if B proves
disproportionately costly. A is also what **SPA-prerender** already gets for free
via today's `run` (replaces prerendered DOM on boot). So prerender keeps A;
SSR-hydrate uses B. Spike B on one real example before committing.

### Submodel / boundary considerations

The hydrate boot must establish the **same** frame the live render uses:
`beginHtmlRender(boundaryRegistry)` then `setHtmlRuntime(realDispatchSync,
runtimeContext, boundaryRegistry)` around the `view(model)` call that produces the
vnode tree to bind. Because `view` runs inside the real Effect runtime here,
`requireRuntimeContext()` returns a populated context (Mount integrations fork
Effects against live services). This is the asymmetry with `renderToString`, which
uses `Context.empty()`. The per-boundary dispatchers are resolved at event-fire
time, so binding handlers means binding the boundary-wrapped dispatcher, not a
flat one; using the same `setHtmlRuntime` frame gets this right by construction.

## Component 3: shell helper

A small function the developer's request handler calls to assemble the response:

```ts
export const renderShell = <Flags>(args: Readonly<{
  html: string                       // from renderToString
  flags: Flags
  FlagsSchema: Schema.Codec<Flags, ...>
  head?: string                      // title, meta, links, script tags
  containerId?: string               // default "app"
}>) => string
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

`encodedFlags` is `JSON.stringify(Schema.encodeSync(FlagsSchema)(flags))`,
HTML-escaped for the `<script>` context (escape `<` to avoid `</script>`
injection). The helper does not inject the app bundle `<script>`; the developer
controls that (and asset hashing). Lives in `server/server.ts` alongside
`renderToString`.

In `'Ssr'` mode the developer typically does not call `renderShell` and
`renderToString` separately. `renderRequest` calls them in sequence so the
rendered flags and the embedded flags are guaranteed identical; `head` is
populated from the returned `headMetadata`.

## Data fetching for per-request / per-user pages

- Phase 1 mechanism: `serverFlags(request)` reads the session (cookie/token),
  fetches the data, and returns it in `Flags`. `init(flags, url)` builds the
  loaded Model directly, so `view` renders populated HTML with no loading state
  and no client fetch on boot. The client decodes the same flags and rebuilds the
  same Model. This works precisely because `init` is deterministic, so only flags
  need to ship, not the Model.
- Known cost: the data round-trips (rendered HTML plus the flags JSON), so it is
  effectively sent twice. Keep flags to what `view` needs. Never put secrets in
  flags (visible in page source). Flags must be Schema-encodable.
- This is the common SSR use case (per-request, sometimes per-user). The
  alternative, render the shell and fetch on the client with a spinner, is simpler
  and right when first-paint-with-data and SEO-for-dynamic-content do not matter.

## Backend mechanics (context for the example and phase 2)

- Identity rides the request (session cookie or Authorization token), re-resolved
  per request. The server keeps nothing in memory between requests; the session
  store and DB are the persistent state.
- Effect-idiomatic access: DB and external services are `Context.Tag` services
  provided by a `Layer` built once at startup (pool via `Layer.scoped` plus
  `Effect.acquireRelease`). Secrets via `Effect.Config`, server-side only. A
  per-request `CurrentUser` is provided by middleware that reads the cookie. `init`
  is pure and never touches the DB; I/O is in `serverFlags` (before init) or
  ServerCommand handlers (after boot).
- Topology: the simplest option is one Effect HTTP server (`@effect/platform`)
  holding the DB layer and serving both the document route and (later) the
  ServerCommand routes, a monolith / BFF. Alternatives: a thin frontend server
  forwarding to an existing API; or edge with a serverless-friendly DB. Foldkit
  supplies the render primitive and (later) the RPC protocol; the developer
  supplies the server, routes, DB layer, and auth.

## Division of labor

`serverFlags`/flags seed the **initial** Model into the first HTML. ServerCommand
is the **ongoing** post-boot client/server effect channel. They are complementary,
not competing.

## ServerCommand (phase 2, corrected model)

This supersedes both the original brief and an earlier draft, which framed
`ServerCommand` as "run Commands on the server and settle the Model before
rendering." That framing is wrong. The correct model:

- A `ServerCommand` is a Command that **executes on the server and returns a
  Message to the client over the wire**. The client dispatches it, the runtime
  ships it to the server, the server runs the effect (DB, privileged work), and
  responds with a Message. That Message lands in the client queue and `update`
  folds it **on the client**. `update` never runs on the server.
- This is typed RPC / "server functions" (Remix actions, server actions, the tRPC
  shape), integrated into the Command system, with Schema types shared across the
  wire.
- Consequences: it does not settle a Model on the server, so it does not require
  Model-over-the-wire serialization (the earlier claim, now retracted).
  ServerCommands run after init (post-boot), so the server renders the init/flags
  state and the client hydrates the same init/flags state. They match with flags
  alone.
- It needs built-in failure modes that a local Command does not: timeout, network
  failure, decode failure, each producing a `Failed*` Message. The handler runs in
  an HTTP request path, so it also needs the do-not-hang-a-worker discipline. This
  is exactly why ServerCommand is its own type and not a flag on a Command.
- The result Message must be Schema-serializable (it crosses the wire).
- Scope: this is a whole RPC layer (transport endpoint, argument/Message
  serialization, handler registry, auth). Much larger than `renderToString`. Phase
  2 at the earliest, possibly its own track.

## Deployment

- The website should stay SSG, because its content is the same for everyone. The
  realistic "website with SSR" is using `renderToString` at **build time** to
  replace the Playwright/Chromium HTML capture in `scripts/prerender.ts`. That is
  faster, deterministic, removes the Chromium dependency, and enables clean
  hydration, while the deploy stays byte-for-byte the same (static files to the
  Vercel CDN, prebuilt output). The prerender script still owns OG images,
  sitemap, llms.txt, markdown extracts, and Pagefind; only its HTML-capture step
  changes.
- Route orchestration ("render all routes to disk") stays app-level glue unless a
  `renderRoutes`-style SSG helper is added later. Phase 1 ships only the
  primitive.
- A genuinely dynamic app's deploy grows a function or server for HTML routes,
  with static assets still on the CDN, plus server-side env/secrets and
  degrade-to-SPA. On the current Vercel pipeline this is mostly emitting a `.func`
  directory and changing the generated routing config to send HTML to the
  function.

### Deployment tooling (future, optional, hedge on specifics)

Alchemy (TypeScript-native IaC, strong on Cloudflare, pairs with Effect; not an
official Effect package) is a candidate for erasing deploy glue: one typed program
provisions the compute (Worker/function), static assets, DB, secrets, DNS, and
feeds bindings straight into `Effect.Config`/Layers, with per-PR preview
environments. Boundaries: it changes nothing about the SSR architecture, it is an
app-author concern, and **core must not depend on it**. Its natural home is an
optional `create-foldkit-app` template later. Verify the current API before
relying on it.

## File-by-file work breakdown

New:

- `src/server/server.ts`: `renderToString`, `renderRequest`, `renderShell`, the
  serializer, the escape helpers, the void-element set, the props-to-attr table.
- `src/server/index.ts`, `src/server/public.ts`: barrels.
- `src/server/server.test.ts`: serializer plus round-trip tests.
- `src/runtime/hydrate.ts`: the hydration walk (approach B) and flag decode.
- `src/runtime/hydrate.test.ts`.
- A server-only compilation unit (its own `tsconfig`) with `lib` excluding
  `"DOM"` and including `@types/node`, housing `serverFlags` and any code on the
  request path. This is what enforces the type boundary; see that section.

Modified:

- `src/runtime/runtime.ts`: introduce the `'Spa' | 'Ssr'` discriminated config and
  `serverFlags` in `makeProgram`; `run(program, { hydrate })`; thread `hydrate`
  into `start`; branch the initial render to `hydrate(...)`. Expose the
  render-only descriptor (`init`, `view`, codecs) for `renderToString` (open spike
  #3).
- `src/runtime/public.ts`: export any new hydrate and config types.
- `src/index.ts`: `export * as Server`.
- `package.json`: `./server` subpath export.
- `src/html/index.ts`: the server and hydrate modules import the same
  `__`-prefixed internal entry `runtime.ts` already uses (`__setRuntime`,
  `__clearRuntime`, `__beginRender`, `__createBoundaryRegistry`). Confirm these are
  reachable from the new modules; no further promotion of private symbols is
  expected for the render-frame functions.

Examples / docs (separate, after the primitives land):

- An SSR example under `examples/` with an Effect HTTP server, auth middleware
  providing `CurrentUser`, a `serverFlags` doing a per-user fetch, the document
  route, and degrade-to-SPA.
- Update `packages/website/src/page/whatAboutSsr.ts` to move per-request SSR from
  "on the roadmap" to shipped, once it is.

## Testing strategy

- **Serializer unit tests.** Each vnode feature in isolation: attrs, class merge
  (sel + `data.class` + attrs), style camel-to-kebab, dataset, void elements,
  text/attr escaping, comment/null, `innerHTML` raw, SVG subtree with root `xmlns`
  and explicit closes, nested children, keys (no HTML effect).
- **Round-trip / fidelity test (the keystone).** Enumerate every element
  constructor in `html/index.ts`. For each, render via `renderToString`, parse the
  HTML in jsdom/happy-dom, lift via `toVNode`, and assert the structure matches the
  vnode `view` produced on the client. This is the contract that prevents
  hydration mismatch and pins the props-to-attr table.
- **Hydration tests.** Render server HTML, mount it, run hydrate, assert: no DOM
  nodes recreated (identity preserved), listeners fire and dispatch through the
  correct (boundary-wrapped) dispatcher, init Commands run, and a deliberately
  corrupted DOM throws with a useful message.
- **Submodel hydration test.** A view with an `h.submodel` / `Ui.*` child: assert
  a child-originated event routes through `toParentMessage` after hydration,
  proving boundary dispatch is rebound correctly.

## Sequencing (once the base lands)

1. Add the `'Spa' | 'Ssr'` discriminated config and `serverFlags`. Establish the
   server-only compilation unit (tsconfig without DOM lib) and the type-boundary
   rule.
2. Build `renderToString` (pure serializer core) plus `renderShell`.
   Self-contained and testable.
3. Build `renderRequest` (the Effect wrapper running `serverFlags` and embedding
   the same flags).
4. Spike the hydration walk (approach B) on one real example, then implement
   hydrate boot and `run(program, { hydrate: true })`.
5. Add an SSR example under `examples/` (Effect HTTP server, auth middleware
   providing `CurrentUser`, a `serverFlags` doing a per-user fetch, the document
   route, degrade-to-SPA).
6. Separately, swap the website prerender's Chromium HTML capture for
   `renderToString` at build time. No deploy change.

## Open spikes and decisions still needed

1. **Hydration walk approach B versus A.** Resolve by spike (no DOM recreation,
   listeners attach, throw on mismatch).
2. **Where `serverFlags` lives in the config type** so it stays in the server
   compilation unit while `init`/`update`/`view` are shared. Likely: define
   `serverFlags` in the server module and pass it into the program wiring, rather
   than inline in a view-importing file.
3. **Shape of the render-only descriptor** `makeProgram` exposes (`init`, `view`,
   codecs) so `renderToString` does not construct a browser runtime.
4. **Whether to expose `renderToString` (flags-taking, sync) and `renderRequest`
   (request-taking, Effect) as two functions or one.** Recommendation: two, to
   keep the pure core pure.

## Invariants to preserve

- `init`/`update`/`view` keep their shapes and purity. `init` stays `(flags, url)`
  everywhere. `update` is synchronous and client-only. Messages stay facts; side
  effects stay in Commands.
- `view` is a pure function of the Model, the basis for structural hydration.
- SPA and SPA-prerender behavior unchanged. SSR is opt-in via `mode` and
  `{ hydrate: true }`.
- Core never depends on a server framework or a deploy tool.
