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
        'Commands handle one-off side effects \u2014 a slip to the kitchen that comes back with a result. But what about ongoing streams? In the restaurant analogy, a subscription is a standing order: "keep the coffee coming for table 5." For timers, ',
        inlineCode('WebSocket'),
        ' connections, or keyboard input, Foldkit provides subscriptions.',
      ),
      para(
        'A Subscription is a reactive binding between your Model and a long-running stream. You declare which part of the Model the Subscription depends on, and Foldkit manages the stream lifecycle automatically — starting it when dependencies are met, stopping it when they change.',
      ),
      para(
        "Here's how we add auto-counting to the counter. When ",
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
              inlineCode('depsToStream'),
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
        link(Link.exampleWebsocketChat, 'websocket-chat example'),
        '. For a full real-world application, check out ',
        link(Link.typingTerminal, 'Typing Terminal'),
        ' (',
        link(Link.typingTerminalSource, 'source'),
        ').',
      ),
      para(
        "If you're coming from Elm, you may notice subscriptions in Foldkit produce ",
        inlineCode('Command<Message>'),
        ' rather than plain ',
        inlineCode('Message'),
        ". In most cases you'll just wrap a message in ",
        inlineCode('Effect.succeed'),
        ', but the Command wrapper lets a stream item do its own async work — like decoding a ',
        inlineCode('WebSocket'),
        ' frame — before producing the Message that update sees.',
      ),
      para(
        "You've now seen how state changes flow through update, how one-off side effects work as Commands, and how ongoing streams are managed with Subscriptions. But where do the first Model and Commands come from? That's init.",
      ),
    ],
  )
