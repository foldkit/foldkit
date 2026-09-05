# Server Rendering

## Overview

:::Warning{label="Experimental"}
Server rendering ships from `foldkit/experimental/server` while its API and operational contract settle. It will move to `foldkit/server` once Foldkit can make a stable compatibility commitment to both. It may change in any Foldkit release and has not yet had broad production exposure.

Pin the exact version you deploy and test upgrades against your own SSR or SSG host. For regulated or security-critical workloads, wait for the stable export, or have your security and deployment setup reviewed independently first.

The lowest-risk use today is statically generated public content, which is how this site uses it. Please try it and report what breaks.
:::

Foldkit renders on the server with the same program the browser runs. `renderToString` resolves `init`, runs the pure view, and returns HTML. `Runtime.hydrate` then adopts matching HTML in place and rebuilds mismatches. The same init, view, update, and Model work whether the HTML was rendered during a build (SSG) or while handling a request (SSR).

One program gives Foldkit one rendering pipeline with two delivery policies:

- **Static site generation (SSG):** a build script renders a finite set of URLs and writes HTML files.
- **Server-side rendering (SSR):** a server renders a URL when its request arrives.

An application can use either policy, or use SSG for some URLs and SSR for others. The application code does not need a second rendering API.

For an application with Flags, here is the handoff from server input to a live application:

```diagram
       SERVER OR BUILD                      BROWSER

request or build input                 live Foldkit app
         |                                     ^
         v                                     |
       Flags                           adopts matching DOM
         |                                     ^
         v                                     |
        init                                same view
         |                                     ^
         v                                     |
       Model                          equivalent Model
         |                                     ^
         v                                     |
        view                               same init
         |                                     ^
         v                                     |
HTML + serialized Flags --------> Runtime.hydrate reads Flags
```

Once the live application takes over, it behaves like any other Foldkit application. Routing, update, Commands, and Subscriptions run in the browser. A handled navigation does not ask the delivery host to render another document, though the application's Commands may still request data. The server renders the document again only on a full page load, such as a reload or a link the runtime does not handle.

For SSG, the build script takes the host's place. It writes the response to a file that a static server or CDN delivers later.

## The server entry

A server entry connects the application to its host. It exports a `renderPage` function that accepts a Web `Request` and returns a `Promise<EntryResult>`:

::Snippet{name="serverRenderingServerEntry" label="server entry example"}

The outer `Promise` keeps `renderPage` callable from Vite, build scripts, serverless functions, and the emitted `fetch` handler. Those hosts do not need to provide the application's Effect requirements. The entry uses Effect internally; the host sees only the `Promise`.

The entry is application code. Keep it in `src/` (`src/entry.server.ts` in the examples), not in the host's directory. It imports the application's `init`, `view`, and `Flags`, so the server build must compile it with those application imports.

The client and server are separate module graphs. Within each graph, the view and the Foldkit runtime that calls it must resolve to one `foldkit` module instance. The HTML builder tracks a render in module-level state. If one render uses two Foldkit copies, the view writes to one copy while the runtime reads the other. The render fails instead of producing the wrong page. Duplicate monorepo installs and aliases that split one graph are common causes.

A delivery host runs the built `fetch` handler. It does not import the application and render it directly. One `vite build` emits `dist/server/fetch.js` whose default export is `{ fetch }`. The [SSR example](/example-apps/ssr) starts that module with `node scripts/serve.mjs`. A Worker can default-export the same module.

`renderToString` accepts the server-relevant subset of a `makeApplication` config. That subset contains `init` and `view`, plus `Flags` and `routing` when the application declares them. A full application config satisfies the subset, so an entry can pass it unchanged.

The `container`, `update`, `subscriptions`, and `managedResources` fields do not participate in server rendering. The server runs the view once over the Model returned by `init`. There is no DOM to attach to and no Message to dispatch.

For a routing application, pass the request URL so `init` receives the same value it receives from `window.location` in the browser:

::Snippet{name="serverRenderingRenderToStringUrl" label="renderToString with url example"}

`request.url` is the public URL. The Vite dev host preserves its configured `base` prefix and the browser's query string when middleware routes the request.

## The result contract

### Entry results

