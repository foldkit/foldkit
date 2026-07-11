import {
  Array,
  Match as M,
  Option,
  Predicate,
  Record,
  Schema,
  pipe,
} from 'effect'

import type { Command } from '../../command/index.js'

// STATE

/** Any value discriminated by a `_tag` field. Both states and Messages satisfy this shape. */
export type Tagged = Readonly<{ _tag: string }>

/** The union of `_tag` literals in a Tagged union. */
export type TagOf<Union extends Tagged> = Union['_tag']

/** The single variant of a Tagged union carrying the given tag. */
export type Variant<Union extends Tagged, Tag extends TagOf<Union>> = Extract<
  Union,
  Readonly<{ _tag: Tag }>
>

// EDGE

declare const EdgeGuardValueTypeId: unique symbol

/**
 * The single argument an Edge's `build` and `commands` callbacks receive:
 * the source state, the triggering Message, and the guard value produced by
 * the Edge's {@link when} guard (`void` on unguarded and boolean-guarded
 * Edges). Destructure the fields you need.
 */
export type EdgeInput<
  SourceState extends Tagged,
  TriggerMessage extends Tagged,
  GuardValue = void,
> = Readonly<{
  state: SourceState
  message: TriggerMessage
  guardValue: GuardValue
}>

/**
 * A single transition edge. The target state tag is a literal value, so the
 * edge set of a Machine is enumerable data. `build` constructs the target
 * variant from its {@link EdgeInput}. `maybeCommands` holds transition-time
 * effects, dispatched as ordinary Commands.
 *
 * The correlation between `target` and `build`'s return variant is enforced
 * by {@link to}'s signature, not by this type. Keeping this type free of the
 * target tag is what lets TypeScript infer the source state and trigger
 * Message from the transition table position.
 *
 * Construct with {@link to}.
 */
export type Edge<
  State extends Tagged,
  Message extends Tagged,
  SourceState extends State,
  TriggerMessage extends Message,
  GuardValue = void,
> = Readonly<{
  _tag: 'Edge'
  target: TagOf<State>
  build: (input: EdgeInput<SourceState, TriggerMessage, unknown>) => State
  maybeCommands: Option.Option<
    (
      input: EdgeInput<SourceState, TriggerMessage, unknown>,
    ) => ReadonlyArray<Command<Message>>
  >
  readonly [EdgeGuardValueTypeId]?: GuardValue
}>

/** A guarded Edge that fires only when its guard passes. Construct with {@link when}. */
export type When<
  State extends Tagged,
  Message extends Tagged,
  SourceState extends State,
  TriggerMessage extends Message,
  GuardValue = unknown,
> = Readonly<{
  _tag: 'When'
  guard: (state: SourceState, message: TriggerMessage) => Option.Option<unknown>
  edge: Edge<State, Message, SourceState, TriggerMessage, GuardValue>
}>

/** The unconditional fallback Edge at the end of a guard list. Construct with {@link otherwise}. */
export type Otherwise<
  State extends Tagged,
  Message extends Tagged,
  SourceState extends State,
  TriggerMessage extends Message,
> = Readonly<{
  _tag: 'Otherwise'
  edge: Edge<State, Message, SourceState, TriggerMessage>
}>

/** One entry in an ordered guard list: a {@link When} or the {@link Otherwise} fallback. */
export type GuardedEdge<
  State extends Tagged,
  Message extends Tagged,
  SourceState extends State,
  TriggerMessage extends Message,
> =
  | When<State, Message, SourceState, TriggerMessage, unknown>
  | Otherwise<State, Message, SourceState, TriggerMessage>

type OptionValue<MaybeValue> =
  MaybeValue extends Option.Option<infer Value> ? Value : never

type GuardValueOf<GuardResult> = [GuardResult] extends [boolean]
  ? void
  : OptionValue<GuardResult>

/**
 * The transition table: for each source state tag, the Messages it responds
 * to and the Edge (or ordered guard list) each Message fires. States absent
 * from the table, and Messages absent from a state's `on` record, are
 * ignored: {@link Machine.step} reports them as `Ignored` rather than
 * transitioning.
 */
