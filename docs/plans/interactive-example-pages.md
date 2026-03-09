# Interactive Example Pages

> Transform the examples section from a grid of GitHub links into interactive, self-contained pages where each example runs live, its source code is browsable, and a walkthrough explains the key concepts.

## Goals

1. Each example gets its own URL (`/example-apps/counter`, `/example-apps/auth`, etc.)
2. Every page has three panels: a live demo, a source file browser, and a prose walkthrough
3. The existing examples grid remains as the index page, with cards linking to the new detail pages
4. No changes to Foldkit core or to the examples themselves (all work is website-layer)

## Architecture

### Approach: iframe + postMessage bridge

Each example is a standalone Vite app. Rather than rewriting them as Submodels of the website app (which would mean maintaining parallel versions), embed them in an `<iframe>`. A small bridge script injected at build time synchronizes the iframe's URL state with a fake URL bar rendered by the website.

Why iframe over Submodel:

- Examples stay standalone — `npm run dev` still works in each example directory
- No message type unification across 12+ apps
- No risk of CSS conflicts between the example and the website
- The Submodel approach would require rewriting `makeApplication()` examples (routing, query-sync, shopping-cart, auth) to operate without browser URL ownership

Why this is fine:

- All examples are same-origin when served from the website build, so `postMessage` and `contentWindow.location` work without restriction
- The iframe is sandboxed visually (fake browser chrome) but not functionally
- Precedent: Storybook, CodeSandbox, Astro tutorial all use this pattern

### Example categorization

| Example         | Entry point       | Files | Has routing | External deps            | Embedding notes                            |
| --------------- | ----------------- | ----- | ----------- | ------------------------ | ------------------------------------------ |
| Counter         | `makeElement`     | 1     | No          | None                     | Trivial                                    |
| Todo            | `makeElement`     | 1     | No          | localStorage             | Trivial                                    |
| Stopwatch       | `makeElement`     | 1     | No          | None                     | Trivial                                    |
| Error View      | `makeElement`     | 1     | No          | None                     | Trivial                                    |
| Form            | `makeElement`     | 1     | No          | None                     | Trivial                                    |
| Weather         | `makeElement`     | 2     | No          | HTTP (wttr.in)           | Needs network; may fail without CORS proxy |
| Snake           | `makeElement`     | 7     | No          | None                     | Needs keyboard focus on iframe             |
| WebSocket Chat  | `makeElement`     | 1     | No          | WebSocket (postman-echo) | Needs network                              |
| Routing         | `makeApplication` | 1     | Yes         | None                     | URL bar sync needed                        |
| Query Sync      | `makeApplication` | 1     | Yes         | None                     | URL bar sync critical (core value prop)    |
| Shopping Cart   | `makeApplication` | 10    | Yes         | None                     | URL bar sync needed                        |
| Auth            | `makeApplication` | 26    | Yes         | None                     | URL bar sync needed                        |
| Typing Terminal | external          | N/A   | Yes         | Full stack (RPC server)  | Cannot embed — link only                   |

### Phasing

**Phase 1** — Core infrastructure + first 4 examples (Counter, Todo, Stopwatch, Form)
**Phase 2** — Routing examples with URL bar sync (Routing, Query Sync, Shopping Cart)
**Phase 3** — Remaining examples (Weather, Snake, Error View, Auth, WebSocket Chat)
**Phase 4** — Walkthroughs (content authoring, can happen in parallel)

---

## Phase 1: Core Infrastructure

### 1. Vite plugin: `highlightExampleSourcesPlugin`

A new Vite plugin that reads example source directories and produces a virtual module per example containing all highlighted source files.

**Virtual module pattern:**

```
virtual:example-sources/counter
virtual:example-sources/todo
...
```

Each virtual module exports:

```ts
export default {
  files: [
    { path: 'src/main.ts', highlightedHtml: '...', rawCode: '...' },
    { path: 'src/styles.css', highlightedHtml: '...', rawCode: '...' },
  ],
}
```

**Implementation:**

- Reuse existing `shikiThemes` and line-decoration logic from `highlightCodePlugin`
- Walk `examples/<name>/src/` with `readdir` recursive
- Filter to `.ts`, `.tsx`, `.css` files (skip `node_modules`, generated files)
- Sort files: `main.ts` first, then alphabetical by directory depth then name
- Highlight each file with Shiki (CSS uses `lang: 'css'`)
- Emit as a single JSON export

This extends the existing virtual module pattern used by `counterDemoCodePlugin` and `highlightApiSignaturesPlugin`.