A server entry returns one of two variants:

- `Server.Rendered(application, options)` asks the host to place Foldkit's rendered application in its HTML template. Its options can carry an HTTP status and headers.
- `Server.Responded(response)` bypasses template insertion with a complete Web `Response`. Use it for redirects and any request that does not render a page.

`Server.toResponse(template, result)` turns either variant into the Web `Response` the host sends. It inserts a `Rendered` application into the template, defaults to status 200 and a UTF-8 HTML content type, and passes a `Responded` response through unchanged.

The render host serves pages, not a data API. Put JSON endpoints on a separate backend, such as an Effect `HttpApi` service.

### Rendered application

The rendered application contains the body markup and the Document's initial head state:

::Snippet{name="serverRenderingRenderedApplication" label="RenderedApplication type"}

`injectIntoTemplate` places that output in a standard `index.html`. The template must contain exactly one `<div id="root"></div>` placeholder. The placeholder has no other attributes and no whitespace inside it. The head must contain exactly one `<title>`. A missing or duplicate placeholder or title produces an error that names the problem.

Pass `containerId` when the template uses another id. The injector also writes the language, text direction, canonical URL, and Open Graph URL into the corresponding shell elements.

### Protocol validation

`RenderedApplication` is public so a host can transport or wrap it. Its `html` field remains protocol data. Pass the value returned by `renderToString` to `injectIntoTemplate` unchanged.

Hydratable HTML must parse as one top-level element with one nonempty application stamp and build stamp. It may be followed by one matching top-level JSON Flags script. Static HTML may contain one element, text, or comment root, or no body output.

Foldkit rejects extra top-level content, ambiguous handoff markers, and source that the HTML parser drops, splits, moves, or reconstructs. It does not insert markup when parsing changes which nodes belong to the application.

### Application ownership

`runtimeId` pairs one hydratable root with its Flags payload. It also keys the Model and scroll position preserved by hot reloading. A nondefault id changes that pairing. It does not create another document owner.

A document may contain one hydratable Foldkit root. `injectIntoTemplate` refuses to insert a hydratable render when the template already contains one, even when the ids differ. `Runtime.hydrate` refuses and contains a page assembled elsewhere when it finds more than one stamped root. An explicit container does not override this rule.

Two roots with the same id would also read the same Flags and preserved HMR state. Foldkit reports that collision specifically, but distinct ids do not make multiple page-owning applications valid.

The root stamp must have a nonempty id and name the document's single stamped root in the body light DOM. A requested root in `<head>`, a shadow tree, a detached subtree, or another document is refused and the page is contained before startup. When the configured container resolves to an element, it must be that root or one of its descendants.

A page-owning `makeApplication` controls the document title, language, text direction, canonical URL, and Open Graph URL. It also installs document-wide navigation listeners. With two applications, the last render would own the metadata and the first listener would handle every link. Render one application per page.

Static body output carries no handoff stamp. It may coexist with the document's one hydratable application. Each call to `injectIntoTemplate` still applies that render's `Document` head fields, so insertion order decides which render supplies the initial page metadata.

### Supported templates and roots

The placeholder's location and the view's root are part of the contract. Browsers move or drop markup that appears in an invalid parser context. Foldkit supports a short list of predictable contexts and refuses the rest. Each error names the rejected tag:

- The placeholder must reach `<body>` through `div`, `main`, `section`, `article`, `aside`, `header`, or `footer`. A placeholder inside `<form>`, `<table>`, `<select>`, SVG or MathML content, or `<template>` content is rejected.
- Rendered markup cannot declare a shadow root through `<template shadowrootmode>` or the older `shadowroot` attribute. Parsing moves that content out of the light DOM, so the browser tree and the hydration tree would differ. Attach shadow roots from a custom element instead.
- A view cannot be rooted at `<html>`, `<head>`, `<body>`, or `<frameset>`. `renderToString` rejects those roots for static and hydratable output because the document parser drops, merges, or replaces them. Root the view at an ordinary element such as `<div>` or `<main>`. Set the title, language, and text direction through the `Document` returned by the view.

## The hydration handoff

A hydratable render carries these markers:

