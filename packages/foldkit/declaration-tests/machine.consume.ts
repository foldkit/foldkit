import { Option } from 'effect'
import type { Command, Update } from 'foldkit'

import {
  ParentModel,
  SearchDefinition,
  contextFreeMachine,
  foldSearch,
  isCurrentResponse,
  makeAlternativeMachine,
  makeAlternativeMapMachine,
  makeConditionalMachine,
  maybeCachedQuotes,
  mixedHandler,
  noArgumentGuard,
  readyTransitions,
  restoreCachedQuotes,
  searchMachine,
  transitionQuoteRequest,
} from './machine.accepted.js'
import {
  CachedQuotes,
  CancelSearch,
  FetchQuotes,
  Message,
  SearchContext,
  SearchState,
  TrackSearch,
} from './machine.contracts.js'
import { quoteRequestMachine } from './machine.quote-request.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type ExactGuardState = Expect<
  Equal<
    Parameters<typeof maybeCachedQuotes>[0]['state'],
    typeof SearchState.Ready.Type
  >
>
export type ExactGuardMessage = Expect<
  Equal<
    Parameters<typeof maybeCachedQuotes>[0]['message'],
    typeof Message.RequestedQuotes.Type
  >
>
export type ExactGuardContext = Expect<
  Equal<
    Parameters<typeof maybeCachedQuotes>[0]['context'],
    typeof SearchContext.Type
  >
>
export type ExactGuardValue = Expect<
  Equal<
    Parameters<typeof restoreCachedQuotes>[0]['guardValue'],
    typeof CachedQuotes.Type
  >
>
export type ExactMixedGuardValue = Expect<
  Equal<Parameters<typeof mixedHandler>[0]['guardValue'], number | void>
>
export type ExactNoArgumentSource = Expect<
  Equal<
    Parameters<typeof noArgumentGuard>[0]['state'],
    typeof SearchState.Ready.Type
  >
>
export type ExactNoArgumentMessage = Expect<
  Equal<
    Parameters<typeof noArgumentGuard>[0]['message'],
    typeof Message.RequestedQuotes.Type
  >
>
export type ExactSelectorInputFields = Expect<
  Equal<
    keyof Parameters<typeof transitionQuoteRequest>[0],
    'state' | 'message' | 'context'
  >
>
export type ExactSharedBoolean = Expect<
  Equal<ReturnType<typeof isCurrentResponse>, boolean>
>
export type ExactNestedCommands = Expect<
  Equal<
    Update.RequirementsOf<typeof transitionQuoteRequest>,
    Command.HandlerOf<typeof FetchQuotes>
  >
>
export type ExactMachineRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof searchMachine.transition>,
    | Command.HandlerOf<typeof FetchQuotes>
    | Command.HandlerOf<typeof TrackSearch>
    | Command.HandlerOf<typeof CancelSearch>
  >
>
export type ExactConditionalRequirements = Expect<
  Equal<
    Update.RequirementsOf<
      ReturnType<typeof makeConditionalMachine>['transition']
    >,
    | Command.HandlerOf<typeof FetchQuotes>
    | Command.HandlerOf<typeof TrackSearch>
  >
>
export type ExactAlternativeRequirements = Expect<
  Equal<
    Update.RequirementsOf<
      ReturnType<typeof makeAlternativeMachine>['transition']
    >,
    | Command.HandlerOf<typeof FetchQuotes>
    | Command.HandlerOf<typeof TrackSearch>
  >
>
export type ExactNestedMachineRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof quoteRequestMachine.transition>,
    Command.HandlerOf<typeof FetchQuotes>
  >
>
const model = ParentModel.make({
  search: SearchState.Idle(),
  query: 'foldkit',
  searchGeneration: 1,
  maybeCachedQuotes: Option.none(),
})
const foldedSearch = foldSearch(model, Message.RequestedSearch())
export type ExactFoldRequirements = Expect<
  Equal<
    Update.RequirementsOf<() => typeof foldedSearch>,
    Update.RequirementsOf<typeof searchMachine.transition>
  >
>
export type ExactContextArguments = Expect<
  Equal<
    Parameters<typeof searchMachine.transition>,
    [
      state: typeof SearchState.Type,
      message: typeof Message.Type,
      context: typeof SearchContext.Type,
    ]
  >
>

searchMachine.transition(SearchState.Idle(), Message.RequestedSearch(), {
  query: 'foldkit',
  searchGeneration: 1,
  maybeCachedQuotes: Option.none(),
})
SearchDefinition.makeMachine({
  initial: SearchState.Idle(),
  states: { Ready: readyTransitions },
})
foldSearch(Message.RequestedSearch())(model)

export type ExactAlternativeMapRequirements = Expect<
  Equal<
    Update.RequirementsOf<
      ReturnType<typeof makeAlternativeMapMachine>['transition']
    >,
    | Command.HandlerOf<typeof FetchQuotes>
    | Command.HandlerOf<typeof TrackSearch>
  >
>

export type ExactContextFreeArguments = Expect<
  Equal<
    Parameters<typeof contextFreeMachine.transition>,
    [state: typeof SearchState.Type, message: typeof Message.Type]
  >
>
contextFreeMachine.transition(SearchState.Idle(), Message.RequestedSearch())
