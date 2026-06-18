import { Html, html } from 'foldkit/html'

import type { TableOfContentsEntry } from '../main'
import type { Message } from '../message'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import {
  comingFromReactRouter,
  coreCommandsRouter,
  coreDevToolsRouter,
  coreModelRouter,
  coreSubscriptionsRouter,
  exampleDetailRouter,
} from '../route'
import * as Snippet from '../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'
import { comparisonTable } from '../view/table'

const translatingConceptsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'translating-concepts',
  text: 'Translating Concepts',
}

const asyncStateHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'async-state-is-model-state',
  text: 'Async State Is Model State',
}

const outOfOrderHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'out-of-order-responses',
  text: 'Out-of-Order Responses',
}

const faqHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'faq',
  text: 'FAQ',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  translatingConceptsHeader,
  asyncStateHeader,
  outOfOrderHeader,
  faqHeader,
]

const faqQuestion = (id: string, text: string): Html => {
  const h = html<Message>()

  return h.h3([h.Id(id), h.Class('text-lg font-bold mt-8 mb-3')], [text])
}

const conceptTable: Html = comparisonTable(
  ['TanStack Query', 'Foldkit'],
  [
    [
      [inlineCode('useQuery')],
      ['A Command plus an async-state field in the Model'],
    ],
    [
      ['Query cache (keyed by query key)'],
      ['Model state: one field, or a ', inlineCode('HashMap'), ' keyed by id'],
    ],
    [
      [inlineCode('staleTime'), ' / background refetch'],
      ['A Subscription gated on a Model condition'],
    ],
    [
      ['Request deduplication'],
      ['Collapse it in ', inlineCode('update'), ' (it is just state)'],
    ],
    [
      ['Out-of-order response handling'],
      ['A request id in the Model, checked in ', inlineCode('update')],
    ],
    [
      [inlineCode('invalidateQueries')],
      ['Mark the field stale and return a refetch Command'],
    ],
    [
      [inlineCode('useMutation')],
      ['A Message and a Command, the same as any other effect'],
    ],
    [
      ['Retries'],
      ['Effect’s ', inlineCode('retry'), ' / ', inlineCode('Schedule')],
    ],
    [
      ['TanStack Query Devtools'],
      [
        link(coreDevToolsRouter(), 'Foldkit DevTools'),
        ': inspect the Model and step through every Message',
      ],
    ],
  ],
)

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('coming-from-tanstack-query', 'Coming from TanStack Query'),
      para(
        'TanStack Query is excellent at what it does. If you are coming from it, you are used to caching, background refetching, deduplication, and retries arriving as configuration on a hook. Foldkit has no ',
        inlineCode('useQuery'),
        ', and it does not need one. This page shows where that behavior lives instead.',
      ),
      para(
        'The short version: caching, polling, deduplication, and stale-response handling are not features in Foldkit. They are behavior, expressed with the same primitives you already use for everything else: Model state, the ',
        inlineCode('update'),
        ' function, Commands, and Subscriptions. Each one is those pieces applied to a different situation, not a separate API you reach for. Every one of these behaviors stays right there in your code, readable and traceable, with nothing happening inside a machine you cannot see.',
      ),
      para(
        'TanStack Query packages these behaviors as configuration on a hook (',
        inlineCode('staleTime'),
        ', ',
        inlineCode('refetchOnWindowFocus'),
        ', and the rest), so a lot happens that you did not write and cannot see. Foldkit asks you to express the same behavior as state and transitions you own. The trade is not more code or less, it is hidden machinery versus code you can read.',
      ),
      tableOfContentsEntryToHeader(translatingConceptsHeader),
      para('Here is how the TanStack Query model maps onto Foldkit:'),
      conceptTable,
      tableOfContentsEntryToHeader(asyncStateHeader),
      para(
        'A query has states: loading, success, error, and often a “refreshing with stale data on screen” state. In Foldkit you model those explicitly as a tagged union and store it in the Model. There is no separate cache. The Model is the cache. A single resource lives in one field; a collection of resources keyed by id lives in a ',
        inlineCode('HashMap'),
        '. Reading from cache is reading the Model, and rendering instantly from cache is just rendering the data you already hold.',
      ),
      para(
        'The ',
        link(
          exampleDetailRouter({ exampleSlug: 'api-cache' }),
          'API Cache example',
        ),
        ' builds the core of what TanStack Query gives you (cache-and-revalidate, background polling, instant cache hits) out of nothing but a Model, an ',
        inlineCode('update'),
        ' function, Commands, and one Subscription. It is worth reading top to bottom.',
      ),
      tableOfContentsEntryToHeader(outOfOrderHeader),
      para(
        'Here is a bug that is easy to hit. Fire a request for A, then fire a request for B before A returns. A is slow, B is fast, so B resolves first, then A resolves last and overwrites it. Now you are showing A’s data when the user asked for B.',
      ),
      para(
        'Foldkit does not auto-cancel in-flight effects, and there is no ordering guarantee between independent requests, so this is reachable. You handle it the same way TanStack Query does internally: track the latest request and ignore any response that is not it. Keep a request id in the Model, thread it through the Command into the result Message, and in ',
        inlineCode('update'),
        ' discard any result whose id is no longer current:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.responseRaceGuardHighlighted),
          ],
          [],
        ),
        Snippet.responseRaceGuardRaw,
        'Copy response race guard',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'The late response for an earlier query sees that ',
        inlineCode('requestId'),
        ' no longer matches ',
        inlineCode('latestRequestId'),
        ' and is dropped. The newest query stays on screen.',
      ),
      infoCallout(
        'This is the solution, not a workaround',
        'It is tempting to read the request id as boilerplate you tolerate until something better comes along. It is not. The behavior you want, newest request wins, has to live somewhere. Here it lives in the Model as a value you can read, and in update as a comparison you can test. That visibility is the point, not a tax on it. The shape generalizes: tag each async result with what the Model wanted when you started it, then ignore any result that no longer matches. The same few lines that resolve this fetch race also resolve a debounced search box firing on every keystroke, because the question is identical: is this result still the one the Model is waiting for?',
      ),
      tableOfContentsEntryToHeader(faqHeader),
      faqQuestion('faq-where-is-usequery', 'Where is useQuery?'),
      para(
        'There isn’t one, and you don’t assemble an equivalent hook. You return a ',
        link(coreCommandsRouter(), 'Command'),
        ' from ',
        inlineCode('update'),
        ', the runtime runs the effect and feeds the result back as a Message, and you store the resulting state in the ',
        link(coreModelRouter(), 'Model'),
        '. The “query” is spread across those pieces on purpose, so each one stays visible.',
      ),
      faqQuestion('faq-caching', 'How do I cache responses?'),
      para(
        'Keep the data in the Model. For a single resource that is one field; for many resources, a ',
        inlineCode('HashMap'),
        ' keyed by id. A cache hit is finding the data already in the Model and rendering it without firing a Command. See the ',
        link(
          exampleDetailRouter({ exampleSlug: 'api-cache' }),
          'API Cache example',
        ),
        '.',
      ),
      faqQuestion('faq-dedup', 'How do I deduplicate identical requests?'),
      para(
        'In ',
        inlineCode('update'),
        ', check the current state before firing. If the field is already ',
        inlineCode('Loading'),
        ', return no Command. Because every request is a decision made in one place, deduplication is just an ',
        inlineCode('if'),
        ', not a feature. Note this is a different thing from out-of-order handling above: dedup avoids starting redundant work, the request-id guard resolves work that finishes out of order.',
      ),
      faqQuestion('faq-polling', 'How do I poll or refetch in the background?'),
      para(
        'Use a ',
        link(coreSubscriptionsRouter(), 'Subscription'),
        ' gated on a Model condition. It starts the interval when the condition becomes true and tears it down when it becomes false, with no manual cleanup. The API Cache example refetches stats on a timer this way while keeping the old numbers on screen.',
      ),
      faqQuestion('faq-invalidate', 'How do I invalidate and refetch?'),
      para(
        'Set the field to a stale or refreshing state and return the fetch Command from ',
        inlineCode('update'),
        '. The current data can stay on screen while the new request runs, which is the same cache-and-revalidate behavior you are used to, expressed as an explicit state transition.',
      ),
      faqQuestion('faq-mutations', 'What about mutations?'),
      para(
        'A mutation is a Message and a Command, the same as any other effect. The button dispatches a Message, ',
        inlineCode('update'),
        ' returns a Command that performs the write, and the result comes back as another Message you handle. There is no separate mutation concept to learn.',
      ),
      faqQuestion(
        'faq-own-the-behavior',
        'Why write this yourself instead of letting a library do it?',
      ),
      para(
        'Because the logic that resolves a race or revalidates a cache is logic your app depends on, and keeping it as state and transitions you own means you can read it, test it, and change it. A hook that does it for you owns that logic instead, and the day your case diverges from its defaults you are reaching for configuration and hoping the knob you need exists. Owning the behavior is not the cost of this approach. It is the point of it.',
      ),
      para(
        'If you are also coming from React, ',
        link(comingFromReactRouter(), 'Coming from React'),
        ' covers the rest of the mental model: components, hooks, effects, and how they map onto Foldkit.',
      ),
    ],
  )
}