- The application root has `data-foldkit-app`. Its value is the `runtimeId`.
- The root also has `data-foldkit-build`. Its value identifies the deployment that rendered the page.
- An application with Flags emits a `<script type="application/json" data-foldkit-flags="...">`. It carries the Schema-encoded Flags that produced the server Model. The attribute value matches the root's `runtimeId`.
- Keyed elements carry `data-foldkit-key`. Elements with build-assigned view identity carry `data-foldkit-identity`. Both values are deterministic, non-cryptographic fingerprints. Neither marker contains the original key, which may hold an account id or email address, or the build's source path. Hydration compares each fingerprint and removes the marker as it adopts the element. A render with `isHydratable: false` emits neither marker.

  A fingerprint is a public comparison token, not a secret or an authentication check. A reader can compute the fingerprint of a guessed key or view identity and test for a match. An attacker can also construct two values with the same fingerprint. Key by values that are safe to publish. Hydratable keys must be strings or numbers other than `NaN`.

Conceptually, the handoff appears next to the rendered root:

::Snippet{name="serverRenderingHydrationHandoff" label="hydration handoff markup"}

The script type makes the payload data rather than executable JavaScript. Foldkit escapes values that could close the script element. Hydration then parses and Schema-decodes the text. Flags are public HTML, not a place for secrets.

### Opting in from the client entry

The client opts into the handoff in its entry (`src/entry.ts` in the examples):

::Snippet{name="serverRenderingHydrate" label="Runtime.hydrate example"}

`Runtime.run` always builds the DOM from scratch. An application with Flags supplies its client-only Flags Effect at that boundary:

::Snippet{name="serverRenderingRunWithFlags" label="Runtime.run with flags example"}

`Runtime.hydrate` accepts no client Flags producer. It reads the serialized Flags, calls the same `init`, and adopts matching server DOM nodes. Element identity, focus, scroll position, and media state survive while listeners and Mounts attach.

A mismatched subtree is rebuilt from its nearest parent. Rebuilding discards the DOM identity and browser state that adoption preserves. Development logs a warning that points to nondeterministic Flags, `init`, or view output. Production rebuilds silently, so test hydration before shipping.

