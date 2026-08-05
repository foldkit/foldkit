# What about SSR?

## Overview

Foldkit is a client-first framework, and server rendering is a first-class capability. An app can ship as a plain single-page application, generate static HTML for every route at build time, or render each request on a server and hydrate the DOM in place, all with the same `init`, `view`, `update`, and Model. The mechanics live on the [Server Rendering](/core/server-rendering) page; this page is the why and the boundaries.

## The kind of app Foldkit is for

Foldkit is for apps, not documents. The architecture pays off when:

- A user spends real time inside the application across a single session.
- State is rich and lives across many interactions.
- The interesting questions are about behavior over time, not first paint.

Editors, dashboards, multiplayer rooms, internal tools, configurators, games. The user opens the app, works inside it, closes it. Time to interactive is what matters most.

Per-request SSR widens the door for content-heavy app shells too. They can get correct first-paint HTML, SEO for dynamic URLs, and social previews without leaving the architecture. Where another tool still fits better is the inverse case: a site that is mostly prose with a sprinkle of interactivity, where the framework exists to deliver content. Astro is excellent at that.

## Build-time SSG

[The view function](/core/view) is pure: given a Model, it produces a virtual DOM tree. `renderToString` serializes that tree to HTML, so a build script can render every route once and write the files out as static assets. The runtime then hydrates the served HTML in place with the same Flags and `init` that produced it.

### This site uses SSG

This site is a single Foldkit application. When we deploy it:

- Vite builds the SPA bundle and a server bundle of the same program.
- A build script calls `renderToString` for every statically rendered route. No browser is involved.
- Each route gets its own index.html written into dist/, so the static host serves real content for every URL.
- Pagefind indexes the rendered HTML so search works without a server.

The [SSG example](https://github.com/foldkit/foldkit/tree/main/examples/ssg) shows the pattern in its smallest form. This site's [prerender script](https://github.com/foldkit/foldkit/blob/main/packages/website/scripts/prerender.ts) shows the same contract at production scale.

The cost is paid at build time, not at runtime. There is no Node server in production. The output is plain static files that any CDN can serve. Crawlers see fully rendered HTML. Users see real content before the runtime boots.

The build renders the view as it stands right after `init` returns. The website passes route content through universal, build-time Flags so the server and browser construct the same first Model. App shells that fetch data after `init` instead prerender their loading state, with real content arriving once the runtime boots and those Commands resolve. Browser-only facts such as storage and viewport size arrive through Commands after hydration.

## Request-time SSR

When a request arrives, the server runs `init` for that URL, renders `view(model)` to a string with `renderToString`, and ships the HTML in the response. The browser boots the runtime, reconstructs the same Model from the Flags the server embedded, attaches event listeners to the rendered DOM without tearing it down, and runs the Commands that `init` returned. From there, in-app navigation is client-side, the same as any Foldkit SPA. The [Server Rendering](/core/server-rendering) page covers the mechanics, and the [SSR example](https://github.com/foldkit/foldkit/tree/main/examples/ssr) is a complete server.

The same code runs on both sides. Same `init`, same `view`, same `update`, same Model. No two flavors of data fetching, no `'use client'` or `'use server'` boundary. Because the view is a pure function of the Model and both sides start from the same Model, there is no semantic mismatch to reconcile: no missing or extra content, no diverging text. Where the HTML parser normalizes markup on the way in, the affected subtree rebuilds rather than adopting, which is correct and invisible in the result.

When people say "SSR" they usually mean a bundle of things: rendered HTML arriving in the response for a faster first paint, SEO for content that needs indexing, social link previews for dynamic URLs, and server-side data fetching so the client does not waterfall. Per-request render and hydrate covers the first three out of the box, without introducing a second programming model. The fourth is the open question below.

SSG and SSR are the same Foldkit machinery at different times. An application can generate stable routes during its build and render personalized or open-ended routes per request. The deployment chooses the delivery policy for each URL; the application and hydration contract stay the same.

## Under consideration: running Commands on the server

A further step is to run Commands on the server during the initial render, so HTML ships with data already loaded rather than a loading state. This is tractable but introduces environment-awareness that Foldkit currently keeps out: per-request server context (cookies, auth, headers), Commands tagged as server-runnable versus client-only (a `ServerCommand` primitive), and services bound differently per side.

None of that splits the programming model in the Server Components sense. It does add an environment dimension to primitives that today have none. The shape is being designed before commitment.

## What Foldkit will not do

Server Components are not on the roadmap. The Foldkit tree is a function of one Model. Splitting it into server-only and client-only halves breaks the architecture. No `'use client'` or `'use server'` annotations, no two flavors of data fetching, no two programming models pretending to be one.

The recommendation is Effect-TS across the stack: a backend whose job is receiving requests and returning data, a Foldkit frontend whose job is rendering it. The line between server and client stays at the data, not the view.
