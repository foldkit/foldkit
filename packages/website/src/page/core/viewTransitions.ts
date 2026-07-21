import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  bullets,
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { exampleDetailRouter } from '../../route'
import * as Snippet from '../../snippet'
import {
  type CopiedSnippets,
  codeBlock,
  highlightedCodeBlock,
} from '../../view/codeBlock'

const TYPES_CSS = `::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 300ms;
}

:root:active-view-transition-type(to-detail)::view-transition-old(root) {
  animation-name: slide-out-to-left;
}

:root:active-view-transition-type(to-detail)::view-transition-new(root) {
  animation-name: slide-in-from-right;
}

:root:active-view-transition-type(to-gallery)::view-transition-old(root) {
  animation-name: slide-out-to-right;
}

:root:active-view-transition-type(to-gallery)::view-transition-new(root) {
  animation-name: slide-in-from-left;
}`

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const routeChangesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'animating-route-changes',
  text: 'Animating Route Changes',
}

const typesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'direction-aware-types',
  text: 'Direction-Aware Types',
}

const sharedElementsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'shared-elements',
  text: 'Shared Elements',
}

const skippedHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'when-transitions-are-skipped',
  text: 'When Transitions Are Skipped',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  routeChangesHeader,
  typesHeader,
  sharedElementsHeader,
  skippedHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/view-transitions', 'View Transitions'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The browser’s View Transitions API animates between two DOM states. The browser snapshots the page, you mutate the DOM inside a callback, and CSS animates from the old snapshot to the new state: cross-fades, slides, and shared-element morphs, all off the main thread.',
      ),
      para(
        'The API expects the DOM update to happen inside ',
        inlineCode('document.startViewTransition(callback)'),
        '. Foldkit owns the render schedule, so application code has no correct place to make that call. The ',
        inlineCode('viewTransition'),
        ' option on ',
        inlineCode('makeApplication'),
        ' and ',
        inlineCode('makeElement'),
        ' closes the gap: when a render qualifies, the runtime calls ',
        inlineCode('startViewTransition'),
        ' itself and performs that render inside the callback. A Foldkit render is fully synchronous, which is exactly the contract the API wants.',
      ),
      tableOfContentsEntryToHeader(routeChangesHeader),
      para(
        'Pass a predicate. Before each render it receives the Model and the Message that dirtied it, and decides whether that render should animate. Messages are facts, so “animate navigations but not keystrokes” is one line:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.viewTransitionRouteChangesHighlighted),
          ],
          [],
        ),
        Snippet.viewTransitionRouteChangesRaw,
        'viewTransition on makeApplication',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Return ',
        inlineCode('false'),
        ' for a plain render, exactly as cheap as before. Return ',
        inlineCode('true'),
        ' to wrap the render in a transition. With no extra CSS, the browser cross-fades the whole page.',
      ),
      tableOfContentsEntryToHeader(typesHeader),
      para(
        'Return ',
        inlineCode('{ types }'),
        ' instead of ',
        inlineCode('true'),
        ' to tag the transition. The predicate already has the destination in the Model, so encoding direction is pure logic:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.viewTransitionDirectionTypesHighlighted),
          ],
          [],
        ),
        Snippet.viewTransitionDirectionTypesRaw,
        'Direction-aware transition types',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'CSS scopes animations to the active types with ',
        inlineCode(':active-view-transition-type(...)'),
        ', so drilling into a detail page slides one way and returning slides back:',
      ),
      codeBlock(
        TYPES_CSS,
        'CSS scoped by transition type',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(sharedElementsHeader),
      para(
        'Give an element a ',
        inlineCode('viewTransitionName'),
        ' with ',
        inlineCode('h.Style'),
        ' and the browser pairs elements that share a name across the old and new states, morphing position, size, and shape between them. A gallery card growing into a detail hero needs nothing more than the same name on both sides:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.viewTransitionSharedElementHighlighted),
          ],
          [],
        ),
        Snippet.viewTransitionSharedElementRaw,
        'Shared-element morph via viewTransitionName',
        copiedSnippets,
        'mb-8',
      ),
      infoCallout(
        'Names must be unique',
        'A ',
        inlineCode('viewTransitionName'),
        ' may appear at most once per snapshot. Derive names from stable Model identifiers, the same way you key list items.',
      ),
      tableOfContentsEntryToHeader(skippedHeader),
      para(
        'The predicate decides which renders animate, and the runtime falls through to a plain synchronous render whenever a transition cannot or should not run:',
      ),
      bullets(
        'The browser does not support the View Transitions API. Browsers that support the API but not transition types run the transition untyped.',
        'The user has set prefers-reduced-motion: reduce.',
        'The render is not a Live render: DevTools time-travel replays, crash views, and the initial render never animate.',
        'The predicate returns false.',
      ),
      para(
        'Two scheduling details are worth knowing. First, the runtime coalesces a burst of Messages into one render frame, so the predicate sees the last dirtying Message before the frame. That is the right Message for navigation, which is what transitions are for. Second, the runtime never blocks on the transition, so follow-up renders paint immediately. The render runs inside the transition’s DOM update phase, and renders that land mid-animation are picked up live by the new-state snapshot.',
      ),
      para(
        'See the ',
        link(
          exampleDetailRouter({ exampleSlug: 'view-transitions' }),
          'view-transitions example',
        ),
        ' for direction-aware route slides, a shared-element gallery, and a filter input that never animates.',
      ),
    ],
  )
}
