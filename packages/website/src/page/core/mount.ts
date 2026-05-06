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
  coreCommandsRouter,
  coreManagedResourcesRouter,
  coreSubscriptionsRouter,
  coreViewRouter,
  exampleDetailRouter,
  testingSceneRouter,
} from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const whenToReachForMountHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'when-to-reach-for-mount',
  text: 'When to Reach for Mount',
}

const sideEffectsOnMountHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'side-effects-on-mount',
  text: 'Side Effects on Mount',
}

const thirdPartyLibrariesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'third-party-libraries',
  text: 'Third-Party Libraries',
}

const subscriptionsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'pairing-with-subscriptions',
  text: 'Pairing with Subscriptions',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  whenToReachForMountHeader,
  sideEffectsOnMountHeader,
  thirdPartyLibrariesHeader,
  subscriptionsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/mount', 'Mount'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Most Foldkit code is declarative. The ',
        link(coreViewRouter(), 'view'),
        ' is a function from Model to Html. It doesn’t reach into the DOM, it doesn’t hold references, it doesn’t run side effects. That purity is what makes Foldkit programs predictable.',
      ),
      para(
        'Mount is the moment an element enters the live DOM, when the virtual DOM becomes real. ',
        inlineCode('OnMount'),
        ' is the seam where view code can drop down to imperative work at that moment. It runs an ',
        inlineCode('Effect'),
        ' with the live ',
        inlineCode('Element'),
        ', and pairs it with cleanup that fires when the element unmounts. The Effect resolves to a Message that flows back through ',
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
      infoCallout(
        'Mounts surface in tests',
        'Scene tracks every ',
        inlineCode('OnMount'),
        ' in the rendered view as a pending mount and requires the test to acknowledge each one with the result Message its Effect would resolve to at runtime. See ',
        link(testingSceneRouter(), 'Scene'),
        ' for the full contract.',
      ),
      tableOfContentsEntryToHeader(whenToReachForMountHeader),
      para(
        'Mount is one of three lifecycle-bearing primitives Foldkit offers. Pick by what causes the side effect, not by what feels most ergonomic.',
      ),
      para(
        link(coreCommandsRouter(), 'Command'),
        ' fires a one-time side effect because ',
        inlineCode('update'),
        ' just returned it. The cause is a Message that just dispatched. ',
        inlineCode('FocusInput'),
        ' after ',
        inlineCode('OpenedDialog'),
        ', ',
        inlineCode('FetchWeather'),
        ' after ',
        inlineCode('ClickedRefresh'),
        ', ',
        inlineCode('SaveTodos'),
        ' after ',
        inlineCode('EditedTodo'),
        '. Navigation, network, storage, analytics, and focus-on-state-change all belong in Commands.',
      ),
      para(
        'Mount fires a per-instance lifecycle effect bound to a VNode existing in the rendered tree. The cause is the element appearing, and the author needs the live ',
        inlineCode('Element'),
        ' handle. Anchor positioning for floating panels, backdrop portaling, attaching observers to a specific element, handing the element to a third-party library: these are Mount cases.',
      ),
      para(
        link(coreManagedResourcesRouter(), 'ManagedResource'),
        ' holds a stateful runtime object (a websocket, a camera stream, a third-party library instance) whose lifetime is tied to a Model condition AND whose handle is consumed by Commands via ',
        inlineCode('yield*'),
        '. The condition determines lifetime; Commands do the work on the resource.',
      ),
      infoCallout(
        'Don’t reach for Mount just because the work happens to coincide with an element appearing',
        'Check what causes the work. If a Message just dispatched (like ',
        inlineCode('Opened'),
        '), the cause is the Message, not the element. The element’s appearance is coincidentally co-timed with the Message but isn’t what causes the work. Use a Command returned from ',
        inlineCode('update'),
        '’s handler instead. For example, focusing a search input when its dialog opens: the element appears, but the cause is ',
        inlineCode('Opened'),
        ', not the input’s existence. A ',
        inlineCode('FocusInput'),
        ' Command returned from the ',
        inlineCode('Opened'),
        ' handler is the right shape.',
      ),
      tableOfContentsEntryToHeader(sideEffectsOnMountHeader),
      para(
        'A typical Mount uses the element parameter to do DOM work that should pair with the element existing. Portal-to-body is the canonical small example: when this overlay element appears, move it to ',
        inlineCode('document.body'),
        ' so it escapes any clipping ancestor; when it unmounts, remove it. The Effect uses the element directly, the work is DOM manipulation, the cleanup mirrors the setup.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.mountPortalToBodyHighlighted)],
          [],
        ),
        Snippets.mountPortalToBodyRaw,
        'Copy portal-to-body example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The cleanup is a function value, not a separate hook. The runtime invokes it when Snabbdom destroys the element. Pair the setup and the cleanup as one expression so the "do the thing" and "undo the thing" stay together.',
      ),
      infoCallout(
        'Two practical rules for Mount',
        'Both must hold. First, the Effect uses the element parameter. Mount provides the live element handle, and that handle is what makes Mount distinct from the alternatives. If your Effect doesn’t read or write the element, pick a different primitive. Second, the work is DOM measurement or DOM manipulation on that element: read its geometry, mutate its CSS, attach an observer to it, portal it, hand it to a third-party library. Anything else (network, storage, analytics, focus-on-transition, scroll lock for the page) is a Command from update or a ManagedResource keyed on Model.',
      ),
      warningCallout(
        'Mount Effects re-run during DevTools time-travel',
        'When a user scrubs through history with the DevTools timeline, Foldkit re-renders the historical Model. Elements that carry ',
        inlineCode('OnMount'),
        ' fire their Effects again as their VNodes are inserted, and the cleanup runs as they are destroyed. The two rules above are what keep Mount work inherently replay-safe: DOM measurement is read-only, DOM manipulation on an element that exists in both live and time-travel views is idempotent, observer attachment paired with cleanup is self-balancing. Anything that mutates external state (network calls, storage writes, focus-on-transition, scroll lock for the page, library instantiation keyed on Model rather than element) is unsafe to re-run during replay and therefore not a Mount.',
      ),
      tableOfContentsEntryToHeader(thirdPartyLibrariesHeader),
      para(
        inlineCode('OnMount'),
        ' really earns its keep when a library owns its own DOM. Charts, code editors, map renderers, force-directed graphs: each expects a real element to render into and a way to be torn down later.',
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
            InnerHTML(Snippets.mountThirdPartyChartHighlighted),
          ],
          [],
        ),
        Snippets.mountThirdPartyChartRaw,
        'Copy OnMount example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The Model owns the data going in. The library owns its rendered subtree. The runtime owns the lifecycle.',
      ),
      infoCallout(
        'What if the Effect is still in flight when the element is removed?',
        'The runtime handles this. When the Effect resolves, it checks whether the element is still mounted. If the element was removed while the Effect was in flight, the runtime runs the returned cleanup function immediately and suppresses the result Message. The Model never sees a mount Message for an element that no longer exists, and any library teardown the cleanup performs still runs.',
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
