import type { Array, Option, Schema } from 'effect'

import type { Command } from '../../command/index.js'
import type * as Update from '../../update/index.js'
import {
  type Edge,
  type EdgeInput,
  type ForStatesFragment,
  type Machine,
  type MachineDefinition,
  type MachineReturn,
  type MachineSchemas,
  type NoMachineContext,
  type Otherwise,
  type SharedTransitionMap,
  type TagOf,
  type Tagged,
  type Variant,
  type When,
  define,
  forStates,
  ignore,
  otherwise,
  to,
  when,
} from './machine.js'

type IsAny<Value> = 0 extends 1 & Value ? true : false

type Selection<Union extends Tagged> =
  | TagOf<Union>
  | Array.NonEmptyReadonlyArray<TagOf<Union>>

type Selected<Union extends Tagged, Tags extends Selection<Union>> = Variant<
  Union,
  Tags extends ReadonlyArray<infer Tag>
    ? Extract<Tag, TagOf<Union>>
    : Extract<Tags, TagOf<Union>>
>

type ContextField<Context> =
  IsAny<Context> extends true
    ? Readonly<{ context: Context }>
    : [Context] extends [never]
      ? Readonly<{ context: Context }>
      : [Context] extends [NoMachineContext]
        ? unknown
        : Readonly<{ context: Context }>

/** The source state, triggering Message, and declared read-only Context supplied
 * to a guard. Unlike an Edge handler input, it has no guardValue. */
export type GuardInput<
  SourceState extends Tagged,
  TriggerMessage extends Tagged,
  Context = NoMachineContext,
> = Readonly<{ state: SourceState; message: TriggerMessage }> &
  ContextField<Context>

type GuardResult = boolean | Option.Option<unknown>

type GuardValue<Result> = Result extends boolean
  ? void
  : Result extends Option.Option<infer Value>
    ? Value
    : never

type Guard<
  SourceState extends Tagged,
  TriggerMessage extends Tagged,
  Result extends GuardResult,
  Context,
> = (input: GuardInput<SourceState, TriggerMessage, Context>) => Result

type HandlerProducer<
  SourceState extends Tagged,
  TriggerMessage extends Tagged,
  Value,
  Context,
  Output,
> = (input: EdgeInput<SourceState, TriggerMessage, Value, Context>) => Output

/** A named extracted Machine handler. Its input, next State, Command Messages,
 * and Service requirements are normally inferred by Definition.makeHandler. */
export interface Handler<
  Input,
  State extends Tagged,
  Message extends Tagged,
  Requirements = never,
> {
  (input: Input): MachineReturn<State, Message, Requirements>
}

type ResultMessages<Output> = Output extends unknown
  ? 'commands' extends keyof Output
    ? Output extends Readonly<{ commands?: infer Commands }>
      ? NonNullable<Commands> extends ReadonlyArray<infer Entry>
        ? Entry extends Command<infer Message, any, any>
          ? Message
          : never
        : never
      : never
    : never
  : never

type Selector<From, On> = Readonly<{ from: From; on: On }>

type RequirementsOfTransition<Transition> =
  Transition extends Edge<any, any, any, any, any, infer Requirements, any>
    ? Requirements
    : Transition extends When<any, any, any, any, any, infer Requirements, any>
      ? Requirements
      : Transition extends Otherwise<
            any,
            any,
            any,
            any,
            infer Requirements,
            any
          >
        ? Requirements
        : Transition extends ReadonlyArray<infer Entry>
          ? RequirementsOfTransition<Entry>
          : never

type RequirementsOfMap<Transitions> = Transitions extends unknown
  ? RequirementsOfTransition<Transitions[keyof Transitions]>
  : never

type RequirementsOfTable<Table> = Table extends unknown
  ? {
      [Source in keyof Table]-?: NonNullable<Table[Source]> extends Readonly<{
        on: infer On
      }>
        ? RequirementsOfMap<On>
        : never
    }[keyof Table]
  : never

type RequirementsOfShared<Shared> =
  Shared extends ReadonlyArray<infer Entry>
    ? Entry extends ForStatesFragment<any, any, infer Requirements, any>
      ? Requirements
      : never
    : never

