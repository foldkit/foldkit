import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { TableOfContentsEntry } from '../../main'
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
  coreSubscriptionsRouter,
  coreTaskRouter,
  coreViewRouter,
  exampleDetailRouter,
} from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const onMountHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'on-mount',
  text: 'OnMount',
}

const subscriptionsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'pairing-with-subscriptions',
  text: 'Pairing with Subscriptions',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  onMountHeader,
  subscriptionsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/lifecycle-hooks', 'Lifecycle Hooks'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Most Foldkit code is declarative. The ',
        link(coreViewRouter(), 'view'),
        ' is a function from Model to Html. It doesn’t reach into the DOM, it doesn’t hold references, it doesn’t run side effects. That purity is what makes Foldkit programs predictable.',
      ),
      para(
        'Lifecycle hooks are the seam where view code can drop down to imperative DOM work when it has to. ',
        inlineCode('OnMount'),
        ' is the only primitive: it runs an ',
        inlineCode('Effect'),
        ' with the live ',
        inlineCode('Element'),
        ' the moment it enters the page, and pairs it with cleanup that fires when the element unmounts. The Effect resolves to a Message that flows back through ',
        inlineCode('update'),
        ' like every other side effect in the architecture.',
      ),
      infoCallout(
        'Functional core, imperative shell',
        'The view describes what should be on screen. ',
        inlineCode('OnMount'),
        ' describes what to do at the boundary where the virtual DOM meets the real one. Mount-time async work stays expressed as an ',
        inlineCode('Effect'),
        ', so its outcome flows back through update like any other Message. The cleanup is data, not a separate hook: paired with the setup as a single value the runtime owns.',
      ),
      warningCallout(
        'Before reaching for OnMount',
        'Most DOM work in a Foldkit app belongs elsewhere. Use ',
        link(coreTaskRouter(), 'Task'),
        ' for action-triggered DOM work like focus and scrolling, Commands for side effects (whether from a Message or returned from ',
        inlineCode('init'),
        '), and ',
        link(coreSubscriptionsRouter(), 'Subscriptions'),
        ' for ongoing event streams. ',
        inlineCode('OnMount'),
        ' earns its keep specifically when a library or browser API requires the live ',
        inlineCode('Element'),
        ' handed to view code.',
      ),
      tableOfContentsEntryToHeader(onMountHeader),
      para(
        'The most common reason to reach for ',
        inlineCode('OnMount'),
        ' is a library that owns its own DOM. Charts, code editors, map renderers, force-directed graphs: each expects a real element to render into and a way to be torn down later.',
      ),
      para(
        'It takes an ',
        inlineCode('(element: Element) => Effect<MountResult<Message>>'),
        '. The Effect resolves to a ',
        inlineCode('{ message, cleanup }'),
        ' record. The runtime dispatches the Message and stashes the cleanup. When Snabbdom later removes the node, ',
        inlineCode('OnMount'),
        ' invokes the cleanup automatically. For setup with no cleanup, pass ',
        inlineCode('Function.constVoid'),
        ' as the cleanup.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.lifecycleHooksThirdPartyChartHighlighted),
          ],
          [],
        ),
        Snippets.lifecycleHooksThirdPartyChartRaw,
        'Copy OnMount example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The Model owns the data going in. The library owns its rendered subtree. The runtime owns the lifecycle.',
      ),
      infoCallout(
        'What if the Effect is still in flight when the element is removed?',
        'The runtime tracks both states. If unmount happens before the Effect resolves, the cleanup runs as soon as it arrives and the Message is suppressed. The chart never leaks, the Model never sees a Mounted Message for an element that’s already gone.',
      ),
      tableOfContentsEntryToHeader(subscriptionsHeader),
      para(
        'To handle events from a mounted DOM node, like a code editor’s buffer changes, a map’s viewport, or a zoom gesture’s deltas, pair ',
        inlineCode('OnMount'),
        ' with a ',
        link(coreSubscriptionsRouter(), 'Subscription'),
        '. Dispatch a stable identifier for the element from the mount Message, store it in the Model, and key a Subscription on that identifier. The Subscription attaches the library’s listeners and emits a Message for each event. ',
        inlineCode('OnMount'),
        ' announces the seam exists. The Subscription carries the traffic.',
      ),
      para(
        'The ',
        link(exampleDetailRouter({ exampleSlug: 'map' }), 'Map example'),
        ' demonstrates the pattern: ',
        inlineCode('OnMount'),
        ' constructs the MapLibre instance and dispatches the host id; the Subscription keyed on that id wires up ',
        inlineCode('moveend'),
        ' and marker-click listeners and emits ',
        inlineCode('MovedMap'),
        ' / ',
        inlineCode('ClickedMarker'),
        ' Messages back into the Model.',
      ),
    ],
  )
