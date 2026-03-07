import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div, strong } from '../../html'
import { Link } from '../../link'
import type { Model, TableOfContentsEntry } from '../../main'
import {
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

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
]

export const view = (model: Model): Html =>
  div(
    [],
    [
      pageTitle('core/subscriptions', 'Subscriptions'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Commands handle one-off side effects, but what about ongoing streams of events? What if we want our counter to tick automatically — incrementing once per second when the user toggles auto-count mode? For ongoing streams like timers, ',
        inlineCode('WebSocket'),
        ' connections, or keyboard input, Foldkit provides ',
        strong([], ['subscriptions']),
        '.',
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
          [
            Class('text-sm'),
            InnerHTML(Snippets.counterAutoCountHighlighted),
          ],
          [],
        ),
        Snippets.counterAutoCountRaw,
        'Copy subscription example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'The key concept is ',
        inlineCode('SubscriptionDeps'),
        '. This schema defines what parts of the Model your Subscriptions depend on. Each Subscription has two functions:',
      ),
      para(
        inlineCode('modelToDependencies'),
        ' extracts the relevant dependencies from the Model.',
      ),
      para(
        inlineCode('depsToStream'),
        ' creates a stream based on those dependencies.',
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
        "If you're coming from Elm, subscriptions in Foldkit produce ",
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