type RequirementsOfConfig<Config> =
  Config extends Readonly<{ states: infer States }>
    ?
        | RequirementsOfTable<States>
        | ('shared' extends keyof Config
            ? RequirementsOfShared<Config['shared']>
            : never)
    : never

type KeysOfUnion<Value> = Value extends unknown ? keyof Value : never
type ValuesOfUnion<Value> = Value extends unknown ? Value[keyof Value] : never
type OnKeysOfEntries<Entry> =
  Entry extends Readonly<{ on: infer On }> ? KeysOfUnion<On> : never

type ValidateMap<Transitions, Message extends Tagged> =
  Exclude<KeysOfUnion<Transitions>, TagOf<Message>> extends never
    ? unknown
    : never

type ValidateTable<Table, State extends Tagged, Message extends Tagged> =
  Exclude<KeysOfUnion<Table>, TagOf<State>> extends never
    ? Exclude<
        OnKeysOfEntries<ValuesOfUnion<Table>>,
        TagOf<Message>
      > extends never
      ? unknown
      : never
    : never

/** Extracted guard authoring bound to a Machine Definition's Schema contracts. */
export interface MakeGuard<
  State extends Tagged,
  Message extends Tagged,
  Context = NoMachineContext,
> {
  <
    const From extends Selection<State>,
    const On extends Selection<Message>,
    const Result extends GuardResult,
  >(
    selector: Selector<From, On>,
    producer: Guard<
      Selected<State, From>,
      Selected<Message, On>,
      Result,
      Context
    >,
  ): Guard<Selected<State, From>, Selected<Message, On>, Result, Context>
}

/** Extracted handler authoring bound to a Machine Definition's Schema contracts. */
export interface MakeHandler<
  State extends Tagged,
  Message extends Tagged,
  Context = NoMachineContext,
> {
  <
    const From extends Selection<State>,
    const On extends Selection<Message>,
    const Output extends Update.Return<State, Message, unknown>,
  >(
    selector: Selector<From, On>,
    producer: (
      input: GuardInput<Selected<State, From>, Selected<Message, On>, Context>,
    ) => Output,
  ): Handler<
    GuardInput<Selected<State, From>, Selected<Message, On>, Context>,
    Output['model'],
    ResultMessages<Output>,
    Update.RequirementsOfResult<Output>
  >
  <
    SourceState extends State,
    TriggerMessage extends Message,
    const Result extends GuardResult,
    const Output extends Update.Return<State, Message, unknown>,
  >(
    guard: Guard<SourceState, TriggerMessage, Result, Context>,
    producer: (
      input: NoInfer<
        EdgeInput<SourceState, TriggerMessage, GuardValue<Result>, Context>
      >,
    ) => Output,
  ): Handler<
    EdgeInput<SourceState, TriggerMessage, GuardValue<Result>, Context>,
    Output['model'],
    ResultMessages<Output>,
    Update.RequirementsOfResult<Output>
  >
}

/** Target Edge authoring bound to a Machine Definition's Schema contracts. */
export interface ToConstructor<
  State extends Tagged,
  Message extends Tagged,
  Context = NoMachineContext,
> {
  <
    SourceState extends State,
    TriggerMessage extends Message,
    const Target extends TagOf<State>,
    const Output extends Update.Return<
      Variant<State, Target>,
      Message,
      unknown
    >,
  >(
    target: Target,
    handler: HandlerProducer<
      NoInfer<SourceState>,
      NoInfer<TriggerMessage>,
      void,
      Context,
      Output
    >,
  ): Edge<
    State,
    Message,
    SourceState,
    TriggerMessage,
    void,
    Update.RequirementsOfResult<Output>,
    Context
  >
}

/** Guarded target authoring bound to a Machine Definition's Schema contracts. */
export interface WhenConstructor<
  State extends Tagged,
  Message extends Tagged,
  Context = NoMachineContext,
> {
  <
    SourceState extends State,
    TriggerMessage extends Message,
    const Result extends GuardResult,
    const Target extends TagOf<State>,
    const Output extends Update.Return<
      Variant<State, Target>,
      Message,
      unknown
    >,
  >(
    guard: Guard<
      NoInfer<SourceState>,
      NoInfer<TriggerMessage>,
      Result,
      Context
    >,
    target: Target,
    handler: HandlerProducer<
      NoInfer<SourceState>,
      NoInfer<TriggerMessage>,
      NoInfer<GuardValue<Result>>,
      Context,
      Output
    >,
  ): When<
    State,
    Message,
    SourceState,
    TriggerMessage,
    NoInfer<GuardValue<Result>>,
    Update.RequirementsOfResult<Output>,
    Context
  >
}

