import { Html, html } from 'foldkit/html'

import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import type { Message } from '../message'
import {
  bulletPoint,
  bullets,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import { whatAboutSsrRouter, whyNoJsxRouter } from '../route'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const pathToOneHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-path-to-1-0',
  text: 'The path to 1.0',
}

const afterOneHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'after-1-0',
  text: 'After 1.0',
}

const willNotDoHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-foldkit-will-not-do',
  text: 'What Foldkit will not do',
}

const followAlongHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'how-to-follow-along',
  text: 'How to follow along',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  pathToOneHeader,
  afterOneHeader,
  willNotDoHeader,
  followAlongHeader,
]

export const view = (): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('roadmap', 'Roadmap'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Foldkit is pre-1.0, and the roadmap has one headline: ship a production-ready 1.0. Everything currently in flight serves that goal. The bigger directions beyond it wait until the core is stable.',
      ),
      para(
        'Day-to-day work is tracked at ticket granularity in a private tracker, and that level of detail goes stale too quickly to be worth publishing. This page is the durable version: the blocks of work that gate 1.0, the directions after it, and the stances that will not change. ',
        link(Link.githubIssues, 'GitHub issues'),
        ' are the public surface for bugs and feature requests.',
      ),
      tableOfContentsEntryToHeader(pathToOneHeader),
      para(
        '1.0 is a stability commitment, not a feature milestone. It means the public API is locked under semver, the framework has been stress-tested by real applications, and the claims in these docs are backed by published evidence. The remaining work splits into blocks, roughly in order:',
      ),
      bullets(
        bulletPoint(
          'Framework capability',
          'finish the surface apps cannot be built without. This block is in progress.',
        ),
        bulletPoint(
          'Framework quality',
          'close correctness gaps before anything downstream measures them: test coverage for the newer primitives and consistent patterns across the UI components and example apps.',
        ),
        bulletPoint(
          'Real-world stress tests',
          'build example apps in the domains early adopters will build in. Every gap they surface is treated as a framework bug.',
        ),
        bulletPoint(
          'Benchmarks',
          'rendering numbers against other frameworks are already published on the performance page; the remaining work is reproducible numbers for TypeScript compilation and runtime throughput, held to the same bar.',
        ),
        bulletPoint(
          'Audits and DX',
          'an accessibility audit of the UI components against WCAG with real screen readers, axe-core regression checks in CI, and clearer runtime and type-level error messages when an API is misused.',
        ),
        bulletPoint(
          'Documentation',
          'a docs page for every core concept, an accessibility section for every UI component, and an end-to-end tutorial that builds a non-trivial app.',
        ),
        bulletPoint(
          'Release',
          'lock the public API, publish the semver commitment, empty the bug backlog, write the 0.x to 1.0 migration guide, and cut a burn-in release before tagging 1.0.',
        ),
      ),
      tableOfContentsEntryToHeader(afterOneHeader),
      para(
        'The largest committed direction is per-request server rendering with a hydration handoff, covered in depth in ',
        link(whatAboutSsrRouter(), 'What about SSR?'),
        '. Its timing is not settled yet: it may land shortly before 1.0 or as an early release after.',
      ),
      para(
        'Beyond that, these are directions being explored, not commitments:',
      ),
      bullets(
        bulletPoint(
          'Commands on the server',
          'a Command whose Effect runs on the server, so an app can reach a database or a private service without standing up a separate API. The client still just dispatches a Message and waits for the result.',
        ),
        bulletPoint(
          'Rendering beyond the DOM',
          'the Elm Architecture does not depend on the browser, and the terminal is the first candidate for a non-DOM render target.',
        ),
        bulletPoint(
          'The ecosystem outside core',
          'core stays the architecture: the runtime, routing, and the lifecycle primitives. Concerns that sit above it are likely to ship as libraries around Foldkit rather than inside it, the way the UI components already layer on top of core.',
        ),
      ),
      tableOfContentsEntryToHeader(willNotDoHeader),
      para(
        'Two stances are settled and will survive 1.0. Foldkit will not split the view into server and client halves the way React Server Components do: the view is one function of one Model, and cutting that tree across a network boundary breaks the architecture. And Foldkit will not adopt JSX. Both are explained in depth in ',
        link(whatAboutSsrRouter(), 'What about SSR?'),
        ' and ',
        link(whyNoJsxRouter(), 'Why no JSX?'),
        '.',
      ),
      tableOfContentsEntryToHeader(followAlongHeader),
      para(
        'Releases land continuously, and every change is recorded in the ',
        link(Link.changelog, 'changelog'),
        '. Bugs and feature requests live in ',
        link(Link.githubIssues, 'GitHub issues'),
        '. For questions and discussion, join the ',
        link(Link.discord, 'Discord'),
        '.',
      ),
    ],
  )
}
