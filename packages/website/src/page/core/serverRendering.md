# Server Rendering

## Overview

:::Info{label="Experimental"}
Server rendering ships from `foldkit/experimental/server` while the API settles, and any release may change it. Please try it and report what breaks; the shape firms up alongside Server Commands.
:::

Foldkit renders on the server with the same program the browser runs. `renderToString` resolves `init`, runs the pure view, and returns HTML. `Runtime.hydrate` then adopts that HTML in place. The same `init`, view, update, and Model work whether the HTML was rendered during a build or while handling a request.

That gives Foldkit one rendering pipeline with two possible schedules:

- **Static site generation (SSG):** a build script renders a finite set of URLs and writes HTML files.
- **Server-side rendering (SSR):** a server renders a URL when its request arrives.

An application can use either schedule, or use SSG for some URLs and SSR for others. The application code does not need a second rendering API.

## The server entry

A server entry is the delivery-neutral boundary between the application and its host. It accepts a Web `Request` and returns a `Promise<ServerEntryResult>`:

```typescript
import { Effect } from 'effect'
import * as Server from 'foldkit/experimental/server'

import { Flags, init, view } from './main'

const flagsForRequest = (request: Request): Flags => ({
  initialCount: readCountCookie(request.headers.get('cookie') ?? ''),
})

export const renderPage = (
  request: Request,
): Promise<Server.ServerEntryResult> =>
  Effect.runPromise(
    Server.renderToString(
      { Flags, init, view },
      { flags: flagsForRequest(request) },
    ).pipe(
      Effect.map(application =>
        Server.Rendered(application, {
          headers: {
            'cache-control': 'private, no-store',
            vary: 'cookie',
          },
        }),
      ),
    ),
  )
```

The outer `Promise` keeps the entry callable from Vite, build scripts, serverless functions, and long-running Effect HTTP servers without making those hosts provide the application's Effect requirements. The entry remains free to use Effect internally.

Rendering must stay inside the entry's module graph. Foldkit's HTML builder uses a module-local render frame, so the application's view and `renderToString` must resolve to the same Foldkit module instance. A host should import the built server entry and call `renderPage`, not import the application and render it itself.

`renderToString` accepts the server-relevant subset of a `makeApplication` config: `init`, view, plus `Flags` and `routing` when the application declares them. The full application config is structurally assignable. The container, update, subscriptions, and ManagedResources do not participate in the server render.

For a routing application, pass the request URL so `init` receives it exactly as it receives `window.location` in the browser:

```typescript
Server.renderToString(config, { url: request.url, flags })
```

## The result contract

A server entry returns one of two variants:

- `Server.Rendered(application, options)` asks the host to place Foldkit's rendered application in its HTML template. Its options can carry an HTTP status and headers.
- `Server.Responded(response)` bypasses template injection with a complete Web `Response`. Use it for redirects, API responses, or any request the application handles without rendering its page shell.

`Server.toResponse(template, result)` converts either variant to the Web `Response` a request-time host sends. It injects a `Rendered` application into the template, defaults to status 200 and a UTF-8 HTML content type, and passes a `Responded` response through unchanged.

The rendered application contains the body markup and the Document's initial head state:

```typescript
type RenderedApplication = Readonly<{
  html: string
  title: string
  lang?: string
  dir?: 'ltr' | 'rtl' | 'auto'
  canonical?: string
  ogUrl?: string
}>
```

`injectIntoTemplate` places that output into a standard `index.html`. It expects exactly one `<div id="root"></div>` placeholder by default, with no extra attributes or inner whitespace, plus exactly one `<title>` element. Pass `containerId` when the template uses another id. It also stamps language, text direction, canonical URL, and Open Graph URL into matching shell elements.

## The hydration handoff

A hydratable render carries two markers:

- The application root has `data-foldkit-app`. Its value identifies the runtime.
- A Flags application also emits a JSON script carrying the Schema-encoded Flags that produced the server Model.

Conceptually, the handoff appears next to the rendered root:

```html
<main data-foldkit-app="app"><!-- rendered view --></main>
<script type="application/json" data-foldkit-flags="app">
  { "initialCount": 2 }
</script>
```

The script type makes the payload data rather than executable JavaScript. Foldkit escapes values that could close the script element, then parses and Schema-decodes the text during hydration. Flags are public HTML, not a place for secrets.

The client opts into the handoff explicitly:

```typescript
Runtime.hydrate(application)
```

`Runtime.run` always builds the DOM fresh. A Flags application supplies its client-only Flags Effect at that boundary:

```typescript
Runtime.run(application, { flags })
```