Calling `hydrate` declares that a complete server handoff exists. If the handoff is invalid, startup stops before Foldkit adopts DOM and the page is put out of reach. [What a refusal does](#what-a-refusal-does) describes that state. This is safer than booting a different client Model over the server's HTML.

Use `run` from a separate client entry when the page must also support a fresh SPA boot.

`isHydratable` defaults to `true` for SSR and SSG. Set `isHydratable: false` only for static markup that no client will hydrate. The output then carries no application stamp, build id, Flags payload, key marker, or identity marker. `Runtime.hydrate` refuses it.

### Flags and what only the browser knows

Hydration requires the server and browser to build the same first Model. Embedded Flags let the browser call `init` with the values the server used.

Request-time SSR can derive Flags from the request, including the URL, headers, and cookies. Build-time SSG writes one file for every visitor, so its Flags must be universal and fixed at build time.

:::Warning{label="Flags are public"}
Every serialized Flag ships in the page's HTML. Never place credentials, private tokens, or other secrets in Flags.
:::

Browser-only facts do not belong in hydratable SSG Flags. For example: a theme stored in `localStorage`, the viewport width, and browser feature detection are unknown during the build. Start with a neutral Model on both sides. Load browser facts through a boot-time Command or Subscription after hydration.

When a preference must affect the server HTML, make it request-visible, such as through a cookie, and use request-time SSR for that URL.

### The build id

The build id does not make hydration correct. It makes hydration refuse when it would otherwise be incorrect.

The server stamps the id on the rendered root. The client bundle carries the same value. Hydration compares them before it accesses the Flags payload text or adopts DOM. Different ids stop startup; matching ids allow hydration to continue.

Most structural mismatches are safe because Foldkit rebuilds the affected subtree. The dangerous case is markup that has the same shape but a different meaning. For example: an old page may place `<input name="email">` where the new build places `<input name="ssn">`. Without a build check, hydration could preserve text entered before startup and submit it under the new field name.

Flags create the same risk. A payload belongs to the deployment that rendered it. A new Schema may accept the old data even when its values now mean something different.

The deployment supplies the id because Foldkit cannot infer it. Imported constants, configuration, and caller arguments can change a view's output without changing the view function. `@foldkit/vite-plugin` compiles the value from its `buildId` option or `FOLDKIT_BUILD_ID` into application code as `import.meta.env.FOLDKIT_BUILD_ID`. The client and server entries pass that value explicitly:

::Snippet{name="serverRenderingBuildId" label="Build id example"}

Whatever value you pick, three things have to be true:

- It is public. The id appears in the HTML sent to every visitor, so it must not contain a secret.
- It identifies one deployment. Reusing an id makes a stale page look current and produces no warning. A commit or version is insufficient when the same revision can be deployed with different rendering inputs. The `ssr` and `ssg` scaffolds generate a fresh id whenever `FOLDKIT_BUILD_ID` is unset.
- It reaches both builds. `@foldkit/vite-plugin` builds the client and the server from one `vite build`, but Vite reads the config once per environment it builds, so whatever supplies the id has to answer with the same value each time it is asked. Read it from the environment, or store a generated fallback back into the environment, as the scaffolds do. A config that computes a fresh value per read gives the two bundles different ids, and hydration then refuses every page of the deployment that just shipped. A build split into separate commands has to pass the same value to each itself. A unique CI deployment id is a good source. A commit SHA or release tag is enough only when every deployment carrying it has identical rendering inputs.

A hydratable render without an id fails with `MissingBuildId`. `Runtime.hydrate` also requires one. A static render with `isHydratable: false` needs none.

Only a build takes the id from the deployment. The development server compiles the fixed value `development` into its server and client transforms. Development runs one live source session rather than producing independently deployable artifacts, so there is no deployment identity to derive.

### Why view identity cannot replace the build id

A view identity names a module path and function. It does not capture imported constants, configuration, or caller arguments.

View identity also ships in the client bundle. Adding a source hash would expose a digest of that source to every visitor. A reader could test candidates for a low-entropy server-only value by hashing each one, even when the client build removed the value itself. A deployment-supplied build id detects skew without hashing source files.

## Request-time SSR

In development, enable the Vite host in `vite.config.ts`:

::Snippet{name="serverRenderingViteSsr" label="Vite SSR config example"}

Vite continues to serve the client entry, HMR, and assets. Requests that reach Foldkit become Web `Request` values and pass to `renderPage`. The returned Web `Response` provides the status, headers, and body.

A hot update does not exercise hydration. HMR preserves the Model but rebuilds the DOM under the root. That DOM came from code that predates the edit. Reload the page to test hydration itself. The stamped root remains required during a hot update; without it, startup fails as it would on a fresh load.

In production, the host is built alongside the client. Set `ssr.build` in the plugin and `vite build` produces both. The server bundle is a Web `fetch` handler: Node and Workers both run it. Static files stay the platform's job. The [SSR example](https://github.com/foldkit/foldkit/tree/main/examples/ssr) starts that handler on Node:

::Snippet{name="serverRenderingBuildSsr" label="SSR build configuration"}

:::Warning{label="Caching personalized responses"}
When Flags depend on the request, such as a cookie, authorization header, or locale, the rendered HTML belongs to that visitor. Set `cache-control` and `vary` so a shared cache cannot serve it to someone else. The SSR example uses `private, no-store` and `vary: cookie` because its initial count comes from a cookie.
:::

## Build-time SSG

Generation is part of the build. `ssr.build.prerender` builds the browser bundle and the server entry, then calls `renderPage` once for every path the entry lists and writes each result as a file, all inside one `vite build`:

::Snippet{name="serverRenderingBuildSsg" label="SSG build configuration"}

The template those pages are rendered into comes from the browser build that produced it rather than from the file on disk, so the generated `/`, which replaces `index.html`, cannot become the template a later build reads.

A host that generates its pages itself, as this website does, runs its own loop over the same contract:

::Snippet{name="serverRenderingSsgLoop" label="SSG render loop example"}

A loop of your own has to keep that property itself. Keep a copy of the template outside the build output, and take the built `index.html` as the template only while it still holds the placeholder. The generated `/` replaces that built file, which is where the client build left the template, so a second run against one client build finds no `<div id="root"></div>` there and stops with `injectIntoTemplate found no exact <div id="root"></div> placeholder in the template`. The application's own `index.html` still has its placeholder and is never the file at fault. Reading the template before the loop is not enough on its own, because the loop that destroys it and the run that needs it are different runs.

A static file is a body plus whatever headers the file host adds. It cannot carry a redirect, a 404, or per-response headers. Writing a `Responded` result to disk turns a redirect into an ordinary page at that URL. The build should fail on `Responded` and on any rendered status it cannot reproduce.

The [SSG example](https://github.com/foldkit/foldkit/tree/main/examples/ssg) is the minimal reference. This website is the production-scale reference. Its prerender host uses the same `renderPage(Request)` contract, seeds route content through universal Flags, and writes every route as hydratable static HTML.

## Deploying

A deployed SSG build is a directory of static files. Any static host or CDN can serve it as is. The hydration handoff already lives in the HTML.

A build that `@foldkit/vite-plugin` owns writes `foldkit.build.json` beside the server bundle, naming the two output directories, the server entry, and every path it generated. A host reads it to decide what its asset layer does with a request matching no file: generated paths are files, anything else reaches the server when there is one. Deriving that from the build is how a deployment target avoids asking for it a second time, in settings whose wrong values serve an empty page at 200.

A deployed SSR application needs a host with two jobs: serve the built client assets and call `fetch` for page requests. On Node, use the [SSR example's `scripts/serve.mjs`](https://github.com/foldkit/foldkit/tree/main/examples/ssr/scripts/serve.mjs) as the reference. It serves static files first and falls through to `dist/server/fetch.js`.

### Which methods reach the entry

These rules apply to request-time SSR. An SSG deployment is a directory of files, so its static host owns method handling.

An SSR host serves static files for `GET` and `HEAD`. Other application methods reach the entry, including `OPTIONS`. Under `vite dev`, a configured proxy route may answer first.

Development and the production SSR host follow the same rule. A form action, `Server.Responded` reply, or CORS preflight should not work during development and fail after deployment.

`OPTIONS` reaches the entry because a preflight concerns one application resource. Only the application knows its policy. The SSR example and scaffold answer with 204 and an `Allow` header as a placeholder. Replace that response with a real CORS policy before deploying.

Preflight ownership follows `Access-Control-Request-Method`, not the URL suffix alone. For example: an `OPTIONS` request for `POST /submit.json` reaches the entry even though a `GET` for that path could name a static asset.

An `OPTIONS` request without both `Origin` and `Access-Control-Request-Method` is not a CORS preflight. It reaches the entry regardless of its path.

Vite still owns configured proxy routes, source modules, assets, and HMR. Its `server.cors` policy applies to those responses. Requests that fall through to Foldkit do not inherit that development-only policy. The entry's response headers therefore predict the deployed host.

The plugin validates the request target before Vite or Foldkit handles it. Proxies still have the opportunity to answer before the server entry. Application `OPTIONS` requests that fall through still reach the entry.

`CONNECT`, `TRACE`, and `TRACK` never reach the entry. The WHATWG `Request` constructor rejects them, so the host answers 405 with `Allow`.

On Node, only `TRACE` reaches that rule. The HTTP parser answers `TRACK` with 400 before a handler runs. `CONNECT` arrives on its own event rather than as an ordinary request.

### Caching

A static build is one file for every visitor, so it caches like any other static asset.

Request-time rendering depends on its Flags. A route with universal Flags can use shared caching. A route whose Flags come from the request produces HTML for one visitor. A CDN or reverse proxy must not serve that response to the next visitor. Set the response headers in the server entry and confirm that every cache in front of it honors them.

### Fetch-native runtimes

Cloudflare Workers, Deno, and Bun already use Web `Request` and `Response`, so they can run the emitted handler without an adapter:

::Snippet{name="serverRenderingWorkersHost" label="Workers host example"}

The platform serves the built client assets, and the handler covers page requests. When the build does not name an origin, the handler uses the platform `Request.url`, so a Worker is not refused as off-origin. Set `ssr.origin` or `ORIGIN` only when the host constructs requests against a configured origin, as the Node adapter does. The same built `fetch.js` module runs unchanged on each runtime.

[Alchemy](https://alchemy.run) can provision and deploy the host. It is TypeScript-native infrastructure as code built on Effect. The Worker and its databases, object storage, or queues live in the same TypeScript program as the entry. Its [Cloudflare support](https://alchemy.run/cloudflare/) deploys the Worker directly.

## Using SSG and SSR together

SSG and SSR are delivery policies, not separate Foldkit application types. A hybrid deployment can generate stable routes during the build and send the remaining URLs to a request-time host. Both hosts import the same server entry, and every page hydrates through the same client entry.

For example: documentation and marketing pages can be generated at build time, while account pages and preview URLs render per request. Give each route one authoritative policy. Otherwise, one request may receive a generated page from the CDN and the next may receive a fresh page from the runtime host.

## What a refusal does

Two things happen. Startup stops, and the page is put out of reach.

### Startup stops

Every refusal stops before `init` runs. No Command, Subscription, or ManagedResource from this boot starts.

For a build-id mismatch, Foldkit compares ids before accessing the Flags payload text, parsing its JSON, or Schema-decoding it. Stale Flags belong to the old deployment. Decoding them first would pass those values to current code before Foldkit noticed the mismatch. Flags-related refusals inspect the payload only far enough to identify the reported error.

Every refusal reports a `[foldkit]` error that names the cause. Failures found while `makeApplication` resolves the container and stamped root throw immediately. Failures found after `Runtime.hydrate` starts use Effect's error reporting. Both reach the console and error monitoring. Neither provides an application hook because startup never reaches a Model.

Build skew is one reason to refuse. The same policy also covers:

- A Flags payload that is missing, duplicated, malformed, or rejected by the Schema.
- A runtime id claimed by two roots, or more than one stamped root with distinct ids.
- An empty root stamp, or a requested stamped root outside the document body light DOM.
- A served root that lost its stamp. A generated client reaches this state when template insertion already replaced its `#root` placeholder, leaving neither the stamp nor the placeholder.

One missing-container case is different. If `makeApplication` cannot find its container and the document contains no `data-foldkit-app`, `data-foldkit-build`, or `data-foldkit-flags`, then no server rendered the page. The application's `<div id="root">` is simply absent, usually because of a typo or because the script ran too early. Foldkit reports the setup error and leaves the page alone.

Every other refusal contains the page. This includes calling `Runtime.hydrate` with an existing container that has no stamped root, even on a page that was never server-rendered. Calling `hydrate` is the explicit claim that a handoff exists. Use `Runtime.run` for a fresh client boot.

### Page containment

Foldkit marks the document body with `inert`, `aria-hidden`, and `data-foldkit-refused`. It opens a nondismissable modal shield beside the body and above existing top-layer content, including dialogs in closed shadow roots. The shield takes focus. Document-level input guards keep physical keyboard input from reaching stale handlers in the same document if older top-layer content requests focus.

Author-owned dialogs remain open behind the shield. Containment does not call `close()` or dispatch `cancel`, either of which could run a stale listener while startup is failing.

Pointer and physical keyboard input do not activate links, forms, or controls in that document. The shield asks the visitor to reload. The served DOM remains connected, and `data-foldkit-refused` is available for styling or monitoring. Nothing else in Foldkit sets that attribute.

Nothing moves. Foldkit marks the existing body instead of wrapping the application root. Wrapping would reparent the subtree, call `disconnectedCallback` and then `connectedCallback` on every upgraded custom element, and reload every iframe. Marking the body avoids those lifecycle effects.

The body is the containment boundary because every hydratable root sits inside it. `renderToString` refuses `html`, `head`, and `body` roots, and `hydrate` is reserved for an application that owns the page.

### Limits of containment

Containment starts only after the client detects a refusal. It cannot undo earlier activity:

- The parser may already have fetched subresources or run scripts from the old deployment.
- A custom element may already have run `connectedCallback`.
- A visitor may have interacted with the page before the client entry ran. A script can still submit a form programmatically despite `inert`.
- Containment is not a script or global-event sandbox. Capture listeners on `window` or `document` run before an event reaches the shield. The browser may also dispatch global or top-layer events.
- An iframe has its own document. Stale code can focus a control inside it, and physical keyboard input dispatched there does not reach the parent document's guards.
- A timer or stale listener can open a new dialog after containment. That dialog enters the top layer above the shield. The shield covers top-layer content that existed when refusal began without invoking its lifecycle.

### Stale HTML and caches

The build id acts only when the HTML and client bundle come from different deployments. A page cached whole usually references its original content-hashed bundle. Old HTML then loads old JavaScript, the ids match, and Foldkit does not refuse it.

If the old assets have been deleted, the client script returns 404 and nothing boots. That is not a refusal and produces no `[foldkit]` error because Foldkit never runs.

A mismatch requires stale HTML whose script resolves to current code. Shared caches, partially invalidated CDN nodes, and service workers that retain an application shell can create that pair. A running tab is not rechecked when a deployment lands.

Keep stale HTML out of shared caches. Serve the page and its client bundle from the same deployment.

### Recovering from a refusal

A refresh usually fixes a refusal by fetching HTML from the current deployment.

A refresh cannot help while a CDN node or cache-first service worker keeps returning the old page. Recovery then depends on that cache updating. Foldkit cannot control the service worker lifecycle.

Foldkit does not reload automatically and exposes no refusal hook. The runtime does not exist yet, so [`crash.report`](/core/crash-view#crash-report) never runs. Container-resolution failures throw immediately; later hydration failures use Effect's error reporting.

Automatic reload would also be unsafe. If stale HTML remains in the cache, each reload receives the same dead page and starts another loop.

## Limitations

### Rendering constraints

Server rendering has no browser and runs only the first view over the initial Model.

- Commands do not run during a server render. Data loaded by a Command therefore appears as the Model's pre-Command state, usually a loading state. Supply the data through Flags when it must appear in the server HTML.
- Components that measure the DOM before deciding what to render, such as `Ui.VirtualList`, render their initial unmeasured state and fill in after hydration.
- `makeElement` and `embed` applications do not hydrate. Server rendering supports page-owning `makeApplication` programs.
- Ordinary element children under `template` cannot be server-rendered because browsers place them in a separate content fragment that the differ does not walk. Element children under `noscript` become raw text while scripting is enabled and cannot hydrate as the declared nodes. Keep template markup in the HTML shell. Use plain text, trusted `h.InnerHTML`, or shell markup for a noscript fallback.
- Dynamic HTML tag names are normalized to lowercase, matching the elements `document.createElement` produces. SVG and MathML tag names are case-sensitive and must use their canonical spelling. `renderToString` refuses a foreign-content spelling that the HTML parser would adjust because `createElementNS` would preserve the original name on a fresh client render.

### DOM and form ownership

Server HTML and client DOM must give each attribute, property, and content slot one owner.

- `h.Style` owns individual CSS declarations rather than the whole `style` attribute. It accepts known camel-case or declaration names, plus custom properties beginning `--`, with one string value per declaration. It rejects `cssText`, Snabbdom lifecycle keys, duplicate names for one declaration, non-string values, `!important`, and syntax that can escape into another declaration. Server and client renders agree on effective CSS, though not necessarily on the exact attribute bytes or mutation history. Hydration avoids rewriting unchanged declarations. When a strict CSP blocks the parsed style attribute, the client reapplies declared properties through CSSOM.
- Text entered into a controlled input before hydration yields to the Model when Foldkit reasserts controlled values. Controlled `value`, `checked`, `selected`, and `muted` state owns the corresponding live and default DOM state. Hydration, a fresh render, and `form.reset()` therefore agree. Removing the typed property clears that ownership or restores a remaining raw attribute. Ownership changes are observable DOM writes, so a MutationObserver may report them. Element identity, focus, and page scroll survive.
- Both `h.textarea` and `h.keyed('textarea')` reject declared children and `h.InnerHTML` because neither keeps the live value tracking the Model after the browser marks the field dirty. Set textarea content with `h.Value`. A controlled `h.Value` on `output` cannot share with declared children because both own its content. These rules also apply to client-only rendering.
- A raw `h.Attribute` and a typed builder cannot name the same attribute on one element. `h.Style` likewise cannot share an element with a raw `style` attribute. Keep one owner for each piece of state.
- A typed reflected builder is client-only when the HTML element's native interface does not own that property. For example: spreading `h.Type('button')` onto a `div` creates an expando, so server rendering omits it instead of creating an attribute that a fresh client render would not. Use the matching element when the value must appear in markup, or use an intentional raw `h.Attribute`.
- A `CustomElement.define` property named `value` cannot control a native `select` in a server-rendered view. A fresh client assigns the property before the options exist, while hydration assigns it after the parser has created them. The two writes can select different options. Property factories belong on the Custom Element they declare. Use `h.Value` so a native select has one controlled selection.

### Custom Elements

Custom Elements may upgrade before hydration. These rules divide state between the component and the view.

- Attributes added by a Custom Element's `connectedCallback` survive when the view does not declare them. Component-added class tokens and style properties also survive when the view uses `h.Class` and `h.Style`. A raw `h.Attribute('class', ...)` or `h.Attribute('style', ...)` owns the whole attribute and replaces component additions.
- Component-built light DOM survives when the view declares no content. Foldkit adopts that childless host. When the view declares text, children, or `h.InnerHTML`, Foldkit replaces the host and builds the declared content while the new element is detached. The old host disconnects, and the new host has a new DOM identity. It connects once with the view content in place, as it does during a fresh render. This boundary is necessary because a browser may connect the old component before parsing its server content. Hydration cannot distinguish that content from nodes the component inserted and retained, and clearing the old host could let a child's `disconnectedCallback` mutate it during reconciliation.
- Keep lifecycle DOM writes within the Custom Element's own host or shadow root. Hydration resamples view-owned element and text state after lifecycle callbacks. It does not sandbox callback code or rescan structure that a component changes elsewhere.
- Declared custom-element properties are client behavior, not markup. They apply after hydration and never serialize as attributes. A component property named `id` or `title` stays client-side, while `h.Id` and `h.Title` still serialize the reflected attributes shared by all elements. Native elements continue to reflect their standard properties. For example: a server-rendered `<select>` expresses its value through the selected `<option>` before the Model settles it after hydration. A declared property named `innerHTML` remains a raw HTML sink when assigned on the client. Pass it only trusted markup and do not declare children beside it.

### Raw HTML and security boundaries

`h.InnerHTML` and raw attributes cross the typed builder boundary. Treat their values as trusted input.

- Server rendering rejects every `<script>` inside `h.InnerHTML` because parsed scripts and scripts created by assigning `innerHTML` follow different execution and processing rules. The refusal includes inert data blocks such as JSON-LD. Build scripts as ordinary view elements or place them in the HTML template. Declarative shadow-root templates are rejected for the same parse-equivalence reason, including inside ordinary template content.
- Raw-text elements such as `script`, `style`, `xmp`, `noembed`, and `noframes` cannot contain their literal closing-tag sequence. Trusted `h.InnerHTML` inside `title` has the same restriction. Script content also cannot contain `<!--`, which changes tokenizer state and can prevent the closing tag from ending the element. `renderToString` rejects content that would escape the element. It also rejects NUL and unpaired surrogate values because they do not survive HTML parsing and UTF-8 encoding unchanged. A carriage return is escaped as `&#13;` in ordinary text and attributes. It is rejected in raw text and comments, where no escape can protect it from input preprocessing.
- An `h.InnerHTML` fragment cannot reach outside the application root. An `<html>`, `<head>`, `<body>`, or `<frameset>` tag inside one is not rendered where it is written. The browser merges its attributes into the document and hoists its content, so `renderToString` rejects it.
- A live HTML `<base>` cannot appear in rendered application markup, including through `h.InnerHTML` or a scripting-disabled `<noscript>`. The browser applies it before hydration, so it could redirect the relative client entry that follows the root. Put `<base>` in the template head under host control. An ordinary inert template may contain one.
- Typed `h.Href`, `h.Src`, `h.Action`, and `h.Formaction` neutralize script URL schemes. A raw `h.Attribute` is an intentional escape hatch and does not sanitize URLs. SVG and MathML use raw attributes for URL-bearing state because their typed HTML properties are not parse-equivalent. Pass only trusted values there.