export type TransitionTable<
  State extends Tagged,
  Message extends Tagged,
> = Readonly<{
  [SourceTag in TagOf<State>]?: Readonly<{
    on: Readonly<{
      [MessageTag in TagOf<Message>]?:
        | Edge<
            State,
            Message,
            Variant<State, SourceTag>,
            Variant<Message, MessageTag>
          >
        | ReadonlyArray<
            GuardedEdge<
              State,
              Message,
              Variant<State, SourceTag>,
              Variant<Message, MessageTag>
            >
          >
    }>
  }>
}>

const makeEdge = <
  State extends Tagged,
  Message extends Tagged,
  SourceState extends State,
  TriggerMessage extends Message,
  const TargetTag extends TagOf<State>,
  GuardValue = void,
>(
  target: TargetTag,
  build: (
    input: NoInfer<EdgeInput<SourceState, TriggerMessage, GuardValue>>,
  ) => NoInfer<Variant<State, TargetTag>>,
  commands?: (
    input: NoInfer<EdgeInput<SourceState, TriggerMessage, GuardValue>>,
  ) => NoInfer<ReadonlyArray<Command<Message>>>,
): Edge<State, Message, SourceState, TriggerMessage, GuardValue> => {
  const narrowGuardValue = (
    input: EdgeInput<SourceState, TriggerMessage, unknown>,
  ): EdgeInput<SourceState, TriggerMessage, GuardValue> => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return input as EdgeInput<SourceState, TriggerMessage, GuardValue>
  }

  return {
    _tag: 'Edge',
    target,
    build: input => build(narrowGuardValue(input)),
    maybeCommands:
      commands === undefined
        ? Option.none()
        : Option.some(input => commands(narrowGuardValue(input))),
  }
}

/**
 * Declares a transition Edge to the state variant named by `target`. The
 * `build` callback receives an {@link EdgeInput} whose state and Message are
 * narrowed to the variants the Edge sits under in the transition table, and
 * must return the target variant. Optional `commands` attach transition-time
 * effects.
 *
 * Only meaningful inside a {@link TransitionTable}: the source and trigger
 * types flow in from the table position contextually.
 */
export const to = <
  State extends Tagged,
  Message extends Tagged,
  SourceState extends State,
  TriggerMessage extends Message,
  const TargetTag extends TagOf<State>,
>(
  target: TargetTag,
  build: (
    input: NoInfer<EdgeInput<SourceState, TriggerMessage>>,
  ) => NoInfer<Variant<State, TargetTag>>,
  commands?: (
    input: NoInfer<EdgeInput<SourceState, TriggerMessage>>,
  ) => NoInfer<ReadonlyArray<Command<Message>>>,
): Edge<State, Message, SourceState, TriggerMessage> =>
  makeEdge(target, build, commands)

/**
 * Guards an Edge. Guard lists run in order, and the first guard that passes
 * fires its Edge. A guard either resolves the state and Message to an
 * `Option` (returning `Option.some` passes, and the wrapped value flows into
 * the Edge's build and commands callbacks as `guardValue`) or returns a
 * plain boolean when there is nothing to extract (returning `true` passes,
 * and `guardValue` is `void`).
 *
 * The state and Message parameters are `NoInfer` so they resolve from the
 * guard list's table position alone.
 */
export const when = <
  State extends Tagged,
  Message extends Tagged,
  SourceState extends State,
  TriggerMessage extends Message,
  GuardResult extends Option.Option<unknown> | boolean,
  const TargetTag extends TagOf<State>,
>(
  guard: (
    state: NoInfer<SourceState>,
    message: NoInfer<TriggerMessage>,
  ) => GuardResult,
  target: TargetTag,
  build: (
    input: NoInfer<
      EdgeInput<SourceState, TriggerMessage, GuardValueOf<GuardResult>>
    >,
  ) => NoInfer<Variant<State, TargetTag>>,
  commands?: (
    input: NoInfer<
      EdgeInput<SourceState, TriggerMessage, GuardValueOf<GuardResult>>
    >,
  ) => NoInfer<ReadonlyArray<Command<Message>>>,
): When<
  State,
  Message,
  SourceState,
  TriggerMessage,
  GuardValueOf<GuardResult>
