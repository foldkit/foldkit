import { Effect, Option, Schema } from 'effect'
import type { Update } from 'foldkit'
import { Machine } from 'foldkit/experimental'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

import {
  SearchDefinition,
  contextFreeMachine,
  makeGuard,
  makeHandler,
  makeTransitions,
  maybeCachedQuotes,
  readyTransitions,
  restoreCachedQuotes,
  searchMachine,
  to,
  when,
} from './machine.accepted.js'
import { Message, SearchContext, SearchState } from './machine.contracts.js'

const input = {
  query: 'foldkit',
  searchGeneration: 1,
  maybeCachedQuotes: Option.none(),
}
const initial = SearchState.Idle()

// @ts-expect-error authoring now starts with one bound Definition
Machine.define({ state: SearchState, message: Message })
// @ts-expect-error shared transitions come from the owning Definition
Machine.forStates(['Idle'])

// @ts-expect-error a declared Context is a required transition argument
searchMachine.transition(initial, Message.RequestedSearch())
// @ts-expect-error a declared Context is a required step argument
searchMachine.step(initial, Message.RequestedSearch())
searchMachine.transition(initial, Message.RequestedSearch(), {
  ...input,
  // @ts-expect-error Context fields retain their Schema types
  searchGeneration: 'one',
})
Machine.fold({
  // @ts-expect-error an authoring Definition is not a completed Machine
  machine: SearchDefinition,
  read: () => Option.some(initial),
  write: (_model: typeof initial, state: typeof initial) => state,
})

makeGuard(
  { from: 'Ready', on: 'RequestedQuotes' },
  ({ state, message, context }) => {
    // @ts-expect-error source state stays Ready
    state.error
    // @ts-expect-error trigger stays RequestedQuotes
    message.domains
    // @ts-expect-error read-only Context cannot be mutated
    context.query = 'changed'
    return true
  },
)
// @ts-expect-error an unknown source cannot establish an extracted guard
makeGuard({ from: 'Missing', on: 'RequestedQuotes' }, () => true)
// @ts-expect-error an unknown Message cannot establish an extracted handler
makeHandler({ from: 'Ready', on: 'RequestedOther' }, () => ({
  model: SearchState.Idle(),
}))
// @ts-expect-error source selections cannot be empty
makeGuard({ from: [], on: 'RequestedQuotes' }, () => true)
// @ts-expect-error guards must return a boolean or Option
makeGuard({ from: 'Ready', on: 'RequestedQuotes' }, () => 'yes')

makeHandler(maybeCachedQuotes, ({ guardValue }) => {
  // @ts-expect-error guardValue is CachedQuotes, not a string
  const label: string = guardValue
  return { model: SearchState.Failed({ error: label }) }
})
// @ts-expect-error returned Models must belong to the bound State
makeHandler({ from: 'Ready', on: 'RequestedQuotes' }, () => ({
  model: Message.RequestedSearch(),
}))
// @ts-expect-error returned OutMessages cannot be silently lost
makeHandler({ from: 'Ready', on: 'RequestedQuotes' }, () => ({
  model: SearchState.Idle(),
  outMessage: Message.RequestedSearch(),
}))

makeTransitions('Ready', {
  on: {
    RequestedQuotes: to('Loading', () => ({
      // @ts-expect-error target Loading requires its own exact state variant
      model: SearchState.Ready({ domains: [] }),
    })),
  },
})
makeTransitions('Loading', {
  on: {
    // @ts-expect-error the guard and handler only accept Ready
    RequestedQuotes: [when(maybeCachedQuotes, 'Ready', restoreCachedQuotes)],
  },
})
makeTransitions('Ready', {
  on: {
    // @ts-expect-error the extracted handler returns Ready, not Loading
    RequestedQuotes: [when(maybeCachedQuotes, 'Loading', restoreCachedQuotes)],
  },
})
makeTransitions('Ready', {
  on: {
    // @ts-expect-error the guard and handler only accept RequestedQuotes
    RequestedSearch: [when(maybeCachedQuotes, 'Ready', restoreCachedQuotes)],
  },
})
makeTransitions('Ready', {
  on: {
    // @ts-expect-error unknown Message keys are rejected for extracted entries
    WrongMessage: to('Idle', () => ({ model: SearchState.Idle() })),
  },
})
// @ts-expect-error unknown source keys are rejected at completion
SearchDefinition.makeMachine({ initial, states: { Typo: readyTransitions } })
SearchDefinition.makeMachine({
  initial,
  states: {
    // @ts-expect-error an extracted Ready entry cannot become a Failed entry
    Failed: readyTransitions,
  },
})

const OtherDefinition = Machine.makeDefinition({
  State: SearchState,
  Message,
  Context: Schema.Struct({ query: Schema.Number }),
})
const otherGuard = OtherDefinition.makeGuard(
  { from: 'Ready', on: 'RequestedQuotes' },
  ({ context }) => Option.some(context.query),
)
makeTransitions('Ready', {
  on: {
    RequestedQuotes: [
      // @ts-expect-error a foreign Context cannot enter this Machine
      when(otherGuard, 'Ready', ({ state }) => ({ model: state })),
    ],
  },
})
// @ts-expect-error foreign Context is also rejected by extracted handler authoring
makeHandler(otherGuard, ({ state }) => ({ model: state }))

