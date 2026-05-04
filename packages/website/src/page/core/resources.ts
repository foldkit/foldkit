import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { Link } from '../../link'
import type { TableOfContentsEntry } from '../../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const providingMultipleServicesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'providing-multiple-services',
  text: 'Providing Multiple Services',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  providingMultipleServicesHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/resources', 'Resources'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Commands are self-contained by default. Each execution starts fresh with no shared state. But some browser APIs like ',
        inlineCode('AudioContext'),
        ', ',
        inlineCode('RTCPeerConnection'),
        ', or ',
        inlineCode('CanvasRenderingContext2D'),
        ' need a single long-lived instance shared across commands. That\u2019s what ',
        inlineCode('resources'),
        ' is for.',
      ),
      infoCallout(
        'Think of it like a restaurant kitchen',
        'Resources are kitchen equipment: the oven, the stand mixer, the deep fryer. They\u2019re turned on when the kitchen opens and run all night. Every dish (Command) can use them. You don\u2019t buy a new oven per order. ',
        inlineCode('AudioContext'),
        ' and ',
        inlineCode('CanvasRenderingContext2D'),
        ' are the same: expensive singletons that live for the entire app lifecycle. Need multiple pieces of equipment? Combine them with ',
        inlineCode('Layer.mergeAll'),
        '.',
      ),
      para(
        'Define a service using ',
        link(Link.effectService, 'Context.Service'),
        ', then pass its default layer to ',
        inlineCode('makeProgram'),
        ' via the ',
        inlineCode('resources'),
        ' config field. The runtime creates the layer once and makes it available to every Command. Commands access it by yielding the service tag.',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.resourcesHighlighted)], []),
        Snippets.resourcesRaw,
        'Copy resources example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Commands declare their resource requirements in the type signature via the third type parameter of ',
        inlineCode('Command'),
        '. This makes dependencies explicit and type-checked. If a command requires a service that isn\u2019t provided via ',
        inlineCode('resources'),
        ', you\u2019ll get a compile error.',
      ),
      infoCallout(
        'When not to use resources',
        'Resources are for mutable browser singletons with lifecycle: things that must be created once and reused. Stateless services like ',
        inlineCode('HttpClient'),
        ' or ',
        inlineCode('BrowserKeyValueStore'),
        ' should be provided per-command with ',
        inlineCode('Effect.provide'),
        ' instead. Per-command provision keeps the dependency in the Command’s type signature, so readers can tell at a glance which Commands hit the network. Hoisting these into resources erases that signal.',
      ),
      para(
        'The convenience argument for hoisting is real but has a cheap answer: a one-line helper that applies the layer wherever it’s needed. Define ',
        inlineCode('withHttp'),
        ' once, wrap the HTTP-using portion of each Command, and the boilerplate collapses to a single function call per call site.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.resourcesPerCommandHttpHighlighted),
          ],
          [],
        ),
        Snippets.resourcesPerCommandHttpRaw,
        'Copy per-command HTTP helper to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(providingMultipleServicesHeader),
      para(
        'The ',
        inlineCode('resources'),
        ' field takes a single ',
        inlineCode('Layer'),
        ', but Effect layers compose. Use ',
        inlineCode('Layer.mergeAll'),
        ' to combine multiple service layers into one.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.resourcesMultipleHighlighted)],
          [],
        ),
        Snippets.resourcesMultipleRaw,
        'Copy multiple resources example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Resources live for the entire application. But what if a resource should only exist while the model is in a certain state, like a camera stream during a video call, or a ',
        inlineCode('WebSocket'),
        ' while on a chat page? That\u2019s what Managed Resources are for.',
      ),
    ],
  )