/** Source-state transition map authoring bound to a Machine Definition's Schema contracts. */
export interface MakeTransitions<
  State extends Tagged,
  Message extends Tagged,
  Context = NoMachineContext,
> {
  <
    const From extends TagOf<State>,
    const Transitions extends Readonly<{
      on: SharedTransitionMap<
        State,
        Message,
        Variant<State, From>,
        unknown,
        Context
      >
    }>,
  >(
    from: From,
    transitions: Transitions & ValidateMap<Transitions['on'], Message>,
  ): Transitions
}

/** Shared transition default authoring bound to a Machine Definition's Schema contracts. */
export interface MakeSharedTransitions<
  State extends Tagged,
  Message extends Tagged,
  Context = NoMachineContext,
> {
  <
    const From extends Array.NonEmptyReadonlyArray<TagOf<State>>,
    const Transitions extends Readonly<{
      on: SharedTransitionMap<
        State,
        Message,
        Variant<State, From[number]>,
        unknown,
        Context
      >
    }>,
  >(
    from: From,
    transitions: Transitions & ValidateMap<Transitions['on'], Message>,
  ): ForStatesFragment<
    State,
    Message,
    RequirementsOfMap<Transitions['on']>,
    Context,
    From
  >
}

/** Checked Machine completion bound to a Machine Definition's Schema contracts. */
export interface MakeMachine<
  State extends Tagged,
  Message extends Tagged,
  Context = NoMachineContext,
> {
  <const Config extends MachineDefinition<State, Message, unknown, Context>>(
    config: Config &
      Readonly<{ states: ValidateTable<Config['states'], State, Message> }>,
  ): Machine<State, Message, RequirementsOfConfig<Config>, Context>
}

/** An unconditional fallback constructor, retaining its Edge's exact inputs
 * and Command requirements when exported from an owning contract module. */
export interface OtherwiseConstructor {
  <
    State extends Tagged,
    Message extends Tagged,
    SourceState extends State,
    TriggerMessage extends Message,
    Requirements = never,
    Context = NoMachineContext,
  >(
    edge: Edge<
      State,
      Message,
      SourceState,
      TriggerMessage,
      void,
      Requirements,
      Context
    >,
  ): Otherwise<
    State,
    Message,
    SourceState,
    TriggerMessage,
    Requirements,
    Context
  >
}

/** A Schema-bound authoring surface for a pure Machine. Export needed helpers
 * from the owning contract module, as with a Block Definition. Source and
 * Message selectors establish extracted inputs without repeating EdgeInput
 * type arguments. No Composition stage or Runtime is introduced. */
export interface Definition<
  State extends Tagged,
  Message extends Tagged,
  Context = NoMachineContext,
> {
  /** Authors an extracted guard for one or more source states and Messages.
   * The returned callable retains the complete selected input even when its
   * producer uses no arguments. Option results supply their unwrapped value
   * to a guarded handler; boolean results supply void. */
  readonly makeGuard: MakeGuard<State, Message, Context>

  /** Authors an extracted handler. Pass { from, on } for state,
   * Message, and Context inputs without a guard value, or an authored guard to
   * inherit its source, Message, and unwrapped value.
   * The precise output and Command requirements remain inferred. */
  readonly makeHandler: MakeHandler<State, Message, Context>

  /** Declares an unguarded target and handler. Inline inputs narrow from the
   * source-state and Message keys; extracted handlers use makeHandler. */
  readonly to: ToConstructor<State, Message, Context>

  /** Declares an ordered guarded target. Guards receive one object containing
   * state, message, and declared context. A true boolean supplies void; Some
   * supplies its exact value. Mixed boolean/Option guards supply their union. */
  readonly when: WhenConstructor<State, Message, Context>

  /** Declares an unconditional fallback in an ordered guard list. */
  readonly otherwise: OtherwiseConstructor

  /** Explicitly ignores the Message after earlier guards decline. */
  readonly ignore: typeof ignore

  /** Authors one source state's extracted transition map. The source tag
   * establishes its state type; each on key establishes the triggering Message. */
  readonly makeTransitions: MakeTransitions<State, Message, Context>

  /** Authors shared defaults for selected source states. State-local entries
   * override defaults. Overlapping shared entries are rejected on completion. */
  readonly makeSharedTransitions: MakeSharedTransitions<State, Message, Context>

  /** Checks and completes the Machine. Commands from local, guarded, fallback,
   * and shared edges contribute their exact Service requirement union. No
   * guard, handler, or Command Effect is executed during construction. */
  readonly makeMachine: MakeMachine<State, Message, Context>
}

