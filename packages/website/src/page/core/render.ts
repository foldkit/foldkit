import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import {
  apiModuleRouter,
  coreCommandsRouter,
  coreSubscriptionsRouter,
} from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const whenToReachForItHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'when-to-reach-for-it',
  text: 'When to reach for it',
}

const fullApiSurfaceHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'full-api-surface',
  text: 'Full API surface',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  whenToReachForItHeader,
  fullApiSurfaceHeader,
]

const renderApiHref = apiModuleRouter({ moduleSlug: 'render' })

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/render', 'Render'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The ',
        inlineCode('Render'),
        " module exposes two primitives for synchronizing with the browser's render cycle: ",
        inlineCode('Render.afterCommit'),
        ' resumes once the runtime has applied the latest VDOM patch to the DOM. ',
        inlineCode('Render.afterPaint'),
        ' resumes after the prior state has been displayed to the user. Both are Effects you yield inside your own ',
        link(coreCommandsRouter(), 'Commands'),
        ' or ',
        link(coreSubscriptionsRouter(), 'Subscriptions'),
        '.',
      ),
      para(
        'The runtime batches renders to ',
        inlineCode('requestAnimationFrame'),
        '. A Command runs on the microtask queue right after the dispatching Message, which means a synchronous DOM read or write inside that Command sees the tree from before the latest model was patched in. ',
        inlineCode('Render.afterCommit'),
        ' is how you wait for the matching patch to apply.',
      ),
      tableOfContentsEntryToHeader(whenToReachForItHeader),
      para(
        'Reach for ',
        inlineCode('Render.afterCommit'),
        ' when you need to read or measure an element that was just brought into existence (or moved, or had attributes changed) by the same Message. Custom focus, custom scroll restoration, ',
        inlineCode('IntersectionObserver'),
        ' setup inside a Subscription, ',
        inlineCode('getBoundingClientRect'),
        ' for layout work. The ',
        link(`${apiModuleRouter({ moduleSlug: 'dom' })}`, 'Dom helpers'),
        ' already gate themselves with this internally, so reach for ',
        inlineCode('Render.afterCommit'),
        ' directly when building your own.',
      ),
      para(
        'Reach for ',
        inlineCode('Render.afterPaint'),
        ' when you need the browser to actually display the prior state before you change to the next one, typically for CSS transition orchestration. A single ',
        inlineCode('requestAnimationFrame'),
        ' commits the DOM but the pixels have not been painted yet. A second one resumes after that paint is visible, so the from-state is on screen and the to-state can transition smoothly to it.',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.renderBasicHighlighted)], []),
        Snippets.renderBasicRaw,
        'Copy Render examples to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(fullApiSurfaceHeader),
      para(
        'The ',
        link(renderApiHref, 'Render API reference'),
        ' lists every primitive with its signature and an inline example.',
      ),
    ],
  )
