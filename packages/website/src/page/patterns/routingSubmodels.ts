import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
  warningCallout,
} from '../../prose'
import {
  exampleDetailRouter,
  patternsSubmodelsRouter,
  routingAndNavigationRouter,
} from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const twoScenariosHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'two-url-change-scenarios',
  text: 'Two URL-Change Scenarios',
}

const childMessageHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'declaring-changed-route',
  text: 'Declaring ChangedRoute in the Child',
}

const parentDispatchHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'forwarding-from-the-parent',
  text: 'Forwarding from the Parent',
}

const childReactsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'reacting-in-the-child',
  text: 'Reacting in the Child',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  twoScenariosHeader,
  childMessageHeader,
  parentDispatchHeader,
  childReactsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('patterns/routing-submodels', 'Routing & Submodels'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A user lands on ',
        inlineCode('/people?searchText=designer'),
        ', types ',
        inlineCode('developer'),
        ' into the search box (the URL updates to match), and then hits the back button. The URL flips back to ',
        inlineCode('?searchText=designer'),
        ', but the search input still shows ',
        inlineCode('developer'),
        '. The Submodel that owns the input never heard about the URL change. Its state is stale.',
      ),
      para(
        'When the root ',
        inlineCode('ChangedUrl'),
        ' Message arrives, the parent updates ',
        inlineCode('model.route'),
        ' and re-renders. That handles routes the parent owns. But a Submodel with its own state needs to know the URL changed so it can sync. The pattern: the Submodel exposes its own ',
        inlineCode('ChangedRoute'),
        ' Message, and the parent forwards it through the existing ',
        inlineCode('Got*Message'),
        ' channel whenever the URL change targets a route the Submodel handles.',
      ),
      infoCallout(
        'Prerequisite',
        'This page builds on the ',
        link(patternsSubmodelsRouter(), 'Submodels'),
        ' pattern. Read that first if the ',
        inlineCode('Got*Message'),
        ' wrapping convention is unfamiliar.',
      ),
      tableOfContentsEntryToHeader(twoScenariosHeader),
      para(
        'A URL change can do two different things, and they call for different responses:',
      ),
      para(
        h.strong([], ['Page swap.']),
        ' The user navigates from ',
        inlineCode('/home'),
        ' to ',
        inlineCode('/settings'),
        '. A different Submodel becomes active. The parent calls the new Submodel’s ',
        inlineCode('init'),
        ' to build its initial state. The old Submodel’s state is discarded (or kept in the parent Model if you want to preserve it). No forwarding needed; this is just re-initialization.',
      ),
      para(
        h.strong([], ['Same-page change.']),
        ' The user navigates from ',
        inlineCode('/people?searchText=foo'),
        ' to ',
        inlineCode('/people?searchText=bar'),
        ', or from ',
        inlineCode('/people/1'),
        ' to ',
        inlineCode('/people/2'),
        '. The Submodel stays mounted; only the route parameters changed. ',
        inlineCode('init'),
        ' is the wrong tool here, because re-initializing would discard any state the user has built up (form drafts, scroll position, request inflight). Instead, the Submodel exposes a ',
        inlineCode('ChangedRoute'),
        ' Message that lets it react to the new parameters in place.',
      ),
      para(
        'This page focuses on the same-page case. The page-swap case is just ',
        link(patternsSubmodelsRouter(), 'Submodel embedding'),
        ' applied at ',
        inlineCode('ChangedUrl'),
        ' time.',
      ),
      tableOfContentsEntryToHeader(childMessageHeader),
      para(
        'The Submodel declares ',
        inlineCode('ChangedRoute'),
        ' alongside its other Messages, typed with whatever slice of the App Route it owns. If the Submodel only handles the People route, ',
        inlineCode('ChangedRoute'),
        ' carries a ',
        inlineCode('PeopleRoute'),
        ', not the full ',
        inlineCode('AppRoute'),
        '. That narrowing is what makes the Submodel reusable: it states up front which routes it understands.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.routingSubmodelsChildMessageHighlighted),
          ],
          [],
        ),
        Snippets.routingSubmodelsChildMessageRaw,
        'Copy child Message to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      warningCallout(
        'Not an OutMessage',
        inlineCode('ChangedRoute'),
        ' flows from parent to child, not child to parent. It is a normal child Message that the parent happens to dispatch. The ',
        link(patternsSubmodelsRouter(), 'OutMessage'),
        ' pattern goes the other direction.',
      ),
      tableOfContentsEntryToHeader(parentDispatchHeader),
      para(
        'The parent’s ',
        inlineCode('ChangedUrl'),
        ' handler resolves the new URL into a Route, updates ',
        inlineCode('model.route'),
        ', then branches on the route tag. When the new Route belongs to a mounted Submodel, the parent dispatches ',
        inlineCode('ChangedRoute'),
        ' into that Submodel through its existing ',
        inlineCode('Got*Message'),
        ' channel. No new wiring; the same call shape that handles user-triggered messages also carries the parent-triggered one.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.routingSubmodelsParentDispatchHighlighted),
          ],
          [],
        ),
        Snippets.routingSubmodelsParentDispatchRaw,
        'Copy parent dispatch to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The ',
        inlineCode('liftPeopleResult'),
        ' helper does the standard ',
        link(patternsSubmodelsRouter(), 'Submodel'),
        ' work: writes the new child Model into the parent slice and maps the child Commands into ',
        inlineCode('GotPeopleMessage'),
        '. Both branches of ',
        inlineCode('ChangedUrl'),
        ' (synthetic dispatch via ',
        inlineCode('ChangedRoute'),
        ' and the no-op branch for non-People routes) use the same lift, so the parent never duplicates wrapping logic.',
      ),
      infoCallout(
        'Multiple Submodels',
        'When several Submodels each own different routes, list a ',
        inlineCode('M.tag'),
        ' arm per Submodel inside ',
        inlineCode('ChangedUrl'),
        '. Each arm forwards ',
        inlineCode('ChangedRoute'),
        ' to the Submodel whose route just became active.',
      ),
      tableOfContentsEntryToHeader(childReactsHeader),
      para(
        'The Submodel handles ',
        inlineCode('ChangedRoute'),
        ' like any other Message. Pull the new parameters out of the route, sync any local state that mirrors the URL, fire Commands for anything that depends on the new parameters (a refetch, for example). The user-typed ',
        inlineCode('ChangedSearchInput'),
        ' branch is the other half of the same field: typing updates the local state and pushes the URL; the URL change loops back through ',
        inlineCode('ChangedRoute'),
        ' to keep the input correct when the browser back button is the one driving the change.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.routingSubmodelsChildUpdateHighlighted),
          ],
          [],
        ),
        Snippets.routingSubmodelsChildUpdateRaw,
        'Copy child update to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'See the ',
        link(
          exampleDetailRouter({ exampleSlug: 'routing' }),
          'Routing example',
        ),
        ' for a full implementation: the People Submodel owns a controlled search input plus a recent-searches list, and both stay in sync with the URL whether the user types, clicks a link, or uses the browser back button. The ',
        link(routingAndNavigationRouter(), 'Routing & Navigation'),
        ' guide covers the route parser machinery the parent uses to turn URLs into the Routes this page assumes.',
      ),
    ],
  )
}