### 2. Route: `ExampleDetailRoute`

Add a parameterized route for individual example pages.

**route.ts changes:**

```ts
export const ExampleDetailRoute = r('ExampleDetail', { exampleSlug: S.String })

// Router
export const exampleDetailRouter = pipe(
  literal('example-apps'),
  slash(string('exampleSlug')),
  mapTo(ExampleDetailRoute),
)
```

Add to `docsParser`, `DocsRoute` union, and link constants. The existing `ExamplesRoute` (`/example-apps`) continues to serve the grid.

Router ordering matters — `exampleDetailRouter` must come before `examplesRouter` in `oneOf` since it's a more specific match for the same prefix.

### 3. Example metadata registry

A single source of truth mapping slug → metadata, replacing the current `examples` array in `page/examples.ts`.

```ts
type ExampleMeta = Readonly<{
  slug: string
  title: string
  description: string
  difficulty: Difficulty
  tags: ReadonlyArray<string>
  sourceHref: string
  hasRouting: boolean
  entryFile: string
}>
```

Shared between the grid page and detail pages. Lives in a new `page/example/meta.ts`.

### 4. Example detail page module

New file: `page/example/exampleDetail.ts`

**Model:**

```ts
const Model = S.Struct({
  selectedFile: S.String,
  exampleUrl: S.String,
})
```

**Messages:**

```ts
const SelectedFile = m('SelectedFile', { path: S.String })
const ChangedExampleUrl = m('ChangedExampleUrl', { url: S.String })
```

**View layout (three panels):**

```
┌─────────────────────────────────────────────┐
│  Example Title              Difficulty  Tags │
├──────────────────┬──────────────────────────┤
│                  │  ┌────────────────────┐  │
│  File Browser    │  │  Fake URL bar      │  │
│                  │  ├────────────────────┤  │
│  src/            │  │                    │  │
│    main.ts    ←  │  │  [iframe: live app]│  │
│    model.ts      │  │                    │  │
│    view.ts       │  │                    │  │
│                  │  └────────────────────┘  │
├──────────────────┴──────────────────────────┤
│  Highlighted source of selected file        │
│  (with copy button, line numbers)           │
├─────────────────────────────────────────────┤
│  Walkthrough prose                          │
│  (headings, paragraphs, inline code refs)   │
└─────────────────────────────────────────────┘
```

On narrow viewports, stack vertically: demo on top, then file browser + code, then walkthrough.

**File browser component:**

- Flat list of filenames (examples are shallow enough that a tree is overkill)
- Active file highlighted
- Click dispatches `SelectedFile`
- Default selection: `entryFile` from metadata (usually `src/main.ts`)

**Code panel:**

- Uses existing `highlightedCodeBlock` from `view/codeBlock.ts`
- Reads highlighted HTML from the virtual module based on `model.selectedFile`
- Includes copy button (existing pattern via `copiedSnippets`)

**Live demo panel:**

- Renders an `<iframe>` with `src` pointing to the example's dev/build URL
- Styled with fake browser chrome: URL bar, rounded corners, subtle shadow
- For `makeElement` examples: URL bar shows static text (e.g. `localhost:5173`)
- For `makeApplication` examples: URL bar updates via postMessage bridge

### 5. Integration into website main.ts

Following the existing Submodel pattern (like `asyncCounterDemo`, `uiPages`):

- Add `exampleDetail: Page.ExampleDetail.Model` to the website Model
- Add `GotExampleDetailMessage` to the Message union
- Wire up `init`, `update`, and view dispatch for the `ExampleDetail` route
- Initialize the Submodel lazily (only when navigating to an example detail page)

### 6. Update example grid cards

In `page/examples.ts`, change cards from linking to GitHub to linking to the detail page:

```ts
Href(`/example-apps/${example.slug}`)
```

Add a small "View source on GitHub" secondary link to preserve the existing behavior.

Typing Terminal keeps its current behavior (external link + live URL) since it can't be embedded.

---

## Phase 2: postMessage URL Bridge

### 1. Bridge script: `exampleBridge.ts`

A small script (~30 lines) injected into each example's `index.html` when served in embedded mode.

```ts
const isEmbedded = new URLSearchParams(location.search).has('embedded')

if (isEmbedded) {
  const originalPushState = history.pushState.bind(history)
  const originalReplaceState = history.replaceState.bind(history)

  const notifyParent = () => {
    window.parent.postMessage(
      { type: 'foldkit-example-url', url: location.href },
      window.location.origin,
    )
  }

  history.pushState = (...args) => {
    originalPushState(...args)
    notifyParent()
  }

  history.replaceState = (...args) => {
    originalReplaceState(...args)
    notifyParent()
  }

  window.addEventListener('popstate', notifyParent)

  window.addEventListener('message', event => {
    if (event.data?.type === 'foldkit-example-navigate') {
      originalPushState(null, '', event.data.url)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  })
}
```