const RichContextDefinition = Machine.makeDefinition({
  State: SearchState,
  Message,
  Context: Schema.Struct({
    ...SearchContext.fields,
    requiredExtra: Schema.Number,
  }),
})
const richContextDefaults = RichContextDefinition.makeSharedTransitions(
  ['Ready'],
  {
    on: {
      RequestedQuotes: RichContextDefinition.to('Failed', ({ context }) => ({
        model: SearchState.Failed({
          error: globalThis.String(context.requiredExtra),
        }),
      })),
    },
  },
)
SearchDefinition.makeMachine({
  initial,
  states: {},
  shared: [
    // @ts-expect-error shared handlers cannot require richer Context inputs
    richContextDefaults,
  ],
})

const RichMessage = Schema.Union([
  Schema.Struct({
    ...Message.RequestedQuotes.fields,
    requiredExtra: Schema.Number,
  }),
  Schema.Union([
    Message.RequestedSearch,
    Message.ClickedRetrySearch,
    Message.SucceededFetchQuotes,
    Message.FailedFetchQuotes,
    Message.CompletedCancelSearch,
    Message.CompletedTrackSearch,
  ]),
])
const RichMessageDefinition = Machine.makeDefinition({
  State: SearchState,
  Message: RichMessage,
  Context: SearchContext,
})
const richMessageDefaults = RichMessageDefinition.makeSharedTransitions(
  ['Ready'],
  {
    on: {
      RequestedQuotes: RichMessageDefinition.to('Failed', ({ message }) => ({
        model: SearchState.Failed({
          error: globalThis.String(message.requiredExtra),
        }),
      })),
    },
  },
)
SearchDefinition.makeMachine({
  initial,
  states: {},
  shared: [
    // @ts-expect-error shared handlers cannot require richer Message payloads
    richMessageDefaults,
  ],
})

const RichState = Schema.Union([
  Schema.Struct({ ...SearchState.Ready.fields, requiredExtra: Schema.Number }),
  SearchState.subset(['Idle', 'Loading', 'Failed']),
])
const RichStateDefinition = Machine.makeDefinition({
  State: RichState,
  Message,
  Context: SearchContext,
})
const richStateDefaults = RichStateDefinition.makeSharedTransitions(['Ready'], {
  on: {
    RequestedQuotes: RichStateDefinition.to('Failed', ({ state }) => ({
      model: SearchState.Failed({
        error: globalThis.String(state.requiredExtra),
      }),
    })),
  },
})
SearchDefinition.makeMachine({
  initial,
  states: {},
  shared: [
    // @ts-expect-error shared handlers cannot require richer source state payloads
    richStateDefaults,
  ],
})

declare const isEnabled: boolean
const validTable = { Ready: readyTransitions }
const invalidTable = { Typo: readyTransitions }
SearchDefinition.makeMachine({
  initial,
  // @ts-expect-error every named table alternative must use known source keys
  states: isEnabled ? validTable : invalidTable,
})
const validMap = readyTransitions.on
const invalidMap = {
  WrongMessage: to('Idle', () => ({ model: SearchState.Idle() })),
}
// @ts-expect-error every named transition-map alternative must use known Messages
makeTransitions('Ready', { on: isEnabled ? validMap : invalidMap })

const ForeignMessage = defineMessageUnion({ CompletedOther: {} })
makeTransitions('Idle', {
  on: {
    RequestedSearch: to('Idle', ({ state }) => ({
      model: state,
      commands: [
        {
          name: 'Other',
          // @ts-expect-error Commands must produce the bound Message union
          effect: Effect.succeed(ForeignMessage.CompletedOther()),
        },
      ],
    })),
  },
})
const ExtraState = defineTaggedUnion({ Other: {} })
const BroadStateDefinition = Machine.makeDefinition({
  State: Schema.Union([SearchState, ExtraState]),
  Message,
  Context: SearchContext,
})
const broadStateDefaults = BroadStateDefinition.makeSharedTransitions(
  ['Ready'],
  {
    on: {
      RequestedQuotes: BroadStateDefinition.to('Other', () => ({
        model: ExtraState.Other(),
      })),
    },
  },
)
SearchDefinition.makeMachine({
  initial,
  states: {},
  shared: [
    // @ts-expect-error shared outputs cannot enter an undeclared target state
    broadStateDefaults,
  ],
})

const BroadMessageDefinition = Machine.makeDefinition({
  State: SearchState,
  Message: Schema.Union([Message, ForeignMessage]),
  Context: SearchContext,
})
const broadMessageDefaults = BroadMessageDefinition.makeSharedTransitions(
  ['Ready'],
  {
    on: {
      RequestedQuotes: BroadMessageDefinition.to('Idle', () => ({
        model: SearchState.Idle(),
        commands: [
          {
            name: 'Other',
            effect: Effect.succeed(ForeignMessage.CompletedOther()),
          },
        ],
      })),
    },
  },
)
SearchDefinition.makeMachine({
  initial,
  states: {},
  shared: [
    // @ts-expect-error shared Commands cannot produce undeclared result Messages
    broadMessageDefaults,
  ],
})

// @ts-expect-error Machine Command requirements cannot be erased to never
const _erasedCommands: Update.Return<
  typeof SearchState.Type,
  typeof Message.Type
> = searchMachine.transition(initial, Message.RequestedSearch(), input)

// @ts-expect-error a context-free Machine takes no Context argument
contextFreeMachine.transition(initial, Message.RequestedSearch(), input)
