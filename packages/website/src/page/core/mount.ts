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
  coreCommandsRouter,
  coreManagedResourcesRouter,
  coreSubscriptionsRouter,
  coreViewRouter,
  testingSceneRouter,
} from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const h = html<Message>()

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

const argsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'args',
  text: 'Per-Instance Args',
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
  argsHeader,
  thirdPartyLibrariesHeader,
  subscriptionsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  h.div(
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
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.mountPortalToBodyHighlighted),
          ],
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
      tableOfContentsEntryToHeader(argsHeader),
      para(
        'Mount factories often need a value that varies per instance: an element id to anchor against, the data driving a chart render, the stable host id a Subscription will key on. Declare those values as ',
        inlineCode('args'),
        ' on ',
        inlineCode('Mount.define'),
        ' so the factory receives them as a typed record at view time. The shape mirrors ',
        link(coreCommandsRouter(), 'Commands'),
        ': ',
        inlineCode(
          'Mount.define(name, args, ...results)(({ ...args }) => element => Effect)',
        ),
        '. Calling the Definition with an args record at view time produces a MountAction the runtime feeds into ',
        inlineCode('OnMount'),
        '.',
      ),
      para(
        'Args carry the inputs that vary per instance. Anything else the factory needs comes in through the Effect itself: module-level constants live in lexical scope, app-wide dependencies arrive through Foldkit ',
        inlineCode('Resources'),
        ', model-driven handles arrive through ',
        inlineCode('ManagedResources'),
        ', and any service tag on the Effect’s context channel is pulled with ',
        inlineCode('yield*'),
        '. Args don’t have to carry every value the factory uses; they carry the per-instance inputs.',
      ),
      infoCallout(
        'Args surface in DevTools and tests',
        'Mount args appear in DevTools alongside the Mount name, and Scene tests can match a specific instance by passing the same args record to ',
        inlineCode('Scene.Mount.expectHas'),
        ' or ',
        inlineCode('Scene.Mount.resolve'),
        '. See ',
        link(testingSceneRouter(), 'Scene'),
        ' for the Definition-vs-Instance matcher contract.',
      ),
      tableOfContentsEntryToHeader(thirdPartyLibrariesHeader),
      para(
        inlineCode('OnMount'),
        ' really earns its keep when a library owns its own DOM. Charts, code editors, map renderers, force-directed graphs: each expects a real element to render into and a way to be torn down later.',
      ),
      para(
        'The factory takes the live ',
        inlineCode('Element'),
        ' (and its declared args, when any) and returns a ',
        inlineCode('Stream<Message>'),
        '. The Stream’s lifetime is bound to the element’s lifetime: each emitted Message is dispatched, and the Stream’s scope is closed (running any registered ',
        inlineCode('Effect.acquireRelease'),
        ' finalizers) when the element unmounts. For one-shot work, use ',
        inlineCode('Stream.fromEffect'),
        ' to emit a single Message and let the stream complete. For setup-with-cleanup or continuous-event work, use ',
        inlineCode('Stream.callback'),
        ' with ',
        inlineCode('Effect.acquireRelease'),
        ' and terminate the callback Effect with ',
        inlineCode('Effect.never'),
        ' so the scope stays open until the element is destroyed.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.mountThirdPartyChartHighlighted),
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
        'What if the Stream emits or fails after the element is removed?',
        'The runtime handles this. When the element unmounts, Foldkit interrupts the Stream’s fiber. Interrupt propagates through the Stream’s scope, running any registered ',
        inlineCode('Effect.acquireRelease'),
        ' finalizers (the canonical cleanup mechanism). Messages emitted after interrupt are discarded; the Model never sees a mount Message for an element that no longer exists.',
      ),
      tableOfContentsEntryToHeader(subscriptionsHeader),
      para(
        'For events scoped to a mounted DOM node, like a code editor’s buffer changes, a map’s viewport, or a zoom gesture’s deltas, use ',
        inlineCode('OnMount'),
        ' directly. Inside ',
        inlineCode('Stream.callback'),
        ', attach the library’s listeners during ',
        inlineCode('Effect.acquireRelease'),
        '’s acquire and offer Messages to the Queue from each event handler. The release detaches the listeners when the element unmounts. ',
        link(coreSubscriptionsRouter(), 'Subscriptions'),
        ' remain the right primitive for events keyed on Model conditions (system theme, viewport size, route changes), not on a specific element’s lifetime.',
      ),
    ],
  )
