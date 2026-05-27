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

const ssgTodayHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-foldkit-does-today-ssg',
  text: 'What Foldkit does today: SSG',
}

const thisSiteHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'this-site-uses-ssg',
  text: 'This site uses SSG',
}

const perRequestRoadmapHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'on-the-roadmap-per-request-render-and-hydrate',
  text: 'On the roadmap: per-request render and hydrate',
}

const underConsiderationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'under-consideration-running-commands-on-the-server',
  text: 'Under consideration: running Commands on the server',
}

const willNotDoHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-foldkit-will-not-do',
  text: 'What Foldkit will not do',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  whatSsrBuysHeader,
  whatFoldkitIsForHeader,
  ssgTodayHeader,
  thisSiteHeader,
  perRequestRoadmapHeader,
  underConsiderationHeader,
  willNotDoHeader,
]

export const view = (): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('on-ssr', 'On SSR'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Foldkit is a client-first framework. Apps run as a single-page application today: ship a small HTML shell and boot the Foldkit runtime. Static pre-rendering is supported. Per-request server rendering with a hydration handoff is on the roadmap as a first-class capability.',
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
      tableOfContentsEntryToHeader(ssgTodayHeader),
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
      tableOfContentsEntryToHeader(perRequestRoadmapHeader),
      para(
        'Per-request server rendering with a hydration handoff is on the roadmap as a first-class capability. The developer enables SSR once, and the server handles initial page loads for every route, the same way SSG handles every route today. When a request arrives, the server runs ',
        inlineCode('init'),
        ' for that URL, renders ',
        inlineCode('view(model)'),
        ' to a string, and ships the HTML in the response. The browser boots the runtime, reconstructs the same Model, attaches event listeners to the pre-rendered DOM, and runs the Commands that ',
        inlineCode('init'),
        ' returned. From there, in-app navigation is client-side, the same as any Foldkit SPA.',
      ),
      para(
        'The same code runs on both sides. Same ',
        inlineCode('init'),
        ', same ',
        inlineCode('view'),
        ', same ',
        inlineCode('update'),
        ', same Model. No two flavors of data fetching, no ',
        inlineCode("'use client'"),
        ' or ',
        inlineCode("'use server'"),
        ' boundary. Hydration mismatch is structurally ruled out: the view is a pure function of the Model, and both sides start from the same Model.',
      ),
      para(
        'This is the form of SSR most people are asking about when they say "SSR". It covers correct first-paint HTML, SEO for dynamic URLs, and social link previews, without introducing a second programming model.',
      ),
      tableOfContentsEntryToHeader(underConsiderationHeader),
      para(
        'A further step is to run Commands on the server during the initial render, so HTML ships with data already loaded rather than a loading state. This is tractable but introduces environment-awareness that Foldkit currently keeps out: per-request server context (cookies, auth, headers), Commands tagged as server-runnable versus client-only (a ',
        inlineCode('ServerCommand'),
        ' primitive), and services bound differently per side.',
      ),
      para(
        'None of that splits the programming model in the Server Components sense. It does add an environment dimension to primitives that today have none. The shape is being designed before commitment.',
      ),
      tableOfContentsEntryToHeader(willNotDoHeader),
      para(
        'Server Components are not on the roadmap. The Foldkit tree is a function of one Model. Splitting it into server-only and client-only halves breaks the architecture. No ',
        inlineCode("'use client'"),
        ' or ',
        inlineCode("'use server'"),
        ' annotations, no two flavors of data fetching, no two programming models pretending to be one.',
      ),
      para(
        'The recommendation is Effect-TS across the stack: a backend whose job is receiving requests and returning data, a Foldkit frontend whose job is rendering it. The line between server and client stays at the data, not the view.',
      ),
    ],
  )
}
