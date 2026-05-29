# Handoff prompt: Foldkit SSR

You are picking up the design and implementation of server-side rendering (SSR)
for Foldkit. This prompt is the source of truth for what has been decided. A
companion file, `internal/plans/ssr-phase-1-plan.md`, holds the detailed phase-1
mechanics (serializer, hydration walk, module layout, testing). Where this prompt
and that file disagree, this prompt wins: the conversation that produced it
revised several things the file still states the old way. Your first documentation
task is to reconcile that file with the decisions below.

## Your task

1. Do not start implementing until the base branch has landed (see Base). Until
   then, the deliverable is a corrected, complete plan.
2. Reconcile `internal/plans/ssr-phase-1-plan.md` with the decisions in this
   prompt. Specifically rewrite its flags section, its open-question #4, and its
   `ServerCommand` framing, and add the new sections (operating model, deployment,
   data fetching, type-boundary enforcement).
3. Once the base lands, implement phase 1 in the order given under Sequencing.
4. Treat the items under "Aligned design decisions" as settled. Treat the items
   under "Open spikes" as genuinely open: resolve them with a short spike or by
   asking, not by guessing.

## Branch and workflow

- Develop on `claude/foldkit-ssr-plan-fREmW`. Create it from the base if needed.
- Conventional Commits, scope `foldkit` (or `website` for site work). No Claude
  co-author lines. Squash-merge only. Do not open a PR unless asked.
- Follow `CLAUDE.md` exactly: Effect-only, Schema types, `Match` over `switch`,
  `Option` over sentinels, discriminated unions over booleans, no `T[]`, no
  bracket indexing, no em dashes in prose, section-header comments only.

## Base (blocker, do not start coding before this)

This work targets the **`devin/perf-and-submodel`** view layer, NOT current
`main`. That branch is one breaking `feat!` that makes the view layer synchronous
and adds first-class Submodels. SSR rewrites the exact files it touches, so:

- Do not rebase or implement until `devin/perf-and-submodel` merges. Building
  against today's base encodes obsolete entry moves and will conflict hard.
- Two facts from that branch shape everything:
  1. `Html = VNode | null` (synchronous). Element constructors read dispatch and
     runtime context from a module-level singleton (`html/runtimeSingleton.ts`:
     `setRuntime` / `clearRuntime` / `requireDispatch` / `requireRuntimeContext`).
     A rendered tree is fully materialized (no thunk module).
  2. Submodels add a boundary layer (`html/boundary.ts`, `html/submodel.ts`,
     `html/childAttribute.ts`). Dispatch is late-bound per boundary via a
     `BoundaryRegistry`, resolved at event-fire time. Listeners are dropped on the
     server, but hydration must re-establish the same boundary frame, not a flat
     dispatch.
- The live render seam both SSR primitives hook into is `runtime.ts`'s `render`
  (perf branch ~932-985): `beginHtmlRender(registry)` +
  `setHtmlRuntime(dispatchSync, runtimeContext, registry)` around `view(model)`,
  then `patch(toVNode(container) | currentVNode, nextVNode)`.

## The mental model (read this before the details)

- SSR moves the **first render** to the server so the first HTML response
  contains real content (fast first paint, crawlable), instead of an empty SPA
  shell. The JS still loads as a separate request afterward and hydrates.
- The app's live runtime stays in the browser. The server does NOT host a running
  app and **never runs `update`**. On the server it only ever runs
  `serverFlags -> init -> view -> serialize` per request, then forgets everything.
  The server is stateless; identity and data come from the request each time.
- Hydration is safe because `view` is a pure function of the Model. Same Model in,
  same tree out, so the client can adopt the server's HTML instead of rebuilding.
- SSR is an **enhancement, never a hard dependency**. If server render fails, send
  the plain SPA shell and let the client boot normally. A render failure degrades
  to "it's an SPA this request," not an outage.

## Aligned design decisions

### Phasing overview

- **Phase 1 (this branch):** `renderToString` + a request-driven render wrapper +
  hydrate boot + shell helper + the `'Spa' | 'Ssr'` flags config. Enough to
  server-render a page with per-request data (via flags) and hydrate it cleanly.
- **Phase 2:** `ServerCommand` as typed client/server RPC (see below). Large.
- **Later / out of scope:** streaming SSR, selective hydration, per-route render
  modes, website migration, any shipped server adapter, deployment tooling.

### Flags: a discriminated config on mode (this supersedes the old plan)