`Runtime.hydrate` accepts no client Flags producer. It reads the serialized Flags, calls the same `init`, and adopts matching server DOM nodes rather than replacing them. Element identity, focus, scroll position, and media state survive while listeners and Mounts attach. This adoption is the hydration step. A mismatching subtree rebuilds at the nearest parent, with a development warning that points back to nondeterministic Flags, init, or view output.

Calling `hydrate` declares that a complete server handoff exists. A missing stamped root, missing Flags payload, or undecodable Flags payload terminates startup and leaves the rendered HTML visible but inert. This catches stale HTML, mismatched client bundles, and deployment mistakes instead of silently booting a different client Model. Use `run` in a separate client entry when a page must support a fresh SPA boot. An HMR-restored Model wins over DOM adoption because the served DOM reflects older code, but the stamped server root is still required.

Commands returned by `init` do not run during `renderToString`. The server output represents the immediate post-`init` Model. After hydration, the browser runs those Commands normally.

## Flags and browser facts

Hydration requires both sides to construct the same first Model. Flags embedded in HTML are the contract that makes this reproducible.

For request-time SSR, Flags can come from the request, including the URL, headers, and cookies. For build-time SSG, Flags must be universal and build-stable because one file is served to every visitor. In both cases, every serialized Flag is public HTML. Never place credentials, private tokens, or other secrets in Flags.

Browser-only facts do not belong in hydratable SSG Flags. For example: a theme stored in `localStorage`, the viewport width, or browser feature detection cannot be known by the build. Start from a neutral Model on both sides, then load those facts through a boot-time Command or Subscription after hydration. If a preference must affect the server HTML, promote it to request-visible data such as a cookie and use request-time SSR for that URL.

`isHydratable` defaults to `true` for both SSG and SSR. Pass `isHydratable: false` only when producing static markup that will not be hydrated. It is not the normal SSG setting.

## Request-time SSR

In development, enable the Vite host:

```typescript
foldkit({ ssr: { serverEntry: '/src/entry.server.ts' } })
```

Vite continues to serve the client entry, HMR, and assets. Requests that reach the Foldkit middleware are converted to Web `Request` values and passed to `renderPage`; the returned Web `Response` supplies the status, headers, and body.

In production, build the client and the server host separately. The host serves static assets first, imports the built server entry, and sends `Server.toResponse(template, await renderPage(request))`. The [SSR example](https://github.com/foldkit/foldkit/tree/main/examples/ssr) uses an Effect `HttpServer` for that thin delivery layer.

Personalized HTML must not enter a shared cache. Set an appropriate `cache-control` policy and `vary` headers when Flags depend on cookies, authorization, locale, or other request data. The SSR example uses `private, no-store` and `vary: cookie` because its initial counter comes from a cookie.

## Build-time SSG

An SSG host builds the browser bundle and server entry, then calls `renderPage` once for every generated URL:

```typescript
for (const path of prerenderPaths) {
  const request = new Request(`https://example.com${path}`)
  const result = await serverEntry.renderPage(request)

  if (result._tag === 'Responded') {
    throw new Error(`Cannot write a Response for ${path} as static HTML`)
  }

  const html = Server.injectIntoTemplate(template, result.application)
  await writeRoute(path, html)
}
```

A static file cannot preserve arbitrary response behavior. The build should reject `Responded` results and rendered statuses it cannot reproduce rather than silently discarding them.

The [SSG example](https://github.com/foldkit/foldkit/tree/main/examples/ssg) is the minimal reference. This website is the production-scale reference: its prerender host uses the same `renderPage(Request)` contract, seeds route content through universal Flags, and writes every route as hydratable static HTML.

## One application using both

SSG and SSR are route delivery policies, not separate Foldkit application types. A hybrid deployment can generate stable routes during the build and send the remaining URLs to a request-time host. Both hosts import the same server entry, and every delivered page hydrates through the same client entry.

For example: product documentation and marketing pages can be generated at build time, while account pages and preview URLs render per request. A route should have one authoritative delivery policy in a deployment so the CDN and runtime server do not disagree about which version owns it.

## Limitations

- Commands do not run during a server render, so content they load ships as its initial state unless the host supplies that content through Flags. Running Commands on the server is under consideration.
- Components that measure the DOM to decide what to render, such as `Ui.VirtualList`, render their initial unmeasured state and fill in after hydration.
- `makeElement` and `embed` applications do not hydrate yet. Server rendering is for page-owning `makeApplication` programs.
- Text typed into a controlled input before hydration yields to the Model when controlled values are reasserted. The element, focus, and page scroll survive.
- Arbitrary properties set through `h.Prop` are client behavior rather than markup, so they take effect after hydration. A `<select>` value comes from its selected `<option>` in server HTML and settles from the Model after hydration.
- Raw-text elements such as `script` and `style` cannot contain their literal closing-tag sequence. `renderToString` rejects content that would break out of the element.
