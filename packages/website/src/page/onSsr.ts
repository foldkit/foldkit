import { Html, html } from 'foldkit/html'

import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import type { Message } from '../message'
import {
  bullets,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import { coreViewRouter } from '../route'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const whatSsrBuysHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-ssr-actually-buys-you',
  text: 'What SSR actually buys you',
}

const whatFoldkitIsForHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-kind-of-app-foldkit-is-for',
  text: 'The kind of app Foldkit is for',
}

const prerenderingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-foldkit-does-instead-ssg',
  text: 'What Foldkit does instead: SSG',
}

const thisSiteHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'this-site-uses-ssg',
  text: 'This site uses SSG',
}

const noPerRequestHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-foldkit-will-not-do',
  text: 'What Foldkit will not do',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  whatSsrBuysHeader,
  whatFoldkitIsForHeader,
  prerenderingHeader,
  thisSiteHeader,
  noPerRequestHeader,
]

export const view = (): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('on-ssr', 'On SSR'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Foldkit is a client-first framework. Apps run as a single-page application: ship a small HTML shell and boot the Foldkit runtime. People coming from Next.js or TanStack Start often ask why Foldkit does not render on the server.',
      ),
      tableOfContentsEntryToHeader(whatSsrBuysHeader),
      para(
        'SSR is a bundle of features that often get conflated. It is worth separating them before deciding what you actually need:',
      ),
      bullets(
        'Faster first paint, because rendered HTML arrives in the response.',
        'Better SEO for pages whose content needs to be indexed.',
        'Less JavaScript on the client for content that does not need interactivity.',
        'Server-side data fetching with no client waterfall.',
      ),
      para(
        'Each of these has a different cost. Static pre-rendering gives you the first three at build time, with no server. Per-request SSR adds latency to every navigation and requires running infrastructure. Server components add an entire second programming model on top.',
      ),
      para(
        'When a framework says "we have SSR", it pays to ask which of those features you are signing up for, and which costs come with them.',
      ),
      tableOfContentsEntryToHeader(whatFoldkitIsForHeader),
      para(
        'Foldkit is for apps, not documents. The architecture pays off when:',
      ),
      bullets(
        'A user spends real time inside the application across a single session.',
        'State is rich and lives across many interactions.',
        'The interesting questions are about behavior over time, not first paint.',
      ),
      para(
        'Editors, dashboards, multiplayer rooms, internal tools, configurators, games. The user opens the app, works inside it, closes it. SEO rarely matters. First paint matters once. Time to interactive matters more.',
      ),
      para(
        'For a marketing site, a docs site, or a content-heavy app where users read more than they interact, you should probably pick a different tool. Astro, Next.js, and TanStack Start are excellent at that job. Foldkit is not built for it.',
      ),
      tableOfContentsEntryToHeader(prerenderingHeader),
      para(
        'The architecture is not hostile to pre-rendering. ',
        link(coreViewRouter(), 'The view function'),
        ' is pure: given a Model, it produces a virtual DOM tree. That tree can be rendered to HTML at build time and served as static assets, then hydrated when the runtime boots in the browser.',
      ),
      tableOfContentsEntryToHeader(thisSiteHeader),
      para('This site is a single Foldkit application. When we deploy it:'),
      bullets(
        'Vite builds the SPA bundle.',
        'A build script boots vite preview and launches headless Chromium.',
        'The script visits every route, waits for the runtime to render, and captures the HTML.',
        'Each route gets its own index.html written into dist/, so the static host serves real content for every URL.',
        'Pagefind indexes the rendered HTML so search works without a server.',
      ),
      para(
        'You can read ',
        link(Link.prerenderScript, 'the pre-render script'),
        ' in the website repo. It is a few hundred lines of Effect-TS.',
      ),
      para(
        'The cost is paid at build time, not at runtime. There is no Node server in production. The output is plain static files that any CDN can serve. Crawlers see fully rendered HTML. Users see real content before the runtime boots.',
      ),
      para(
        'A Foldkit primitive for this pattern is on the roadmap. Until then, the website pre-render script is the reference implementation. It captures the view as it stands right after ',
        inlineCode('init'),
        ' returns. That is the full content when the Model already has everything the page needs (docs, marketing, this site). App shells that fetch data after ',
        inlineCode('init'),
        ' will pre-render their loading state, with real content arriving after hydration.',
      ),
      tableOfContentsEntryToHeader(noPerRequestHeader),
      para(
        'Per-request server rendering with a hydration handoff is not on the roadmap. Frameworks that try to be both render-on-the-server and run-on-the-client end up with two programming models pretending to be one. Foldkit picks one.',
      ),
      para(
        'The result is an architecture that is uniform end to end: no ',
        inlineCode("'use client'"),
        ' or ',
        inlineCode("'use server'"),
        ' annotations, no two flavors of data fetching, no hydration mismatches. The entire app is one Model evolving through one update loop.',
      ),
      para(
        'The recommendation is Effect-TS across the stack: a backend whose job is receiving requests and returning data, a Foldkit frontend whose job is rendering it. The line between server and client stays at the data, not the view.',
      ),
    ],
  )
}
