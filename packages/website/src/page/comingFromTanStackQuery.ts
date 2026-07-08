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
  warningCallout,
} from '../prose'
import {
  asyncDataRouter,
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

const mappingQueryStatusHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'mapping-query-status',
  text: 'Mapping Query Status',
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
  mappingQueryStatusHeader,
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
      [
        'An ',
        link(asyncDataRouter(), 'AsyncData'),
        ' field in the Model plus a fetch Command',
      ],
    ],
    [
      [
        inlineCode('data'),
        ' / ',
        inlineCode('error'),
        ' / ',
        inlineCode('status'),
        ' / ',
        inlineCode('fetchStatus'),
      ],
      ['The six ', inlineCode('AsyncData'), ' states, mapped below'],
    ],
    [
      ['Query cache (keyed by query key)'],
      [
        'Model state: one ',
        inlineCode('AsyncData'),
        ' field, or an ',
        inlineCode('S.HashMap'),
        ' of them keyed by id',
      ],
    ],
    [
      [
        inlineCode('placeholderData: keepPreviousData'),
        ' / stale data on screen',
      ],
      [
        inlineCode('Refreshing'),
        ' and ',
        inlineCode('Stale'),
        ': states that hold the previous data',
      ],
    ],
    [
      [inlineCode('staleTime'), ' / background refetch'],
      [
        'A Subscription gated on a Model condition, applying ',
        inlineCode('AsyncData.revalidate'),
      ],
    ],
    [
      [inlineCode('staleTime: Infinity')],
      [
        inlineCode('AsyncData.loadIfMissing'),
        ': fetch on first visit, then keep the cache without revalidating',
      ],
    ],
    [
      ['Request deduplication'],
      [
        inlineCode('AsyncData.revalidateOrLoad'),
        ' yields ',
        inlineCode('None'),
        ' while a request is in flight',
      ],
    ],
    [
      ['Out-of-order response handling'],
      ['A request id in the Model, checked in ', inlineCode('update')],
    ],
    [
      [inlineCode('invalidateQueries')],
      [
        inlineCode('AsyncData.revalidateOrLoad'),
        ' plus the fetch Command, returned from ',
        inlineCode('update'),
      ],
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

const statusTable: Html = comparisonTable(
  ['TanStack Query', 'AsyncData'],
  [
    [
      [
        'Disabled or not yet started (',
        inlineCode("status: 'pending'"),
        ', ',
        inlineCode("fetchStatus: 'idle'"),
        ')',
      ],
      [inlineCode('Idle')],
    ],
    [
      [inlineCode('isLoading'), ' (first fetch, no data yet)'],
      [inlineCode('Loading')],
    ],
    [
      [inlineCode('isRefetching && data !== undefined')],
      [inlineCode('Refreshing({ data })')],
    ],
    [
      [inlineCode('isError && data === undefined')],
      [inlineCode('Failure({ error })')],
    ],
    [
      [inlineCode('isError && data !== undefined')],
      [inlineCode('Stale({ error, data })')],
    ],
    [
      [inlineCode('isSuccess && !isFetching')],
      [inlineCode('Success({ data })')],
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
        ', and it does not need one. This page shows where each piece of that behavior lives instead.',
      ),
      para(
        'The short version: the value ',
        inlineCode('useQuery'),
        ' returns and the machinery it runs are two different things, and Foldkit treats them differently. The value is shipped. ',
        link(asyncDataRouter(), 'AsyncData'),
        ' is a six-state union that makes loading, failure, stale-while-revalidate, and keep-stale-on-failure first-class states of the data itself, with named transitions between them. The machinery is not shipped, because here it is not machinery. When to fetch, when to refetch, and what counts as stale are decisions you write with the same primitives you already use for everything else: Model state, the ',
        inlineCode('update'),
        ' function, Commands, and Subscriptions.',
      ),
      para(
        'TanStack Query bundles both halves into the hook, with the policy arriving as configuration (',
        inlineCode('staleTime'),
        ', ',
        inlineCode('refetchOnWindowFocus'),
        ', and the rest), so a lot happens that you did not write and cannot see. Foldkit ships the state machine every app shares and asks you to write the policy that differs per app. The trade is not more code or less. It is hidden machinery versus code you can read.',
      ),
      tableOfContentsEntryToHeader(translatingConceptsHeader),
      para('Here is how the TanStack Query model maps onto Foldkit:'),
      conceptTable,
      tableOfContentsEntryToHeader(asyncStateHeader),
      para(
        'A query has states: loading, success, error, and often a “refreshing with stale data on screen” state. TanStack Query hands them to you as flags on the query object. In Foldkit they are a shipped value type, ',
        inlineCode('AsyncData<A, E>'),
        ', a union of six states: ',
        inlineCode('Idle'),
        ', ',
        inlineCode('Loading'),
        ', ',
        inlineCode('Refreshing'),
        ', ',
        inlineCode('Failure'),
        ', ',
        inlineCode('Stale'),
        ', and ',
        inlineCode('Success'),
        '. ',
        inlineCode('Refreshing'),
        ' and ',
        inlineCode('Stale'),
        ' are the two that hold the previous good data: ',
        inlineCode('Refreshing'),
        ' while a refetch is in flight, which is stale-while-revalidate, and ',
        inlineCode('Stale'),
        ' after a refetch failed, which keeps the data on screen instead of blanking it to an error.',
      ),
      para(
        'There is no separate cache. The Model is the cache. A single resource lives in one ',
        inlineCode('AsyncData'),
        ' field; a collection of resources keyed by id lives in an ',
        inlineCode('S.HashMap'),
        ' of them. Reading from cache is reading the Model, and rendering instantly from cache is just rendering the data you already hold.',
      ),
      para(
        'Here is ',
        inlineCode('useQuery'),
        ' translated whole. One field, one Command, two ',
        inlineCode('update'),
        ' arms:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.useQueryTranslationHighlighted),
          ],
          [],
        ),
        Snippet.useQueryTranslationRaw,
        'Copy useQuery translation',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'Each runtime behavior of ',
        inlineCode('useQuery'),
        ' is one visible line. ',
        inlineCode('revalidateOrLoad'),
        ' returning ',
        inlineCode('None'),
        ' while a request is in flight is request deduplication. ',
        inlineCode('Success'),
        ' moving to ',
        inlineCode('Refreshing'),
        ' is cache-and-revalidate, with the current list staying on screen. A cold field starting ',
        inlineCode('Loading'),
        ' is the initial fetch. And ',
        inlineCode('settle'),
        ' folding the finished ',
        inlineCode('Result'),
        ' into the field is response handling, keeping the previous data as ',
        inlineCode('Stale'),
        ' when a refresh fails instead of blanking the screen.',
      ),
      para(
        'The ',
        link(
          exampleDetailRouter({ exampleSlug: 'api-cache' }),
          'API Cache example',
        ),
        ' builds the rest of what TanStack Query gives you (a keyed cache with instant hits, invalidation, background polling) out of nothing but a Model, an ',
        inlineCode('update'),
        ' function, Commands, and one Subscription. It is worth reading top to bottom.',
      ),
      tableOfContentsEntryToHeader(mappingQueryStatusHeader),
      para(
        'If you know TanStack Query’s status flags, you already know the six states. Each one is a combination of flags and data presence on the query object, promoted to a variant:',
      ),
      statusTable,
      para(
        'The difference is who tracks the combinations. In TanStack Query, “failed but still holding data” is a derived condition you check with ',
        inlineCode('isError && data !== undefined'),
        ', and nothing reminds you to. Here it is a variant, ',
        inlineCode('Stale'),
        ', and ',
        inlineCode('AsyncData.match'),
        ' does not compile until you say what it renders. When a view does not care which data-holding state it is in, ',
        inlineCode('matchData'),
        ' collapses the six states into three channels: data, failure, empty.',
      ),
      warningCallout(
        'isPending means something different',
        'TanStack Query’s ',
        inlineCode('isPending'),
        ' means the first fetch has not finished: no data, no error yet. ',
        inlineCode('AsyncData.isPending'),
        ' means a request is in flight: true for ',
        inlineCode('Loading'),
        ' and ',
        inlineCode('Refreshing'),
        ', the analog of TanStack Query’s ',
        inlineCode('isFetching'),
        '. And ',
        inlineCode('Stale'),
        ' is not pending. Its fetch already failed; it is holding data, not waiting.',
      ),
      tableOfContentsEntryToHeader(outOfOrderHeader),
      para(
        inlineCode('AsyncData'),
        ' tells you what state a field is in. It does not, and cannot, order the responses that arrive to fill it. Here is a bug that is easy to hit. Fire a request for A, then fire a request for B before A returns. A is slow, B is fast, so B resolves first, then A resolves last and overwrites it. Now you are showing A’s data when the user asked for B.',
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
        ' and is dropped. The newest query stays on screen. Everything around the guard is the standard shape: the Command settles the fetch into a ',
        inlineCode('Result'),
        ', and ',
        inlineCode('AsyncData.settle'),
        ' folds it into the field.',
      ),
      para(
        'This snippet also shows where ',
        inlineCode('keepPreviousData'),
        ' went. ',
        inlineCode('ChangedQuery'),
        ' transitions the field to ',
        inlineCode('Loading'),
        ', which blanks the previous results while the new query runs. To keep them on screen instead, transition to ',
        inlineCode('Refreshing({ data })'),
        ' when the field holds data. Blank-and-load versus keep-while-loading is one visible line in ',
        inlineCode('update'),
        ', not a configuration flag.',
      ),
      infoCallout(
        'This is the solution, not a workaround',
        'It is tempting to read the request id as boilerplate you tolerate until something better comes along. It is not. The behavior you want, newest request wins, has to live somewhere. Here it lives in the Model as a value you can read, and in update as a comparison you can test. That visibility is the point, not a tax on it. The shape generalizes: tag each async result with what the Model wanted when you started it, then ignore any result that no longer matches. The same few lines that resolve this fetch race also resolve a debounced search box firing on every keystroke, because the question is identical: is this result still the one the Model is waiting for?',
      ),
      tableOfContentsEntryToHeader(faqHeader),
      faqQuestion('faq-where-is-usequery', 'Where is useQuery?'),
      para(
        'There isn’t one, and you don’t assemble an equivalent hook. A query is an ',
        link(asyncDataRouter(), 'AsyncData'),
        ' field in the ',
        link(coreModelRouter(), 'Model'),
        ' plus a ',
        link(coreCommandsRouter(), 'Command'),
        ' returned from ',
        inlineCode('update'),
        '. The runtime runs the effect and feeds the result back as a Message, and ',
        inlineCode('AsyncData.settle'),
        ' folds it into the field. The “query” is spread across those pieces on purpose, so each one stays visible.',
      ),
      faqQuestion('faq-caching', 'How do I cache responses?'),
      para(
        'Keep the data in the Model. For a single resource that is one ',
        inlineCode('AsyncData'),
        ' field; for many resources, an ',
        inlineCode('S.HashMap'),
        ' of them keyed by id. A cache hit is a field where ',
        inlineCode('AsyncData.hasData'),
        ' is true, rendered without firing a Command. See the ',
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
        ', decide the transition with ',
        inlineCode('AsyncData.revalidateOrLoad'),
        '. While a request is in flight (',
        inlineCode('Loading'),
        ' or ',
        inlineCode('Refreshing'),
        ') it yields ',
        inlineCode('None'),
        ', so you make no transition and return no Command. Because every request starts as a decision made in one place, not firing twice is a branch, not a feature. Note this is a different thing from out-of-order handling above: dedup avoids starting redundant work, the request-id guard resolves work that finishes out of order.',
      ),
      faqQuestion('faq-keep-previous-data', 'What about keepPreviousData?'),
      para(
        'Pick the transition yourself when the input changes. ',
        inlineCode('Loading'),
        ' drops the old data; ',
        inlineCode('Refreshing({ data })'),
        ' keeps it on screen while the new request runs. TanStack Query’s helper (passed as ',
        inlineCode('placeholderData'),
        ' in v5) is that same decision made for you. Here it is one line you choose in ',
        inlineCode('update'),
        '.',
      ),
      faqQuestion('faq-polling', 'How do I poll or refetch in the background?'),
      para(
        'Use a ',
        link(coreSubscriptionsRouter(), 'Subscription'),
        ' gated on a Model condition. It starts the interval when the condition becomes true and tears it down when it becomes false, with no manual cleanup. On each tick, apply ',
        inlineCode('AsyncData.revalidate'),
        ' and return the fetch Command when it yields a transition: ',
        inlineCode('Success'),
        ' and ',
        inlineCode('Stale'),
        ' move to ',
        inlineCode('Refreshing'),
        ', so the old numbers stay on screen while the new ones load, and a tick that lands during an in-flight request starts nothing. The API Cache example refetches stats on a timer exactly this way.',
      ),
      faqQuestion('faq-invalidate', 'How do I invalidate and refetch?'),
      para(
        'Apply ',
        inlineCode('AsyncData.revalidateOrLoad'),
        ' to the field, and when it yields a transition, return the fetch Command from ',
        inlineCode('update'),
        '. ',
        inlineCode('Success'),
        ' and ',
        inlineCode('Stale'),
        ' move to ',
        inlineCode('Refreshing'),
        ', so the current data stays on screen while the new request runs, and a cold or failed field restarts a fresh ',
        inlineCode('Loading'),
        '. That is the same cache-and-revalidate behavior you are used to, expressed as an explicit state transition. When the response arrives, ',
        inlineCode('settle'),
        ' folds it in, keeping the old data as ',
        inlineCode('Stale'),
        ' if the refresh failed. The narrower ',
        inlineCode('revalidate'),
        ' skips fields that hold nothing, which is the right transition after a mutation touches caches that may never have loaded.',
      ),
      faqQuestion('faq-mutations', 'What about mutations?'),
      para(
        'A mutation is a Message and a Command, the same as any other effect. The button dispatches a Message, ',
        inlineCode('update'),
        ' returns a Command that performs the write, and the result comes back as another Message you handle. In that handler you do what ',
        inlineCode('onSuccess'),
        ' plus ',
        inlineCode('invalidateQueries'),
        ' would have done: revalidate the affected fields, or edit the cached data in place with ',
        inlineCode('AsyncData.map'),
        ', the ',
        inlineCode('setQueryData'),
        ' move.',
      ),
      faqQuestion('faq-optimistic-updates', 'How do I do optimistic updates?'),
      para(
        'Apply the edit to the Model immediately with ',
        inlineCode('AsyncData.map'),
        ' in the same ',
        inlineCode('update'),
        ' arm that fires the mutation Command, and handle the failure Message by putting the previous value back or revalidating. TanStack Query’s ',
        inlineCode('onMutate'),
        ' / ',
        inlineCode('onError'),
        ' / ',
        inlineCode('onSettled'),
        ' rollback dance becomes ordinary update logic: the optimistic write, the rollback value, and the recovery path are all plain state transitions you can read and test.',
      ),
      faqQuestion(
        'faq-own-the-behavior',
        'Why write this yourself instead of letting a library do it?',
      ),
      para(
        'Foldkit does ship the part that is the same in every app: ',
        inlineCode('AsyncData'),
        ' is the state machine for a value that arrives asynchronously, and ',
        inlineCode('settle'),
        ', ',
        inlineCode('revalidate'),
        ', and friends are its transitions. What it does not ship is the policy: when to fetch, what counts as stale, which fields a mutation invalidates. That logic is logic your app depends on, and keeping it as state and transitions you own means you can read it, test it, and change it. A hook that decides for you owns that logic instead, and the day your case diverges from its defaults you are reaching for configuration and hoping the knob you need exists. Owning the policy is not the cost of this approach. It is the point of it.',
      ),
      para(
        'The ',
        link(asyncDataRouter(), 'Async Data'),
        ' page covers the module itself: the Schema builder, the ',
        inlineCode('match'),
        ' family, and combining several fields into one screen with ',
        inlineCode('all'),
        '. If you are also coming from React, ',
        link(comingFromReactRouter(), 'Coming from React'),
        ' covers the rest of the mental model: components, hooks, effects, and how they map onto Foldkit.',
      ),
    ],
  )
}
