import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div, li, ul } from '../../html'
import { Link } from '../../link'
import type { TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { exampleDetailRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/subscriptions', 'Subscriptions'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Commands handle one-off side effects \u2014 a slip to the kitchen that comes back with a result. But what about ongoing streams? In the restaurant analogy, a subscription is a standing order: \u201Ckeep the coffee coming for table 5.\u201D For timers, ',
        inlineCode('WebSocket'),
        ' connections, or keyboard input, Foldkit provides subscriptions.',
      ),
      para(
        'A Subscription is a reactive binding between your Model and a long-running stream. You declare which part of the Model the Subscription depends on, and Foldkit manages the stream lifecycle automatically — starting it when dependencies are met, stopping it when they change.',
      ),
      para(
        'Here\u2019s how we add auto-counting to the counter. When ',
        inlineCode('isAutoCounting'),
        ' is ',
        inlineCode('true'),
        ', a stream ticks every second. When it flips to ',
        inlineCode('false'),
        ', the stream stops.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.counterAutoCountHighlighted)],
          [],
        ),
        Snippets.counterAutoCountRaw,
        'Copy subscription example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The key concept is ',
        inlineCode('SubscriptionDeps'),
        '. This schema defines what parts of the Model your Subscriptions depend on. Each Subscription has two functions:',
      ),
      ul(
        [Class('list-disc mb-8 space-y-2')],
        [
          li(
            [],
            [
              inlineCode('modelToDependencies'),
              ' extracts the relevant dependencies from the Model.',
            ],
          ),
          li(
            [],
            [
              inlineCode('dependenciesToStream'),
              ' creates a stream based on those dependencies.',
            ],
          ),
        ],
      ),
      para(
        'Foldkit structurally compares the dependencies between model updates. The stream is only restarted when the dependencies actually change, not on every model update.',
      ),
      para(
        'When ',
        inlineCode('isAutoCounting'),
        ' changes from ',
        inlineCode('false'),
        ' to ',
        inlineCode('true'),
        ', the stream starts ticking. When it changes back to ',
        inlineCode('false'),
        ', the stream stops. Foldkit handles all the lifecycle management for you.',
      ),
      para(
        'For a more complex example using ',
        inlineCode('WebSocket'),
        ' connections, see the ',
        link(
          exampleDetailRouter({ exampleSlug: 'websocket-chat' }),
          'websocket-chat example',
        ),
        '. For a full real-world application, check out ',
        link(Link.typingTerminal, 'Typing Terminal'),
        ' (',
        link(Link.typingTerminalSource, 'source'),
        ').',
      ),
      para(
        'Subscriptions produce a ',
        inlineCode('Stream<Message>'),
        '. Your ',
        inlineCode('dependenciesToStream'),
        ' function returns what happened, and the runtime feeds each Message into update. If a stream callback needs to perform a side effect before producing a Message \u2014 like calling ',
        inlineCode('event.preventDefault()'),
        ' \u2014 use ',
        inlineCode('Stream.mapEffect'),
        '.',
      ),
      para(
        'You\u2019ve now seen how state changes flow through update, how one-off side effects work as Commands, and how ongoing streams are managed with Subscriptions. But where do the first Model and Commands come from? That\u2019s ',
        inlineCode('init'),
        '.',
      ),
    ],
  )