The old plan treated flags as a value passed to `renderToString` and embedded
separately. Replace that. `flags` is an `Effect<Flags>` that produces a value, and
in a pure SPA it is where browser-only reads (localStorage, time, random) happen.
That collides with SSR, because the server cannot run a browser Effect, and
hydration requires the client to start from the **same** flags the server used.

Resolution: make the program config a discriminated union on mode. One `Flags`
type throughout (no `ServerFlags` type). What changes is where flags are produced.

```ts
// SPA: produce flags in the browser at boot
{ mode: 'Spa', Flags: FlagsSchema, flags: Effect<Flags>, init, update, view }

// SSR: produce flags on the server from the request
{ mode: 'Ssr', Flags: FlagsSchema, serverFlags: (request) => Effect<Flags>, init, update, view }
```

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
  a **cookie** (server-readable). If it genuinely cannot be on the request (e.g.
  viewport width), it does not belong in init under SSR. Bring it in after boot as
  a Subscription or Message. Do NOT add a second client-side flags channel in SSR
  mode; that reintroduces the divergence hydration forbids.

### renderToString and the request wrapper (reconciles old open-question #4)

Keep the pure core, add an Effect wrapper above it:

- `renderToString(program, url, flags): string` — pure, synchronous, no DOM, no
  Effect runtime. This is the serializer core. Open-question #4 ("no Effect
  runtime required") holds for THIS function. Used directly for build-time SSG and
  in tests.
- `renderRequest(program, request): Effect<{ html, headMetadata }>` — the
  `'Ssr'`-mode wrapper. It runs `serverFlags(request)` once, passes the result to
  both `init` (via `renderToString`) and the embedded flags `<script>`, so the
  rendered flags and the embedded flags are the **same value**. This closes a
  desync hole in the old plan (where the developer produced flags and the shell
  embedded flags as two separate steps that could drift). This function is
  Effect-returning because `serverFlags` is an Effect.
- The entry move inside `renderToString`: `init(flags, url)` ->
  `beginHtmlRender(registry)` + `setHtmlRuntime(noOpDispatchSync, Context.empty(),
registry)` around `view(model)` -> serialize `document.body`. Drop `data.on` and
  `data.hook`. Discard init Commands on the server (no `ServerCommand` in phase 1).
- Document metadata (title, canonical, ogUrl) lives on the returned `Document`.
  The canonical primitive should return a struct including that metadata so the
  shell can populate `<head>` from the same source the client uses.

The serializer details (sel parsing, attrs/class/style/dataset, the
fidelity-sensitive props->attribute table derived from `updateDataProps` call
sites, void elements, escaping, SVG with explicit close tags and root `xmlns`,
comment/null) are correct as written in `ssr-phase-1-plan.md`. Keep them.

### Type-boundary enforcement (new section to add)

`serverFlags` (and, later, ServerCommand handlers) must be unable to touch browser
globals. The mechanisms, in order of strength:

1. **Compile the server unit without the DOM lib.** TypeScript decides DOM-vs-node
   per tsconfig/project, not per file. Put `serverFlags` in a server-only module
   whose tsconfig sets `lib` without `"DOM"` and includes `@types/node`. Then
   `window`/`document`/`localStorage` are not declared and referencing them is a
   compile error. The hard rule: **`serverFlags` is defined in the server unit,
   never in a file that also imports the view.** In SSR you already have a separate
   server entry, so this falls out of the architecture rather than being extra
   structure.
2. **Pin the Effect requirement channel.** Type `serverFlags` as
   `(request) => Effect<Flags, FlagsError, ServerServices>`. Because R is
   contravariant, using any capability outside `ServerServices` widens R and fails
   the annotation. This catches service-shaped browser access at the signature.
   It does not catch ambient globals; that is what (1) is for.
3. Optional CI backstop: eslint `no-restricted-globals` on server files.

### Hydrate boot (`Runtime.run(program, { hydrate: true })`)

- Thread `hydrate` into the boot closure (extend `start`). Only the initial render
  branch changes; steady state is identical.
- Boot sequence in hydrate mode: decode flags from `#foldkit-flags` (throw on
  decode failure), run `init(flags, url)` with `url` from `window.location`,
  hydrate against existing DOM instead of `patch(toVNode(container), ...)`, then
  run init Commands, then hand off to the normal render loop.
