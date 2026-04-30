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
} from '../../prose'
import { coreSubscriptionsRouter, coreViewRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const onInsertHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'on-insert',
  text: 'OnInsert',
}

const onInsertEffectHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'on-insert-effect',
  text: 'OnInsertEffect',
}

const thirdPartyLibrariesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'third-party-libraries',
  text: 'Integrating a Third-Party Library',
}

const limitsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'limits',
  text: 'What Lifecycle Hooks Don\u2019t Solve',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  onInsertHeader,
  onInsertEffectHeader,
  thirdPartyLibrariesHeader,
  limitsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/lifecycle-hooks', 'Lifecycle Hooks'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The ',
        link(coreViewRouter(), 'view'),
        ' is a function from Model to Html. It doesn\u2019t reach into the DOM, it doesn\u2019t hold references, it doesn\u2019t run side effects. That purity is what makes Foldkit programs predictable and testable.',
      ),
      para(
        'But sometimes you need a real DOM node to do something a virtual DOM can\u2019t describe: focus an input the moment it appears, hand a div to a charting library, attach a Mapbox instance. Foldkit gives you three attribute-shaped escape hatches for those moments:',
      ),
      para(
        inlineCode('OnInsert'),
        ', ',
        inlineCode('OnInsertEffect'),
        ', and ',
        inlineCode('OnDestroy'),
        '. They run when an element mounts (or unmounts), they receive the real ',
        inlineCode('Element'),
        ', and they keep the imperative work confined to the seam where it has to live. Everything else stays declarative.',
      ),
      infoCallout(
        'Functional core, imperative shell',
        'The view describes what should be on screen. Lifecycle hooks describe what to do at the boundary where the virtual DOM meets the real one. ',
        inlineCode('OnInsertEffect'),
        ' is the strongest version of this idea: even mount-time async work stays expressed as an ',
        inlineCode('Effect<Message>'),
        ', so its outcome flows back through update like any other Message.',
      ),
      tableOfContentsEntryToHeader(onInsertHeader),
      para(
        inlineCode('OnInsert'),
        ' takes an ',
        inlineCode('(element: Element) => void'),
        '. It runs synchronously when the element mounts, and it produces no Message. Reach for it when the work is genuinely fire-and-forget: focusing an input, scrolling to a position, calling into a DOM library where nothing about the result needs to update the Model.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.lifecycleHooksOnInsertHighlighted),
          ],
          [],
        ),
        Snippets.lifecycleHooksOnInsertRaw,
        'Copy OnInsert example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Foldkit\u2019s own UI components use this shape internally. ',
        inlineCode('Ui.Menu'),
        ' uses ',
        inlineCode('OnInsert'),
        ' to focus the menu surface when it opens, ',
        inlineCode('Ui.Listbox'),
        ' does the same for the listbox, and ',
        inlineCode('Ui.Combobox'),
        ' uses it to keep focus on the input during pointer interactions. The pattern is consistent: a small DOM operation that has to happen exactly when the element appears, with no Message-shaped outcome.',
      ),
      tableOfContentsEntryToHeader(onInsertEffectHeader),
      para(
        inlineCode('OnInsertEffect'),
        ' takes an ',
        inlineCode('(element: Element) => Effect<Message>'),
        '. When the element mounts, the runtime executes the Effect, dispatches the resulting Message, and any failure is logged rather than crashing the app. Reach for it when the mount-time work is async, and its success or failure must reach the Model.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.lifecycleHooksOnInsertEffectHighlighted),
          ],
          [],
        ),
        Snippets.lifecycleHooksOnInsertEffectRaw,
        'Copy OnInsertEffect example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'This is the same pattern Commands use, just triggered by mount instead of by an update branch. The Effect runs through the runtime, errors are routed through ',
        inlineCode('Effect.catchAll'),
        ' into a failure Message, and the result becomes a fact that update can react to.',
      ),
      infoCallout(
        'Why an Effect, not a Promise',
        'A Promise would still work for one-shot async, but it would be a second seam: Foldkit would have to dispatch its result through a different path than every other side effect in the program. By taking an Effect, ',
        inlineCode('OnInsertEffect'),
        ' shares the same execution and error model as Commands. One mental model covers both.',
      ),
      tableOfContentsEntryToHeader(thirdPartyLibrariesHeader),
      para(
        'The most common reason to reach for these primitives is to embed a third-party library that owns its own DOM. Charting libraries, code editors, map renderers, force-directed graphs: they all expect a real element to render into and a way to be torn down later. The pattern is the same in every case.',
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
        'Copy third-party library example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        inlineCode('OnInsertEffect'),
        ' dynamically imports the library, attaches it to the element Foldkit hands us, and stashes the teardown function in a ',
        inlineCode('WeakMap'),
        ' keyed by the element. When Snabbdom later removes the node, ',
        inlineCode('OnDestroy'),
        ' runs synchronously, finds the cleanup, and calls it. The Model stays the source of truth for the data going in. The library owns its rendered subtree. Neither side reaches into the other.',
      ),
      tableOfContentsEntryToHeader(limitsHeader),
      para(
        inlineCode('OnInsertEffect'),
        ' produces exactly one Message: the result of running the Effect. That covers async setup work cleanly, but it does not cover ongoing event streams. If the library you mounted emits events you want in the Model (a code editor\u2019s buffer changes, a map\u2019s viewport, a zoom gesture\u2019s deltas), a single mount-time Message is the wrong shape.',
      ),
      para(
        'Dispatch the element reference out via the mount Message, hold it in the Model, and bridge the library\u2019s ongoing events through a ',
        link(coreSubscriptionsRouter(), 'Subscription'),
        '. Subscriptions exist to model continuous external sources: a Subscription keyed on the element ref can attach the library\u2019s listeners and emit a Message for each event. ',
        inlineCode('OnInsertEffect'),
        ' announces the seam exists. The Subscription carries the traffic.',
      ),
      para(
        'Foldkit also doesn\u2019t expose ',
        inlineCode('OnDestroyEffect'),
        '. Cleanup tends to be synchronous (cancel a timer, call ',
        inlineCode('library.destroy()'),
        ', remove a listener), and there\u2019s no current case where teardown needs to dispatch a Message. If you find one, file an issue.',
      ),
    ],
  )