/** Binds the State, Message, and optional read-only Context Schemas once.
 * Author inline tables with to/when, extracted logic with makeGuard/makeHandler,
 * and reusable tables with makeTransitions/makeSharedTransitions. makeMachine
 * checks and completes the pure Machine without another authoring stage.
 *
 * @example Given the application's SearchState, Message, and SearchContext
 * ```ts
 * import { Option } from 'effect'
 * import { Machine } from 'foldkit/experimental'
 *
 * const SearchDefinition = Machine.makeDefinition({
 *   State: SearchState,
 *   Message,
 *   Context: SearchContext,
 * })
 * const { makeGuard, makeHandler, when, ignore } = SearchDefinition
 * const maybeLabel = makeGuard(
 *   { from: 'Idle', on: 'RequestedSearch' },
 *   ({ context }) =>
 *     Option.liftPredicate((query: string) => query.length > 0)(context.query),
 * )
 * const startSearch = makeHandler(maybeLabel, ({ guardValue: label }) => ({
 *   model: SearchState.Loading({ label }),
 * }))
 * const searchMachine = SearchDefinition.makeMachine({
 *   initial: SearchState.Idle(),
 *   states: {
 *     Idle: { on: { RequestedSearch: [
 *       when(maybeLabel, 'Loading', startSearch),
 *       ignore(),
 *     ] } },
 *   },
 * })
 * ```
 *
 * @experimental Ships from foldkit/experimental/machine. */
export function makeDefinition<
  State extends Tagged,
  Message extends Tagged,
  ContextSchema extends Schema.Top,
>(
  schemas: Readonly<{
    State: MachineSchemas<State, Message, ContextSchema>['state']
    Message: MachineSchemas<State, Message, ContextSchema>['message']
    Context: ContextSchema
  }>,
): Definition<State, Message, ContextSchema['Type']>
export function makeDefinition<State extends Tagged, Message extends Tagged>(
  schemas: Readonly<{
    State: MachineSchemas<State, Message>['state']
    Message: MachineSchemas<State, Message>['message']
    Context?: never
  }>,
): Definition<State, Message>
export function makeDefinition(
  schemas: Readonly<{
    State: MachineSchemas<Tagged, Tagged>['state']
    Message: MachineSchemas<Tagged, Tagged>['message']
    Context?: Schema.Top
  }>,
): unknown {
  const isContextDeclared = schemas.Context !== undefined
  const complete =
    schemas.Context === undefined
      ? define({ state: schemas.State, message: schemas.Message })
      : define({
          state: schemas.State,
          message: schemas.Message,
          context: schemas.Context,
        })

  return {
    makeGuard: (_selector: unknown, producer: unknown) => producer,
    makeHandler: (_selectorOrGuard: unknown, producer: unknown) => producer,
    makeTransitions: (_from: unknown, transitions: unknown) => transitions,
    makeSharedTransitions: (
      from: Array.NonEmptyReadonlyArray<string>,
      transitions: Readonly<{ on: any }>,
    ) =>
      forStates(from).on<
        Tagged,
        Tagged,
        unknown,
        unknown,
        SharedTransitionMap<Tagged, Tagged, Tagged, unknown, unknown>
      >(transitions.on),
    to,
    when: (guard: (input: any) => GuardResult, target: string, handler: any) =>
      when<
        Tagged,
        Tagged,
        Tagged,
        Tagged,
        GuardResult,
        string,
        unknown,
        unknown
      >(
        (state, message, context) =>
          guard(
            isContextDeclared
              ? { state, message, context }
              : { state, message },
          ),
        target,
        handler,
      ),
    otherwise,
    ignore,
    makeMachine: complete,
  }
}