- Recommended approach: a custom hydration walk (approach B in the plan file) that
  asserts structure and **throws on mismatch**, sets each vnode's `.elm` from the
  existing DOM, and attaches listeners via the snabbdom module create hooks without
  recreating DOM. This is the only path that satisfies both "throw on mismatch" and
  "attach without re-render." Approach A (`patch(toVNode(container), nextVNode)`,
  today's lossy reconcile) is the documented fallback and is what SPA-prerender
  keeps. **Spike B on one real example before committing.**
- Establish the same boundary frame the live render uses (`beginHtmlRender` +
  `setHtmlRuntime` with the real dispatch and a populated runtime context) so
  per-boundary Submodel dispatchers bind correctly.

### Shell helper

`renderShell({ html, flags, FlagsSchema, head?, containerId? }): string` emits the
document: `<div id="app">{html}</div>` then
`<script type="application/json" id="foldkit-flags">{encodedFlags}</script>` at the
end of `<body>`. `encodedFlags` is `Schema.encodeSync(FlagsSchema)` then JSON,
HTML-escaped for the script context (escape `<` to avoid `</script>` injection).
The helper does NOT inject the app bundle script; the developer controls that.

### Operating model (new section to add)

- The server runs a pure per-request render and is stateless. No per-user state in
  module globals; identity is re-resolved from the request each time. This is what
  the Elm architecture already guarantees (pure view, effects in Commands, Model as
  single source of truth), so statelessness is free if you do not cheat.
- Deployment spectrum, and the primitive must be agnostic to all three: always-on
  Node process; serverless functions (cold starts); edge runtimes (V8 isolates, no
  full Node, no DOM, which is why the server unit must avoid Node-and-DOM-specific
  APIs).
- Degrade-to-SPA on failure, as above.

### Data fetching for per-request / per-user pages

- Phase 1 mechanism: `serverFlags(request)` reads the session (cookie/token),
  fetches the data, returns it in `Flags`. `init(flags, url)` builds the loaded
  Model directly, so `view` renders populated HTML with no loading state and no
  client fetch on boot. The client decodes the same flags and rebuilds the same
  Model. This works precisely because `init` is deterministic, so only flags need
  to ship, not the Model.
- Known cost: the data round-trips (rendered HTML plus the flags JSON), so it is
  effectively sent twice. Keep flags to what `view` needs. Never put secrets in
  flags (visible in page source). Flags must be Schema-encodable.
- This is the common SSR use case (per-request, sometimes per-user). The
  alternative, render the shell and fetch on the client with a spinner, is simpler
  and right when first-paint-with-data and SEO-for-dynamic-content do not matter.

### ServerCommand (phase 2, corrected model, supersedes the old plan)

The old plan and an earlier draft framed `ServerCommand` as "run Commands on the
server and settle the Model before rendering." That is WRONG. The correct model:

- A `ServerCommand` is a Command that **executes on the server and returns a
  Message to the client over the wire**. The client dispatches it, the runtime
  ships it to the server, the server runs the effect (DB, privileged work), and
  responds with a Message. That Message lands in the client queue and `update`
  folds it **on the client**. `update` never runs on the server.
- This is typed RPC / "server functions" (Remix actions, server actions, tRPC
  shape), integrated into the Command system, with Schema types shared across the
  wire.
- Consequences: it does NOT settle a Model on the server, so it does NOT require
  Model-over-the-wire serialization (an earlier claim, now retracted). ServerCommands
  run after init (post-boot), so the server renders the init/flags state and the
  client hydrates the same init/flags state. They match with flags alone.
- It needs built-in failure modes that a local Command does not: timeout, network
  failure, decode failure, each producing a `Failed*` Message. The handler runs in
  an HTTP request path, so it also needs the do-not-hang-a-worker discipline. This
  is exactly why ServerCommand is its own type and not a flag on a Command.
- The result Message must be Schema-serializable (it crosses the wire).
- Scope: this is a whole RPC layer (transport endpoint, arg/Message serialization,
  handler registry, auth). Much larger than `renderToString`. Phase 2 at the
  earliest, possibly its own track.

### Division of labor

`serverFlags`/flags seed the **initial** Model into the first HTML. ServerCommand
is the **ongoing** post-boot client/server effect channel. They are complementary,
not competing.

### Backend mechanics (context for examples and phase 2)

- Identity rides the request (session cookie or Authorization token), re-resolved
  per request. Server keeps nothing in memory between requests; the session store
  and DB are the persistent state.
- Effect-idiomatic access: DB and external services are `Context.Tag` services
  provided by a `Layer` built once at startup (pool via `Layer.scoped` +
  `Effect.acquireRelease`). Secrets via `Effect.Config`, server-side only.
  Per-request `CurrentUser` provided by a middleware that reads the cookie. `init`
  is pure and never touches the DB; I/O is in `serverFlags` (before init) or
  ServerCommand handlers (after boot).
- Topology: simplest is one Effect HTTP server (`@effect/platform`) holding the DB
  layer and serving both the document route and the ServerCommand routes (a
  monolith / BFF). Alternatives: a thin frontend server forwarding to an existing
  API; or edge with a serverless-friendly DB. Foldkit supplies the render primitive
  and (later) the RPC protocol; the developer supplies the server, routes, DB
  layer, and auth.

### Deployment (new section to add)

- The website should stay SSG, because its content is the same for everyone. The
  realistic "website with SSR" is using `renderToString` at **build time** to
  replace the Playwright/Chromium HTML capture in `scripts/prerender.ts`. That is
  faster, deterministic, removes the Chromium dependency, and enables clean
  hydration, while the deploy stays byte-for-byte the same (static files to the
  Vercel CDN, prebuilt output). The prerender script still owns OG images, sitemap,
  llms.txt, markdown extracts, and Pagefind; only its HTML-capture step changes.
- Route orchestration ("render all routes to disk") stays app-level glue unless a
  `renderRoutes`-style SSG helper is added later. Phase 1 ships only the primitive.
- A genuinely dynamic app's deploy grows a function or server for HTML routes,
  with static assets still on the CDN, plus server-side env/secrets and
  degrade-to-SPA. On the current Vercel pipeline this is mostly emitting a `.func`
  directory and changing the generated routing config to send HTML to the function.

### Deployment tooling (future, optional, hedge on specifics)

Alchemy (TypeScript-native IaC, strong on Cloudflare, pairs with Effect; not an
official Effect package) is a candidate for erasing deploy glue: one typed program
provisions the compute (Worker/function), static assets, DB, secrets, DNS, and
feeds bindings straight into `Effect.Config`/Layers, with per-PR preview
environments. Boundaries: it changes nothing about the SSR architecture, it is an
app-author concern, and **core must not depend on it**. Natural home is an optional
`create-foldkit-app` template later. Verify current API before relying on it.

## Sequencing (once the base lands)

1. Add the `'Spa' | 'Ssr'` discriminated config and `serverFlags`. Establish the
   server-only compilation unit (tsconfig without DOM lib) and the type-boundary
   rule.
2. Build `renderToString` (pure serializer core) plus `renderShell`. Self-contained
   and testable.
3. Build `renderRequest` (the Effect wrapper running `serverFlags` and embedding
   the same flags).
4. Spike the hydration walk (approach B) on one real example, then implement
   hydrate boot and `run(program, { hydrate: true })`.
5. Add an SSR example under `examples/` (Effect HTTP server, auth middleware
   providing `CurrentUser`, a `serverFlags` doing a per-user fetch, the document
   route, degrade-to-SPA).
6. Separately, swap the website prerender's Chromium HTML capture for
   `renderToString` at build time. No deploy change.

## Testing strategy

- Serializer unit tests for each vnode feature in isolation.
- The keystone: a **round-trip fidelity test** enumerating every element
  constructor in `html/index.ts`, rendering via `renderToString`, parsing the HTML,
  and asserting the structure matches what `view` produced on the client. This pins
  the props->attribute table and prevents hydration mismatch.
- Hydration tests: no DOM recreated (identity preserved), listeners dispatch through
  the correct boundary-wrapped dispatcher, init Commands run, a corrupted DOM throws.
- A Submodel hydration test proving child-originated events route through
  `toParentMessage` after hydration.

## Open spikes and decisions still needed

1. **Hydration walk approach B vs A.** Resolve by spike (no DOM recreation +
   listeners attach + throw on mismatch).
2. **Where `serverFlags` lives in the config type** so it stays in the server
   compilation unit while `init`/`update`/`view` are shared. Likely: define
   `serverFlags` in the server module and pass it into the program wiring, rather
   than inline in a view-importing file.
3. **Shape of the render-only descriptor** `makeProgram` exposes (`init`, `view`,
   codecs) so `renderToString` does not construct a browser runtime.
4. **Whether to expose `renderToString` (flags-taking, sync) and `renderRequest`
   (request-taking, Effect) as two functions or one.** Recommendation: two, to keep
   the pure core pure.

## Invariants to preserve

- `init`/`update`/`view` keep their shapes and purity. `update` is synchronous and
  client-only.
- `view` is a pure function of the Model (the basis for hydration).
- SPA and SPA-prerender behavior unchanged; SSR is opt-in via mode and
  `{ hydrate: true }`.
- Core never depends on a server framework or a deploy tool.
