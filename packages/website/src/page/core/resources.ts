import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { Link } from '../../link'
import type { Model, TableOfContentsEntry } from '../../main'
import {
  callout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import * as Snippets from '../../snippet'
import { highlightedCodeBlock } from '../../view/codeBlock'

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

export const view = (model: Model): Html =>
  div(
    [],
    [
      pageTitle('core/resources', 'Resources'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Commands are self-contained by default — each execution starts fresh with no shared state. But some browser APIs like ',
        inlineCode('AudioContext'),
        ', ',
        inlineCode('RTCPeerConnection'),
        ', or ',
        inlineCode('CanvasRenderingContext2D'),
        ' need a single long-lived instance shared across commands. That\u2019s what ',
        inlineCode('resources'),
        ' is for.',
      ),
      para(
        'Define a service using ',
        link(Link.effectService, 'Effect.Service'),
        ', then pass its default layer to ',
        inlineCode('makeElement'),
        ' or ',
        inlineCode('makeApplication'),
        ' via the ',
        inlineCode('resources'),
        ' config field. The runtime memoizes the layer once and provides it to every command and subscription automatically.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.resourcesHighlighted),
          ],
          [],
        ),
        Snippets.resourcesRaw,
        'Copy resources example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'Commands declare their resource requirements in the type signature via the third type parameter of ',
        inlineCode('Command'),
        '. This makes dependencies explicit and type-checked — if a command requires a service that isn\u2019t provided via ',
        inlineCode('resources'),
        ', you\u2019ll get a compile error.',
      ),
      callout(
        'When not to use resources',
        para(
          'Resources are for mutable browser singletons with lifecycle — things that must be created once and reused. Stateless services like ',
          inlineCode('HttpClient'),
          ' or ',
          inlineCode('BrowserKeyValueStore'),
          ' should be provided per-command with ',
          inlineCode('Effect.provide'),
          ' instead.',
        ),
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
          [
            Class('text-sm'),
            InnerHTML(Snippets.resourcesMultipleHighlighted),
          ],
          [],
        ),
        Snippets.resourcesMultipleRaw,
        'Copy multiple resources example to clipboard',
        model,
        'mb-8',
      ),
    ],
  )