> => ({
  _tag: 'When',
  guard: (state, message) => {
    const result = guard(state, message)

    if (Predicate.isBoolean(result)) {
      return result ? Option.some(undefined) : Option.none()
    } else {
      return result
    }
  },
  edge: makeEdge(target, build, commands),
})

/** The unconditional fallback at the end of a guard list. The parameter is `NoInfer` for the same reason as {@link when}'s. */
export const otherwise = <
  State extends Tagged,
  Message extends Tagged,
  SourceState extends State,
  TriggerMessage extends Message,
>(
  edge: NoInfer<Edge<State, Message, SourceState, TriggerMessage>>,
): Otherwise<State, Message, SourceState, TriggerMessage> => ({
  _tag: 'Otherwise',
  edge,
})

// RESULT

/** A step that matched an Edge: the next state plus any transition-time Commands. */
export type Transitioned<
  State extends Tagged,
  Message extends Tagged,
> = Readonly<{
  _tag: 'Transitioned'
  from: TagOf<State>
  target: TagOf<State>
  messageTag: TagOf<Message>
  state: State
  commands: ReadonlyArray<Command<Message>>
}>

/** A step that matched no Edge: the state is unchanged and the Message is observable as ignored. */
export type Ignored<State extends Tagged, Message extends Tagged> = Readonly<{
  _tag: 'Ignored'
  stateTag: TagOf<State>
  messageTag: TagOf<Message>
  state: State
}>

/** The observable outcome of one step: `Transitioned` or `Ignored`. */
export type TransitionResult<State extends Tagged, Message extends Tagged> =
  | Transitioned<State, Message>
  | Ignored<State, Message>

// ANALYSIS

/** Which guard construct an Edge sits under, with its position in the guard list. */
export type EdgeGuard =
  | Readonly<{ _tag: 'Unguarded' }>
  | Readonly<{ _tag: 'When'; position: number }>
  | Readonly<{ _tag: 'Otherwise'; position: number }>

/** One Edge of the table as plain data: source, trigger, target, and guard placement. */
export type EdgeSummary<
  State extends Tagged,
  Message extends Tagged,
> = Readonly<{
  from: TagOf<State>
  messageTag: TagOf<Message>
  target: TagOf<State>
  guard: EdgeGuard
}>

/** Why a transition can never fire. */
export type DeadTransitionReason = 'UnreachableSource' | 'ShadowedByOtherwise'

/** An Edge that can never fire, with the reason. */
export type DeadTransition<
  State extends Tagged,
  Message extends Tagged,
> = Readonly<{
  edge: EdgeSummary<State, Message>
  reason: DeadTransitionReason
}>

// MACHINE

/** A compiled state Machine: a pure transition function plus static analysis over the Edge set. */
export type Machine<State extends Tagged, Message extends Tagged> = Readonly<{
  initial: State
  stateTags: ReadonlyArray<TagOf<State>>
  edges: ReadonlyArray<EdgeSummary<State, Message>>
  transition: (
    state: State,
    message: Message,
  ) => [State, ReadonlyArray<Command<Message>>]
  step: (state: State, message: Message) => TransitionResult<State, Message>
  reachableFrom: (tag: TagOf<State>) => ReadonlySet<TagOf<State>>
  unreachableStates: () => ReadonlyArray<TagOf<State>>
  deadTransitions: () => ReadonlyArray<DeadTransition<State, Message>>
  toMermaid: () => string
}>

/**
 * The Schemas a Machine is defined over: the state union and the Message
 * union. Passed to `define`'s first stage so the type parameters are
 * fully resolved before the transition table is checked.
 */
export type MachineSchemas<
  State extends Tagged,
  Message extends Tagged,
> = Readonly<{
  state: Schema.Top &
    Readonly<{ Type: State; members: ReadonlyArray<Schema.Top> }>
  message: Schema.Top & Readonly<{ Type: Message }>
}>

/** The Machine definition: the initial state and the transition table. */
export type MachineDefinition<
  State extends Tagged,
  Message extends Tagged,