**Key details:**

- Only activates when `?embedded` query param is present
- Patches `pushState` and `replaceState` to notify parent
- Listens for `popstate` (browser back/forward inside iframe)
- Listens for incoming `foldkit-example-navigate` messages (parent → iframe, for editable URL bar)
- Uses `window.location.origin` as the target origin (same-origin)

### 2. Vite plugin: inject bridge script

A small Vite plugin for each example's build that injects the bridge script into `index.html`:

```ts
const exampleBridgePlugin = (): Plugin => ({
  name: 'example-bridge',
  transformIndexHtml() {
    return [
      {
        tag: 'script',
        attrs: { type: 'module', src: '/@fs/.../exampleBridge.ts' },
        injectTo: 'head',
      },
    ]
  },
})
```

Alternatively, add a single `<script>` tag to each example's `index.html` manually — simpler but less maintainable.

### 3. Website subscription: `exampleUrl`

New subscription following the `viewportWidth` pattern:

```ts
export const exampleUrl: Subscription<Model, typeof ChangedExampleUrl, ...> = {
  modelToDependencies: (model) =>
    model.route._tag === 'ExampleDetail' ? model.route.exampleSlug : null,
  depsToStream: () =>
    Stream.async<Command<typeof ChangedExampleUrl>>(emit => {
      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'foldkit-example-url') {
          emit.single(
            Effect.succeed(ChangedExampleUrl({ url: event.data.url })),
          )
        }
      }

      window.addEventListener('message', handler)

      return Effect.sync(() => window.removeEventListener('message', handler))
    }),
}
```

The `modelToDependencies` returns the slug so the subscription activates only when viewing an example detail page, and tears down + recreates when switching between examples.

### 4. Fake URL bar component

The URL bar view for routing examples:

- Displays a simplified path extracted from the full iframe URL
- For query-sync: shows query parameters updating in real time as the user interacts
- Editable: clicking the URL text focuses an input, typing dispatches to the iframe via `postMessage`
- Forward/back buttons call `history.back()`/`history.forward()` on the iframe's `contentWindow`
- Visual: monospace font, subtle browser-chrome styling (light gray bar, rounded corners, lock icon for fun)

For `makeElement` examples (no routing), the URL bar is static or hidden entirely.

---

## Phase 3: Remaining Examples

### Weather & WebSocket Chat

These depend on external services. Options:

1. **Live network** — Works when the service is up. Show a "requires network" badge.
2. **Mock mode** — Add an `?embedded&mock` param and a mock service layer. More work but more reliable.
3. **Screenshot fallback** — If the service is down, show a static screenshot instead of the iframe. Least work.

Recommendation: Start with live network (option 1). If reliability becomes an issue, add mock mode for Weather (HTTP is easy to mock) and leave WebSocket Chat as live-only.

### Snake

Needs keyboard focus. The iframe must receive focus for `keydown` events to reach the snake game. Add `tabindex="0"` and auto-focus the iframe when the example loads. The fake browser chrome could include a "Click to play" overlay that focuses the iframe on click.

### Auth

The largest example (26 files). The file browser becomes more valuable here — users can navigate between `page/loggedOut/page/login.ts`, `page/loggedIn/page/dashboard.ts`, etc. Consider grouping files by directory in the file browser (indented, with directory headers) rather than a flat list.

### Error View

This example intentionally crashes. The iframe naturally isolates the crash from the website — this is a strength of the iframe approach. The error view renders inside the iframe while the website remains stable.

---

## Phase 4: Walkthroughs

Each walkthrough is a prose section below the demo and code panels. Authored as Foldkit view functions using the existing prose helpers (`para`, `heading`, `inlineCode`, `link`, `strong`, `callout`).

### Content structure per walkthrough

1. **What this example demonstrates** — 1 paragraph overview
2. **Key concepts** — 2-4 sections, each with a heading, explanation, and code reference (pointing to specific lines in the file browser)
3. **Try it** — Guided interaction prompts ("Click increment three times, then click reset. Notice how...")
4. **Going further** — Links to related core concept docs and other examples

### Walkthrough file organization

