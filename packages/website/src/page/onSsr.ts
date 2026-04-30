import type { Html } from 'foldkit/html'

import { div } from '../html'
import type { TableOfContentsEntry } from '../main'
import {
  bullets,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import { coreArchitectureRouter, coreViewRouter } from '../route'

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

const tradeoffHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-tradeoff',
  text: 'The tradeoff',
}

const prerenderingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-is-open-pre-rendering',
  text: 'What is open: pre-rendering',
}

const thisSiteHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'this-site-is-built-that-way',
  text: 'This site is built that way',
}

const noPerRequestHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'what-foldkit-will-not-do',
  text: 'What Foldkit will not do',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  whatSsrBuysHeader,
  whatFoldkitIsForHeader,
  tradeoffHeader,
  prerenderingHeader,
  thisSiteHeader,
  noPerRequestHeader,
]

const PRERENDER_SCRIPT_URL =
  'https://github.com/foldkit/foldkit/blob/main/packages/website/scripts/prerender.ts'

export const view = (): Html =>
  div(
    [],
    [
      pageTitle('on-ssr', 'On SSR'),
      para(
        'Foldkit is a client-first framework. Apps run as a single-page application: ship a small HTML shell, boot the runtime, and let The Elm Architecture take over. People coming from Next.js or TanStack Start often ask why Foldkit does not render on the server. This is the answer.',
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
        'Each of these has a different cost. Static pre-rendering gives you the first three at build time, with no server. Per-request SSR adds latency to every navigation, requires running infrastructure, and introduces a serialization boundary between the server-rendered output and the client runtime. Server components add an entire second programming model on top.',
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
        'Editors, dashboards, multiplayer rooms, internal tools, configurators, games. The user opens the app, works inside it, closes it. SEO is irrelevant. First paint matters once. Time to interactive matters more.',
      ),
      para(
        'For a marketing site, a docs site, or a content-heavy app where users read more than they interact, you should probably pick a different tool. Astro, Next.js, and TanStack Start are excellent at that job, and Foldkit is not trying to compete on it.',
      ),
      tableOfContentsEntryToHeader(tradeoffHeader),
      para(
        'Choosing client-first means accepting one real cost: the user waits for JavaScript to load before they see the app. For an app the user lives inside for ten or twenty minutes, that wait happens once and amortizes to zero. For a page someone opens, scans, and leaves, that wait is most of the experience.',
      ),
      para(
        'In exchange, you get an architecture that is uniform end to end. No serialization boundary between server and client. No ',
        inlineCode("'use client'"),
        ' or ',
        inlineCode("'use server'"),
        ' annotations. No two flavors of data fetching. No hydration mismatches. The entire app is one Model evolving through one update loop. That property is not accidental. It is what makes the code legible.',
      ),
      para(
        'Frameworks that try to be both render-on-the-server and run-on-the-client end up with two programming models pretending to be one. Foldkit picks one, and ',
        link(coreArchitectureRouter(), 'the architecture'),
        ' stays honest.',
      ),
      tableOfContentsEntryToHeader(prerenderingHeader),
      para(
        'The Elm Architecture is not hostile to pre-rendering. ',
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
        link(PRERENDER_SCRIPT_URL, 'the pre-render script'),
        ' in the website repo. It is a few hundred lines of Effect-TS.',
      ),
      para(
        'The cost is build time, not runtime. There is no Node server in production. The output is plain static files that any CDN can serve. Crawlers see fully rendered HTML. Users see real content before the runtime boots.',
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
        'Per-request server rendering with a hydration handoff is not on the roadmap. That model adds a server, a serialization boundary, and a class of bugs (hydration mismatches, dehydration and rehydration of side-effecting Commands) that do not fit the architecture. If you need it, use a framework built around it. Foldkit will not pretend.',
      ),
    ],
  )