> = Readonly<{
  initial: State
  states: TransitionTable<State, Message>
}>

type LooseEdge<State extends Tagged, Message extends Tagged> = Edge<
  State,
  Message,
  State,
  Message,
  unknown
>

type LooseGuardedEdge<
  State extends Tagged,
  Message extends Tagged,
> = GuardedEdge<State, Message, State, Message>

type SelectedEdge<State extends Tagged, Message extends Tagged> = Readonly<{
  edge: LooseEdge<State, Message>
  guardValue: unknown
}>

type LooseTable<State extends Tagged, Message extends Tagged> = Readonly<
  Record<
    TagOf<State>,
    Readonly<{
      on: Readonly<
        Record<
          TagOf<Message>,
          | LooseEdge<State, Message>
          | ReadonlyArray<LooseGuardedEdge<State, Message>>
        >
      >
    }>
  >
>

const isGuardList = <State extends Tagged, Message extends Tagged>(
  edgeOrGuardedEdges:
    | LooseEdge<State, Message>
    | ReadonlyArray<LooseGuardedEdge<State, Message>>,
): edgeOrGuardedEdges is ReadonlyArray<LooseGuardedEdge<State, Message>> =>
  globalThis.Array.isArray(edgeOrGuardedEdges)

const extractLiteralTag = (tagField: unknown): Option.Option<string> => {
  if (
    Predicate.hasProperty(tagField, 'literal') &&
    Predicate.isString(tagField.literal)
  ) {
    return Option.some(tagField.literal)
  } else if (Predicate.hasProperty(tagField, 'schema')) {
    return extractLiteralTag(tagField.schema)
  } else {
    return Option.none()
  }
}

const extractMemberTag = (member: unknown): Option.Option<string> =>
  pipe(
    Option.some(member),
    Option.filter(Predicate.hasProperty('fields')),
    Option.map(struct => struct.fields),
    Option.filter(Predicate.hasProperty('_tag')),
    Option.flatMap(fields => extractLiteralTag(fields._tag)),
  )

/**
 * Compiles a declarative transition table into a {@link Machine}.
 *
 * Two stages: the first takes the state and Message union Schemas and fixes
 * the type parameters, the second takes the initial state and the transition
 * table. The split is what lets TypeScript narrow `state` and `message`
 * inside every Edge from its table position: a single-call form checks the
 * table while the type parameters are still being inferred, and the
 * narrowing collapses.
 *
 * The Machine is not a runtime: `transition` has the same shape as a Foldkit
 * `update` branch and returns `[nextState, commands]`, so the machine state
 * lives in the Model and the Foldkit runtime never learns the Machine
 * exists. Messages that match no Edge leave the state unchanged; use `step`
 * when the `Ignored` outcome should be observable.
 *
 * Because every Edge names a literal target tag, the Edge set is plain data:
 * `reachableFrom`, `unreachableStates`, `deadTransitions`, and `toMermaid`
 * all read it directly.
 */
