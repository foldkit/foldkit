import { Array, Option, Schema, String } from 'effect'
import { Machine } from 'foldkit/experimental'
import { modifyFields } from 'foldkit/struct'

import {
  CancelSearch,
  FetchQuotes,
  Message,
  SearchContext,
  SearchState,
  TrackSearch,
  queryToMaybeLabel,
} from './machine.contracts.js'
import { quoteRequestMachine } from './machine.quote-request.js'

const QUOTE_PAGE_SIZE = 60

export const SearchDefinition = Machine.makeDefinition({
  State: SearchState,
  Message,
  Context: SearchContext,
})

export const {
  makeGuard,
  makeMachine,
  makeHandler,
  makeTransitions,
  makeSharedTransitions,
  to,
  when,
  otherwise,
  ignore,
} = SearchDefinition

export const isCurrentResponse = makeGuard(
  {
    from: ['Idle', 'Loading', 'Ready', 'Failed'],
    on: ['SucceededFetchQuotes', 'FailedFetchQuotes'],
  },
  ({ message, context }) =>
    message.searchGeneration === context.searchGeneration,
)

export const maybeCachedQuotes = makeGuard(
  { from: 'Ready', on: 'RequestedQuotes' },
  ({ state, message, context }) =>
    state.quoteRequest._tag === 'Idle'
      ? Option.filter(
          context.maybeCachedQuotes,
          cached =>
            cached.offset === message.offset && cached.limit === message.limit,
        )
      : Option.none(),
)

export const restoreCachedQuotes = makeHandler(
  maybeCachedQuotes,
  ({ state, guardValue: cached }) => ({
    model: modifyFields(state, {
      domains: domains => [...domains, ...cached.domains],
    }),
  }),
)

export const mixedGuard = makeGuard(
  { from: 'Ready', on: 'RequestedQuotes' },
  ({ context }) =>
    context.query === '' ? true : Option.some(context.searchGeneration),
)
export const mixedHandler = makeHandler(mixedGuard, ({ state }) => ({
  model: state,
}))
export const noArgumentGuard = makeGuard(
  { from: 'Ready', on: 'RequestedQuotes' },
  () => Option.some('constant'),
)

export const transitionQuoteRequest = makeHandler(
  {
    from: 'Ready',
    on: ['RequestedQuotes', 'ClickedRetrySearch', 'FailedFetchQuotes'],
  },
  ({ state, message, context }) => {
    const quoteRequest = quoteRequestMachine.transition(
      state.quoteRequest,
      message,
      context,
    )

    return {
      model: modifyFields(state, { quoteRequest: () => quoteRequest.model }),
      commands: quoteRequest.commands,
    }
  },
)

export const readyTransitions = makeTransitions('Ready', {
  on: {
    RequestedQuotes: [
      when(maybeCachedQuotes, 'Ready', restoreCachedQuotes),
      when(
        ({ state }) => state.quoteRequest._tag === 'Idle',
        'Ready',
        transitionQuoteRequest,
      ),
      ignore(),
    ],
    ClickedRetrySearch: [
      when(
        ({ state }) => state.quoteRequest._tag === 'Failed',
        'Ready',
        transitionQuoteRequest,
      ),
      ignore(),
    ],
    SucceededFetchQuotes: [
      when(isCurrentResponse, 'Ready', ({ state, message, context }) => {
        const quoteCompletion = quoteRequestMachine.transition(
          state.quoteRequest,
          message,
          context,
        )

        return {
          model: SearchState.Ready({
            domains: [...state.domains, ...message.domains],
            quoteRequest: quoteCompletion.model,
          }),
          commands: quoteCompletion.commands,
        }
      }),
      ignore(),
    ],
    FailedFetchQuotes: [
      when(
        ({ state, message, context }) =>
          isCurrentResponse({ state, message, context }) &&
          state.quoteRequest._tag === 'Loading',
        'Ready',
        transitionQuoteRequest,
      ),
      when(isCurrentResponse, 'Failed', ({ message }) => ({
        model: SearchState.Failed({ error: message.error }),
      })),
      ignore(),
    ],
  },
})

export const searchMachine = SearchDefinition.makeMachine({
  initial: SearchState.Idle(),
  shared: [
    makeSharedTransitions(['Idle', 'Loading', 'Ready', 'Failed'], {
      on: {
        RequestedSearch: [
          when(
            ({ context }) => String.isEmpty(context.query),
            'Idle',
            () => ({ model: SearchState.Idle(), commands: [CancelSearch()] }),
          ),
          when(
            ({ context }) => context.maybeCachedQuotes,
            'Ready',
            ({ guardValue: cached }) => ({
              model: SearchState.Ready({ domains: cached.domains }),
              commands: [CancelSearch()],
            }),
          ),
          when(
            ({ context }) => queryToMaybeLabel(context.query),
            'Loading',
            ({ guardValue: label, context }) => ({
              model: SearchState.Loading(),
              commands: [
                CancelSearch(),
                FetchQuotes({
                  label,
                  offset: 0,
                  limit: QUOTE_PAGE_SIZE,
                  searchGeneration: context.searchGeneration,
                }),
                TrackSearch({ query: context.query }),
              ],
            }),
          ),
          otherwise(
            to('Failed', () => ({
              model: SearchState.Failed({ error: 'Invalid domain label' }),
              commands: [CancelSearch()],
            })),
          ),
        ],
        SucceededFetchQuotes: [
          when(isCurrentResponse, 'Ready', ({ message }) => ({
            model: SearchState.Ready({ domains: message.domains }),
          })),
          ignore(),
        ],
        FailedFetchQuotes: [
          when(isCurrentResponse, 'Failed', ({ message }) => ({
            model: SearchState.Failed({ error: message.error }),
          })),
          ignore(),
        ],
      },
    }),
  ],
  states: { Ready: readyTransitions },
})

