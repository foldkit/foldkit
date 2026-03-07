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
        'Commands are great for one-off side effects, but what about ongoing streams of events? Think timers, WebSocket connections, or keyboard input. For these, Foldkit provides ',
        strong([], ['Subscriptions']),
        '.',
      ),
      para(
        'A Subscription is a reactive binding between your model and a long-running stream. You declare which part of the model the subscription depends on, and Foldkit manages the stream lifecycle automatically, starting it when the component mounts and restarting it whenever those dependencies change.',
      ),
      para(
        "Let's look at a stopwatch example. We want a timer that ticks every 100ms, but only when ",
        inlineCode('isRunning'),
        ' is ',
        inlineCode('true'),
        '. This gives us a way to start and stop the stopwatch based on user input.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.stopwatchSubscriptionHighlighted),
          ],
          [],
        ),
        Snippets.stopwatchSubscriptionRaw,
        'Copy subscription example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'The key concept is ',
        inlineCode('SubscriptionDeps'),
        '. This schema defines what parts of the model your subscriptions depend on. Each subscription has two functions:',
      ),
      para(
        inlineCode('modelToDependencies'),
        ' extracts the relevant dependencies from the model.',
      ),
      para(
        inlineCode('depsToStream'),
        ' creates a stream based on those dependencies.',
      ),
      para(
        'Foldkit structurally compares the dependencies between updates. The stream is only restarted when the dependencies actually change, not on every model update.',
      ),
      para(
        'When ',
        inlineCode('isRunning'),
        ' changes from ',
        inlineCode('false'),
        ' to ',
        inlineCode('true'),
        ', the stream starts ticking. When it changes back to ',
        inlineCode('false'),
        ', the stream stops. Foldkit handles all the lifecycle management for you.',
      ),
      para(
        'For a more complex example using WebSocket connections, see the ',
        link(Link.exampleWebsocketChat, 'websocket-chat example'),
        '. For a full real-world application, check out ',
        link(Link.typingTerminal, 'Typing Terminal'),
        ' (',
        link(Link.typingTerminalSource, 'source'),
        ').',
      ),
      para(
        "If you're coming from Elm, Subscriptions in Foldkit produce ",
        inlineCode('Command<Message>'),
        ' rather than plain ',
        inlineCode('Message'),
        '. This means each item in the stream can do async work before resolving to a message, avoiding extra round-trips through ',
        inlineCode('update'),
        '.',
      ),
    ],
  )