export const define =
  <State extends Tagged, Message extends Tagged>(
    schemas: MachineSchemas<State, Message>,
  ) =>
  (definition: MachineDefinition<State, Message>): Machine<State, Message> => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const looseStates = definition.states as unknown as LooseTable<
      State,
      Message
    >

    const initialTag = definition.initial._tag

    const stateTags = pipe(
      schemas.state.members,
      Array.map(member =>
        Option.getOrThrowWith(
          extractMemberTag(member),
          () =>
            new Error(
              'Machine.define: every member of the state union Schema must be a Struct with a literal _tag field',
            ),
        ),
      ),
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      tags => tags as ReadonlyArray<TagOf<State>>,
    )

    const makeEdgeSummary = (
      from: TagOf<State>,
      messageTag: TagOf<Message>,
      target: TagOf<State>,
      guard: EdgeGuard,
    ): EdgeSummary<State, Message> => ({ from, messageTag, target, guard })

    const summarizeEntry = (
      from: TagOf<State>,
      messageTag: TagOf<Message>,
      edgeOrGuardedEdges:
        | LooseEdge<State, Message>
        | ReadonlyArray<LooseGuardedEdge<State, Message>>,
    ): ReadonlyArray<EdgeSummary<State, Message>> =>
      isGuardList(edgeOrGuardedEdges)
        ? Array.map(edgeOrGuardedEdges, (guardedEdge, position) =>
            guardedEdge._tag === 'When'
              ? makeEdgeSummary(from, messageTag, guardedEdge.edge.target, {
                  _tag: 'When',
                  position,
                })
              : makeEdgeSummary(from, messageTag, guardedEdge.edge.target, {
                  _tag: 'Otherwise',
                  position,
                }),
          )
        : [
            makeEdgeSummary(from, messageTag, edgeOrGuardedEdges.target, {
              _tag: 'Unguarded',
            }),
          ]

    const edges: ReadonlyArray<EdgeSummary<State, Message>> = pipe(
      Record.toEntries(looseStates),
      Array.flatMap(([sourceTag, stateEntry]) =>
        pipe(
          Record.toEntries(stateEntry.on),
          Array.flatMap(([messageTag, edgeOrGuardedEdges]) =>
            summarizeEntry(sourceTag, messageTag, edgeOrGuardedEdges),
          ),
        ),
      ),
    )

    const selectFromGuardList = (
      guardedEdges: ReadonlyArray<LooseGuardedEdge<State, Message>>,
      state: State,
      message: Message,
    ): Option.Option<SelectedEdge<State, Message>> =>
      Array.matchLeft(guardedEdges, {
        onEmpty: () => Option.none(),
        onNonEmpty: (guardedEdge, rest) => {
          if (guardedEdge._tag === 'When') {
            const maybeGuardValue = guardedEdge.guard(state, message)

            if (Option.isSome(maybeGuardValue)) {
              return Option.some({
                edge: guardedEdge.edge,
                guardValue: maybeGuardValue.value,
              })
            } else {
              return selectFromGuardList(rest, state, message)
            }
          } else {
            return Option.some({
              edge: guardedEdge.edge,
              guardValue: undefined,
            })
          }
        },
      })

    const chooseEdge = (
      edgeOrGuardedEdges:
        | LooseEdge<State, Message>
        | ReadonlyArray<LooseGuardedEdge<State, Message>>,
      state: State,
      message: Message,
    ): Option.Option<SelectedEdge<State, Message>> =>
      isGuardList(edgeOrGuardedEdges)
        ? selectFromGuardList(edgeOrGuardedEdges, state, message)
        : Option.some({ edge: edgeOrGuardedEdges, guardValue: undefined })

    const makeTransitioned = (
      state: State,
      message: Message,
      selectedEdge: SelectedEdge<State, Message>,
    ): Transitioned<State, Message> => ({
      _tag: 'Transitioned',
      from: state._tag,
      target: selectedEdge.edge.target,
      messageTag: message._tag,
      state: selectedEdge.edge.build({
        state,
        message,
        guardValue: selectedEdge.guardValue,
      }),
      commands: Option.match(selectedEdge.edge.maybeCommands, {
        onNone: () => [],
        onSome: buildCommands =>
          buildCommands({
            state,
            message,
            guardValue: selectedEdge.guardValue,
          }),
      }),
    })

    const makeIgnored = (
      state: State,
      message: Message,
    ): Ignored<State, Message> => ({
      _tag: 'Ignored',
      stateTag: state._tag,
      messageTag: message._tag,
      state,
    })

    const step = (
      state: State,
      message: Message,
    ): TransitionResult<State, Message> =>
      pipe(
        Record.get(looseStates, state._tag),
        Option.flatMap(stateEntry => Record.get(stateEntry.on, message._tag)),
        Option.flatMap(edgeOrGuardedEdges =>
          chooseEdge(edgeOrGuardedEdges, state, message),
        ),
        Option.match({
          onNone: () => makeIgnored(state, message),
          onSome: selectedEdge =>
            makeTransitioned(state, message, selectedEdge),
        }),
      )

    const transition = (
      state: State,
      message: Message,
    ): [State, ReadonlyArray<Command<Message>>] => {
      const result = step(state, message)

      if (result._tag === 'Transitioned') {
        return [result.state, result.commands]
      } else {
        return [result.state, []]
      }
    }

    const targetsFrom = (tag: TagOf<State>): ReadonlyArray<TagOf<State>> =>
      pipe(
        edges,
        Array.filter(edgeSummary => edgeSummary.from === tag),
        Array.map(edgeSummary => edgeSummary.target),
      )

    const reachableFrom = (tag: TagOf<State>): ReadonlySet<TagOf<State>> => {
      const visit = (
        frontier: ReadonlyArray<TagOf<State>>,
        visited: ReadonlySet<TagOf<State>>,
      ): ReadonlySet<TagOf<State>> =>
        Array.matchLeft(frontier, {
          onEmpty: () => visited,
          onNonEmpty: (head, tail) =>
            visited.has(head)
              ? visit(tail, visited)
              : visit(
                  [...tail, ...targetsFrom(head)],
                  new Set([...visited, head]),
                ),
        })

      return visit([tag], new Set())
    }

    const unreachableStates = (): ReadonlyArray<TagOf<State>> => {
      const reachable = reachableFrom(initialTag)
      return Array.filter(stateTags, stateTag => !reachable.has(stateTag))
    }

    const makeDeadTransition = (
      edge: EdgeSummary<State, Message>,
      reason: DeadTransitionReason,
    ): DeadTransition<State, Message> => ({ edge, reason })

    const guardPosition = (
      edgeSummary: EdgeSummary<State, Message>,
    ): Option.Option<number> =>
      edgeSummary.guard._tag === 'Unguarded'
        ? Option.none()
        : Option.some(edgeSummary.guard.position)

    const shadowedEdges = (): ReadonlyArray<DeadTransition<State, Message>> =>
      pipe(
        edges,
        Array.groupBy(
          edgeSummary => `${edgeSummary.from}|${edgeSummary.messageTag}`,
        ),
        Record.values,
        Array.flatMap(group => {
          const maybeOtherwisePosition = pipe(
            group,
            Array.findFirst(
              edgeSummary => edgeSummary.guard._tag === 'Otherwise',
            ),
            Option.flatMap(guardPosition),
          )

          return Option.match(maybeOtherwisePosition, {
            onNone: () => [],
            onSome: otherwisePosition =>
              pipe(
                group,
                Array.filter(edgeSummary =>
                  Option.match(guardPosition(edgeSummary), {
                    onNone: () => false,
                    onSome: position => position > otherwisePosition,
                  }),
                ),
                Array.map(edgeSummary =>
                  makeDeadTransition(edgeSummary, 'ShadowedByOtherwise'),
                ),
              ),
          })
        }),
      )

    const deadTransitions = (): ReadonlyArray<
      DeadTransition<State, Message>
    > => {
      const reachable = reachableFrom(initialTag)

      const unreachableSourceEdges = pipe(
        edges,
        Array.filter(edgeSummary => !reachable.has(edgeSummary.from)),
        Array.map(edgeSummary =>
          makeDeadTransition(edgeSummary, 'UnreachableSource'),
        ),
      )

      return [...unreachableSourceEdges, ...shadowedEdges()]
    }

    const toMermaid = (): string => {
      const guardLabel = (guard: EdgeGuard): string =>
        M.value(guard).pipe(
          M.tagsExhaustive({
            Unguarded: () => '',
            When: ({ position }) => ` [when ${position + 1}]`,
            Otherwise: () => ' [otherwise]',
          }),
        )

      const stateLines = Array.map(stateTags, stateTag => `  ${stateTag}`)

      const transitionLines = Array.map(
        edges,
        edgeSummary =>
          `  ${edgeSummary.from} --> ${edgeSummary.target}: ${edgeSummary.messageTag}${guardLabel(edgeSummary.guard)}`,
      )

      return Array.join(
        [
          'stateDiagram-v2',
          ...stateLines,
          `  [*] --> ${initialTag}`,
          ...transitionLines,
        ],
        '\n',
      )
    }

    return {
      initial: definition.initial,
      stateTags,
      edges,
      transition,
      step,
      reachableFrom,
      unreachableStates,
      deadTransitions,
      toMermaid,
    }
  }