export const ParentModel = Schema.Struct({
  search: SearchState,
  ...SearchContext.fields,
})

export const makeConditionalMachine = (isEnabled: boolean) =>
  SearchDefinition.makeMachine({
    initial: SearchState.Idle(),
    states: { ...(isEnabled ? { Ready: readyTransitions } : {}) },
    ...(isEnabled
      ? {
          shared: [
            makeSharedTransitions(['Idle'], {
              on: {
                RequestedSearch: to('Loading', ({ context }) => ({
                  model: SearchState.Loading(),
                  commands: [TrackSearch({ query: context.query })],
                })),
              },
            }),
          ],
        }
      : {}),
  })

export const makeAlternativeMachine = (isReady: boolean) => {
  const readyTable = { Ready: readyTransitions }
  const idleTransitions = makeTransitions('Idle', {
    on: {
      RequestedSearch: to('Loading', ({ context }) => ({
        model: SearchState.Loading(),
        commands: [TrackSearch({ query: context.query })],
      })),
    },
  })
  const idleTable = { Idle: idleTransitions }
  return SearchDefinition.makeMachine({
    initial: SearchState.Idle(),
    states: isReady ? readyTable : idleTable,
  })
}

const modelToSearchContext = (
  model: typeof ParentModel.Type,
): typeof SearchContext.Type => ({
  query: model.query,
  searchGeneration: model.searchGeneration,
  maybeCachedQuotes: model.maybeCachedQuotes,
})

export const foldSearch = Machine.fold({
  machine: searchMachine,
  read: (model: typeof ParentModel.Type) => Option.some(model.search),
  write: (model, nextSearch) =>
    modifyFields(model, { search: () => nextSearch }),
  context: modelToSearchContext,
})

export const summary = Array.map(
  searchMachine.edges,
  edge => `${edge.from}:${edge.messageTag}:${edge.target}`,
)

export const makeAlternativeMapMachine = (isRetry: boolean) => {
  const requestMap = makeTransitions('Ready', {
    on: {
      RequestedQuotes: to('Ready', ({ state, context }) => ({
        model: state,
        commands: [TrackSearch({ query: context.query })],
      })),
    },
  }).on
  const retryMap = makeTransitions('Ready', {
    on: {
      ClickedRetrySearch: to('Ready', ({ state, context }) => ({
        model: state,
        commands: [
          FetchQuotes({
            label: context.query,
            searchGeneration: context.searchGeneration,
            offset: 0,
            limit: QUOTE_PAGE_SIZE,
          }),
        ],
      })),
    },
  }).on
  return SearchDefinition.makeMachine({
    initial: SearchState.Idle(),
    states: {
      Ready: makeTransitions('Ready', { on: isRetry ? retryMap : requestMap }),
    },
  })
}

const QueryContextDefinition = Machine.makeDefinition({
  State: SearchState,
  Message,
  Context: Schema.Struct({ query: Schema.String }),
})
const queryDefaults = QueryContextDefinition.makeSharedTransitions(['Idle'], {
  on: {
    RequestedSearch: QueryContextDefinition.to('Failed', ({ context }) => ({
      model: SearchState.Failed({ error: context.query }),
    })),
  },
})
export const extendedContextMachine = SearchDefinition.makeMachine({
  initial: SearchState.Idle(),
  states: {},
  shared: [queryDefaults],
})

export const ContextFreeDefinition = Machine.makeDefinition({
  State: SearchState,
  Message,
})
export const {
  makeGuard: makeContextFreeGuard,
  makeHandler: makeContextFreeHandler,
  makeTransitions: makeContextFreeTransitions,
  makeSharedTransitions: makeContextFreeSharedTransitions,
  makeMachine: makeContextFreeMachine,
  to: contextFreeTo,
  when: contextFreeWhen,
  otherwise: contextFreeOtherwise,
  ignore: contextFreeIgnore,
} = ContextFreeDefinition
export const contextFreeMachine = makeContextFreeMachine({
  initial: SearchState.Idle(),
  states: {
    Idle: {
      on: {
        RequestedSearch: contextFreeTo('Loading', () => ({
          model: SearchState.Loading(),
        })),
      },
    },
  },
})