```
page/example/
  meta.ts                  — ExampleMeta registry
  exampleDetail.ts         — Submodel (Model, Message, Update, View)
  walkthrough/
    counter.ts             — walkthrough view for counter
    todo.ts                — walkthrough view for todo
    ...
```

Each walkthrough file exports a single view function:

```ts
export const view = (copiedSnippets: CopiedSnippets): ReadonlyArray<Html> => [...]
```

### Suggested authoring order

Start with examples that best showcase Foldkit's strengths:

1. **Counter** — Simplest; establishes the walkthrough format
2. **Query Sync** — Unique value prop; URL bar sync makes it shine
3. **Auth** — Submodels + OutMessage; the most architecturally interesting
4. **Shopping Cart** — Multi-page routing; shows how real apps are structured
5. Remaining examples as time allows

---

## Build & Deployment

### Development workflow

During local dev, examples need to be running for the iframes to load. Options:

1. **Monorepo dev server proxy** — The website's Vite dev server proxies `/example-apps-dev/<slug>/` to each example's Vite dev server. This requires running all example dev servers simultaneously.
2. **Pre-built examples** — Build all examples once, serve from `dist/`. Less dynamic but simpler. Use `concurrently` or a turborepo task.
3. **On-demand build** — A Vite plugin that builds the example on first request and caches the result. Best DX but most complex.

Recommendation: Option 2 for simplicity. Add a `build:examples` script that builds all examples into a known output directory. The website's Vite config serves that directory as static assets under `/example-apps-dev/`. For production, these are just static files deployed alongside the website.

### Production deployment

The website build step also builds all examples. Each example's `dist/` is copied into the website's output under `/example-apps-embed/<slug>/`. The iframe `src` points to this path with `?embedded`.

```
dist/
  index.html              ← website
  example-apps-embed/
    counter/
      index.html           ← counter example
      assets/...
    todo/
      index.html
      ...
```

### Base path configuration

Each example needs `base: '/example-apps-embed/<slug>/'` in its Vite config when building for embedding. This ensures asset paths resolve correctly. A shared Vite config helper can handle this:

```ts
const isEmbedBuild = process.env.FOLDKIT_EMBED === 'true'
const exampleName = path.basename(process.cwd())

export default defineConfig({
  base: isEmbedBuild ? `/example-apps-embed/${exampleName}/` : '/',
  // ...
})
```

The `FOLDKIT_EMBED` env var is set by the `build:examples` script.

---

## Effort Estimate

| Work item                         | Scope                                                                       |
| --------------------------------- | --------------------------------------------------------------------------- |
| `highlightExampleSourcesPlugin`   | Extend existing Vite plugin pattern. Medium — file walking + highlight loop |
| `ExampleDetailRoute` + routing    | Small — follows existing route patterns exactly                             |
| Example metadata registry         | Small — extract from existing `examples.ts` array                           |
| File browser component            | Medium — new view component, but simple (flat list + active state)          |
| Fake browser chrome + iframe      | Medium — styling + iframe setup                                             |
| postMessage bridge script         | Small — ~30 lines, well-understood pattern                                  |
| postMessage subscription          | Small — follows `viewportWidth` subscription pattern exactly                |
| Editable URL bar (two-way sync)   | Medium — input handling, postMessage to iframe                              |
| Build pipeline (`build:examples`) | Medium — script + base path config per example                              |
| Website `main.ts` integration     | Small — standard Submodel wiring                                            |
| Update example grid cards         | Small — change hrefs, add secondary GitHub link                             |
| Walkthrough content (per example) | Medium each — prose authoring, no technical risk                            |

The infrastructure (phases 1-2) is roughly equivalent in scope to the existing API reference page. The walkthroughs (phase 4) are the main time investment but have zero technical risk.

---

## Open Questions

1. **Mobile layout** — On narrow viewports, should the demo be collapsed by default (accordion-style) or always visible? The code panel is hard to use on mobile regardless.
2. **Example hot reload** — During local dev, should iframe examples support HMR? This works for free if we proxy to the example's Vite dev server, but not with pre-built assets.
3. **Code ↔ walkthrough linking** — Should walkthrough prose be able to highlight specific lines in the code panel? (e.g., "Lines 12-18 define the Model" scrolls the code panel and highlights those lines.) This would be a nice touch but adds interaction complexity.
4. **Typing Terminal** — It requires a backend server. Options: exclude from interactive pages entirely (keep as external link), or embed with a disclaimer that it requires the server running locally.
5. **Example versioning** — If the examples change on main but the deployed site is pinned to a release, the embedded examples and highlighted code could drift. Mitigated by building everything together, but worth noting.
