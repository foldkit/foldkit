import {
  Array,
  Equal,
  type Option,
  Predicate,
  Schema,
  type Stream,
  pipe,
} from 'effect'

import type {
  AnyBinding,
  BlockOfBinding,
  InspectionOfBinding,
} from '../block/binding.js'
import type { BindingParent } from '../block/bindingConnection.js'
import type { PrivateDelivery } from '../experimental/constructed/contract.js'
import {
  type InMessageStep,
  runInMessageStep,
} from '../experimental/layered/testing/inMessage.js'
import {
  type MessageDeclaration,
  type Registrations,
  type RegistryEntries,
  type Subscription as RuntimeSubscription,
  __messageDeclarations as subscriptionMessageDeclarations,
} from '../subscription/subscription.js'
import { commandArgs } from './bindingMatcher.js'
import type {
  BindingPath,
  ParentOwnerOf,
  PathBinding,
  PathLeafBinding,
  ValidateBindingPath,
} from './bindingPath.js'
import type {
  AnyCommand,
  AnyCommandInstance,
  CommandArgs,
  CommandMatcher,
  ResolvableCommandDefinition,
  ResolvableCommandMatcher,
  Resolver,
  SimulationUpdateReturn,
  SubscriptionEmissionSource,
} from './internal.js'
import {
  assertAllCommandsResolved,
  assertExactCommands,
  assertExactCommandsInOrder,
  assertHasCommands,
  assertResolveUnambiguous,
  assertZeroCommands,
  formatCommand,
  formatMatcher,
  resolveAllExactInternal,
  resolveAllInternal,
  resolveByMatcher,
  resolveSubscriptionMessage,
} from './internal.js'
import type {
  GeneratedBindingConstraint,
  KeyOfBinding,
  KeyedBindingConstraint,
  StaticBindingConstraint,
} from './toParentMessage.js'

export type { AnyCommand, CommandMatcher, Resolver }
export { type InitStep, init } from './internal.js'

/** An immutable test simulation of a Foldkit program. */
export type StorySimulation<Model, Message, OutMessage = undefined> = Readonly<{
  /** @internal Carries the Message type through the step chain. */
  _phantomMessage?: Message
  model: Model
  commands: ReadonlyArray<AnyCommand>
  outMessage: OutMessage | undefined
}>

/** A callable step that sets the initial Model. Carries phantom type for compile-time validation. */
export type GivenStep<Model> = Readonly<{ _phantomModel: Model }> &
  (<M, Message, OutMessage = undefined>(
    simulation: StorySimulation<M, Message, OutMessage>,
  ) => StorySimulation<M, Message, OutMessage>)

/** A model-assertion step produced by {@link model}. */
export type ModelStep<Model> = Readonly<{
  readonly _tag: 'ModelStep'
  readonly assert: (model: Model) => void
}>

/** A typed Message-dispatch step produced by {@link message}. */
export type MessageStep<Message> = Readonly<{
  _tag: 'MessageStep'
  message: Message
}>

/** A Message-dispatch step produced by {@link messageWith}. */
export type MessageWithStep<Model, Message> = Readonly<{
  _tag: 'MessageWithStep'
  toMessage: (model: Model) => Message
}>

/** A Subscription Message step produced by `Subscription.from(...).emit`. */
export type SubscriptionMessageStep<Message> = Readonly<{
  _tag: 'SubscriptionMessageStep'
  /** @internal Carries the registered Subscriptions' Message type. */
  _phantomMessage?: Message
  declarations: ReadonlyArray<MessageDeclaration>
  entry: unknown
  message: unknown
}>

/** A passive Subscription Message step resolved by a Block-aware Story. */
export type BlockSubscriptionMessageStep<DispatchMessage, Entry, Message> =
  Readonly<{
    _tag: 'BlockSubscriptionMessageStep'
    /** @internal Carries the selected root dispatch contract. */
    _phantomDispatchMessage?: DispatchMessage
    /** @internal Carries the registered source contract. */
    _phantomEntry?: Entry
    entry: Entry
    message: Message
  }>

/** A typed OutMessage assertion step produced by {@link expectOutMessage}. */
export type OutMessageStep<OutMessage> = Readonly<{
  _tag: 'OutMessageStep'
  expected: OutMessage
}>

const AssertModels = Symbol('StoryAssertModels')

/** A grouped sequence of Story steps produced by {@link steps}. */
export interface StoryStepsStep<
  GivenModel,
  ModelAssertion,
  Message,
  OutMessage,
  InMessage = never,
  BlockSubscriptionStep = never,
> extends Readonly<{
  _tag: 'StoryStepsStep'
  /** @internal Carries the produced Model type through a reusable step group. */
  _phantomGivenModel?: GivenModel
  /** @internal Carries Model assertion types through a reusable step group. */
  _phantomModelAssertion?: ModelAssertion
  /** @internal Carries the Message type through a reusable step group. */
  _phantomMessage?: Message
  /** @internal Carries the OutMessage type through a reusable step group. */
  _phantomOutMessage?: OutMessage
  /** @internal Retains the separate input requirement of grouped steps. */
  _phantomInMessage?: InMessage
  /** @internal Retains graph-backed Subscription requirements. */
  _phantomBlockSubscriptionStep?: BlockSubscriptionStep
  [AssertModels]?: (before: any, after: any) => void
  steps: ReadonlyArray<
    StoryStep<
      any,
      any,
      any,
      unknown,
      BlockSubscriptionMessageStep<any, any, any>
    >
  >
}> {}

/** A single step in a story. */
export type StoryStep<
  Model,
  Message = unknown,
  OutMessage = unknown,
  InMessage = never,
  BlockSubscriptionStep = never,
> =
  | GivenStep<NoInfer<Model>>
  | ModelStep<NoInfer<Model>>
  | MessageStep<NoInfer<Message>>
  | MessageWithStep<NoInfer<Model>, NoInfer<Message>>
  | SubscriptionMessageStep<NoInfer<Message>>
  | NoInfer<BlockSubscriptionStep>
  | OutMessageStep<NoInfer<OutMessage>>
  | ([InMessage] extends [never] ? never : InMessageStep<NoInfer<InMessage>>)
  | StoryStepsStep<
      NoInfer<Model>,
      (model: NoInfer<Model>) => void,
      NoInfer<Message>,
      NoInfer<OutMessage>,
      NoInfer<InMessage>,
      NoInfer<BlockSubscriptionStep>
    >
  | ((
      simulation: StorySimulation<any, any, any>,
    ) => StorySimulation<any, any, any>)

// INTERNAL

type InternalStorySimulation<
  Model,
  Message,
  OutMessage = undefined,
> = StorySimulation<Model, Message, OutMessage> &
  Readonly<{
    isInitialized: boolean
    message: Message | undefined
    updateFn: (
      model: Model,
      message: Message,
    ) => SimulationUpdateReturn<Model, OutMessage>
  }>

const toInternal = <Model, Message, OutMessage>(
  simulation: StorySimulation<Model, Message, OutMessage>,
): InternalStorySimulation<Model, Message, OutMessage> =>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  simulation as InternalStorySimulation<Model, Message, OutMessage>

// STEPS

/** Sets the initial Model for a test story. */
export const given = <Model>(model: Model): GivenStep<Model> => {
  const step = <M, Message, OutMessage = undefined>(
    simulation: StorySimulation<M, Message, OutMessage>,
  ): StorySimulation<M, Message, OutMessage> => {
    const internal = toInternal(simulation)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return {
      ...internal,
      isInitialized: true,
      model,
    } as unknown as StorySimulation<M, Message, OutMessage>
  }
  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  return Object.assign(step, {
    _phantomModel: undefined as unknown as Model,
  }) as GivenStep<Model>
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
}

/** @internal Seeds a story from a complete initialization result without executing Commands. */
export const __givenInit = <Model, OutMessage = undefined>(
  init: SimulationUpdateReturn<Model, OutMessage>,
): GivenStep<Model> => {
  const step = <Message>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> => {
    const next = {
      ...toInternal(simulation),
      isInitialized: true,
      model: init.model,
      commands: init.commands ?? [],
      outMessage: init.outMessage,
    }

    return next
  }

  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  return Object.assign(step, {
    _phantomModel: undefined as unknown as Model,
  }) as GivenStep<Model>
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
}

const applyMessage = <Model, Message, OutMessage>(
  simulation: StorySimulation<Model, Message, OutMessage>,
  message_: Message,
): StorySimulation<Model, Message, OutMessage> => {
  const internal = toInternal(simulation)
  const messageUpdate = internal.updateFn(internal.model, message_)

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return {
    ...internal,
    model: messageUpdate.model,
    message: message_,
    commands: Array.appendAll(internal.commands, messageUpdate.commands ?? []),
    outMessage: messageUpdate.outMessage,
  } as StorySimulation<Model, Message, OutMessage>
}

const applyInMessage = <Model, Message, OutMessage>(
  simulation: StorySimulation<Model, Message, OutMessage>,
  step: object,
): StorySimulation<Model, Message, OutMessage> => {
  const internal = toInternal(simulation)
  const received = runInMessageStep<Model, OutMessage>(step, internal.model)

  const next = {
    ...internal,
    model: received.model,
    message: undefined,
    commands: Array.appendAll(internal.commands, received.commands ?? []),
    outMessage: received.outMessage,
  }

  return next
}

/** Sends a Message through update. Commands stay pending until resolve or
 *  resolveAll. */
export const message = <Message>(message_: Message): MessageStep<Message> => ({
  _tag: 'MessageStep',
  message: message_,
})

/** Sends a Message computed from the Model held when the step runs. Commands
 *  follow the same pending and append behavior as {@link message}. */
export const messageWith = <Model, Message>(
  toMessage: (model: Model) => Message,
): MessageWithStep<Model, Message> => ({
  _tag: 'MessageWithStep',
  toMessage,
})

type IsAny<Value> = 0 extends 1 & Value ? true : false

interface SubscriptionStream<Message> {
  readonly dependenciesToStream: (
    ...args: ReadonlyArray<any>
  ) => Stream.Stream<Message, never, any>
}

type MessageOfSubscriptions<Subscriptions> =
  IsAny<Subscriptions> extends true
    ? any
    : RegistryEntries<Subscriptions>[keyof RegistryEntries<Subscriptions>] extends SubscriptionStream<
          infer Message
        >
      ? Message
      : never

type EmissionSourceOf<Subscriptions> =
  IsAny<Subscriptions> extends true
    ? any
    : SubscriptionEmissionSource<
        RegistryEntries<Subscriptions>[keyof RegistryEntries<Subscriptions>]
      >

interface SubscriptionMessages<Messages extends ReadonlyArray<Schema.Top>> {
  readonly messages: Messages
}

const SubscriptionPathSelectionTypeId = Symbol(
  'foldkit/Story/SubscriptionPathSelection',
)

/** A Subscription source selected through one checked Block Binding path. */
export interface SubscriptionPathSelection<
  ParentOwner,
  Source extends SubscriptionMessages<ReadonlyArray<Schema.Top>>,
> {
  readonly [SubscriptionPathSelectionTypeId]: Readonly<{
    path: ReadonlyArray<unknown>
    source: Source
  }>
  readonly messages: Source['messages']
  /** @internal Carries the root owner selected by the Binding path. */
  readonly _phantomParentOwner?: ParentOwner
}

/** @internal Reads a passive Subscription path selection. */
export const __subscriptionPathSelection = (
  value: unknown,
):
  | Readonly<{
      path: ReadonlyArray<unknown>
      source: SubscriptionMessages<ReadonlyArray<Schema.Top>>
    }>
  | undefined => {
  if (!Predicate.isObject(value)) {
    return undefined
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return Reflect.get(value, SubscriptionPathSelectionTypeId) as
    | Readonly<{
        path: ReadonlyArray<unknown>
        source: SubscriptionMessages<ReadonlyArray<Schema.Top>>
      }>
    | undefined
}

type BindingChildOwnerId<Binding extends AnyBinding> =
  BlockOfBinding<Binding> extends Readonly<{
    owner: Readonly<{ id: infer Id extends string }>
  }>
    ? Id
    : never

type BindingSubscriptions<Binding extends AnyBinding> =
  InspectionOfBinding<Binding> extends Readonly<{
    subscriptions: infer Subscriptions
  }>
    ? Subscriptions
    : never

type OwnerQualifiedBindingSubscriptionSource<Binding extends AnyBinding> =
  RuntimeSubscription<any, any, any, any> &
    SubscriptionMessages<ReadonlyArray<Schema.Top>> &
    Readonly<{ name: `${BindingChildOwnerId<Binding>}/${string}` }>

type BindingSubscriptionSource<Binding extends AnyBinding> = [
  keyof RegistryEntries<BindingSubscriptions<Binding>>,
] extends [never]
  ? OwnerQualifiedBindingSubscriptionSource<Binding>
  : EmissionSourceOf<BindingSubscriptions<Binding>> &
      SubscriptionMessages<ReadonlyArray<Schema.Top>>

/** Selects a registered Subscription source through a checked Binding path. */
function selectSubscriptionPath<
  const Path extends BindingPath,
  const Source extends BindingSubscriptionSource<
    Extract<PathLeafBinding<Path>, AnyBinding>
  >,
>(
  path: Path & ValidateBindingPath<Path>,
  source: Source,
): SubscriptionPathSelection<ParentOwnerOf<PathBinding<Path[0]>>, Source>
function selectSubscriptionPath<
  const Binding extends AnyBinding & BindingParent<unknown>,
  const Source extends BindingSubscriptionSource<Binding>,
>(
  binding: Binding &
    GeneratedBindingConstraint<Binding> &
    StaticBindingConstraint<Binding>,
  source: Source,
): SubscriptionPathSelection<ParentOwnerOf<Binding>, Source>
function selectSubscriptionPath<
  const Binding extends AnyBinding & BindingParent<unknown>,
  const Source extends BindingSubscriptionSource<Binding>,
>(
  binding: Binding &
    GeneratedBindingConstraint<Binding> &
    KeyedBindingConstraint<Binding>,
  key: KeyOfBinding<Binding>,
  source: Source,
): SubscriptionPathSelection<ParentOwnerOf<Binding>, Source>
function selectSubscriptionPath(
  bindingOrPath: object,
  keyOrSource: unknown,
  maybeSource?: unknown,
): unknown {
  const isPath = globalThis.Array.isArray(bindingOrPath)
  const isKeyed = maybeSource !== undefined
  const path = isPath
    ? bindingOrPath
    : isKeyed
      ? [{ binding: bindingOrPath, key: keyOrSource }]
      : [bindingOrPath]
  const source = isKeyed ? maybeSource : keyOrSource

  if (path.length === 0 || !Predicate.isObject(source)) {
    throw new Error(
      '[foldkit] Story.Subscription.at requires a nonempty Binding path and registered Subscription source.',
    )
  }

  return {
    [SubscriptionPathSelectionTypeId]: { path, source },
    messages: Reflect.get(source, 'messages'),
  }
}

type RawBlockSubscriptionSource = RuntimeSubscription<any, any, any, any> &
  SubscriptionMessages<ReadonlyArray<Schema.Top>>

type BlockSubscriptionSource =
  | RawBlockSubscriptionSource
  | SubscriptionPathSelection<
      any,
      SubscriptionMessages<ReadonlyArray<Schema.Top>>
    >

type DispatchMessageOfSubscriptionSource<Entry> =
  Entry extends SubscriptionPathSelection<infer ParentOwner, any>
    ? PrivateDelivery<ParentOwner>
    : never

const emitBlockSubscriptionMessage = <
  const Entry extends BlockSubscriptionSource,
>(
  entry: Entry,
  message: NoInfer<Entry['messages'][number]['Type']>,
): BlockSubscriptionMessageStep<
  DispatchMessageOfSubscriptionSource<Entry>,
  Entry,
  Entry['messages'][number]['Type']
> => ({
  _tag: 'BlockSubscriptionMessageStep',
  entry,
  message,
})

type RegisteredBlockSubscriptionStep<Subscriptions, DispatchMessage> =
  RegistryEntries<Subscriptions> extends Readonly<
    Record<string, RuntimeSubscription<any, any, any, any>>
  >
    ? {
        readonly [
          Key in keyof RegistryEntries<Subscriptions>
        ]: RegistryEntries<Subscriptions>[Key] extends SubscriptionMessages<
          infer Messages
        >
          ? BlockSubscriptionMessageStep<
              DispatchMessage,
              SubscriptionEmissionSource<RegistryEntries<Subscriptions>[Key]>,
              Messages[number]['Type']
            >
          : never
      }[keyof RegistryEntries<Subscriptions>]
    : never

/** @internal Graph-backed Subscription steps accepted by one Block-aware Story. */
export type BlockSubscriptionStepFor<Subscriptions, DispatchMessage> =
  | RegisteredBlockSubscriptionStep<Subscriptions, DispatchMessage>
  | BlockSubscriptionMessageStep<
      DispatchMessage,
      SubscriptionPathSelection<
        any,
        SubscriptionMessages<ReadonlyArray<Schema.Top>>
      >,
      unknown
    >

/** Emission steps for one registered Subscription record. Explicit annotations
 *  retain the accepted entry source as the second type argument. */
export interface SubscriptionEmitter<Message, EmissionSource> {
  /** Feeds a decoded Message declared by `entry` through update. For a child
   *  entry, Story applies the generated delivery in the registered record. */
  readonly emit: <
    Entry extends SubscriptionMessages<ReadonlyArray<Schema.Top>> &
      EmissionSource,
  >(
    entry: Entry,
    message: NoInfer<Entry['messages'][number]['Type']>,
  ) => SubscriptionMessageStep<Message>
}

const fromSubscriptions = <
  const Subscriptions extends Registrations<any, any, any>,
>(
  subscriptions: Subscriptions,
): SubscriptionEmitter<
  MessageOfSubscriptions<Subscriptions>,
  EmissionSourceOf<Subscriptions>
> => {
  const declarations = subscriptionMessageDeclarations(subscriptions)

  return {
    emit: (entry, message) => ({
      _tag: 'SubscriptionMessageStep',
      declarations,
      entry,
      message,
    }),
  }
}

const applySubscriptionMessage = <Model, Message, OutMessage>(
  simulation: StorySimulation<Model, Message, OutMessage>,
  step: SubscriptionMessageStep<unknown>,
): StorySimulation<Model, Message, OutMessage> => {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const message_ = resolveSubscriptionMessage(
    'Story.Subscription.emit',
    step.declarations,
    step.entry,
    step.message,
  ) as Message

  return applyMessage(simulation, message_)
}

/** Steps that model decoded Messages arriving from a Subscription. */
export const Subscription = {
  /** Selects a child Subscription through one static, keyed, or nested Binding
   *  path. Exact registration membership is checked statically when the
   *  Binding exposes it. A child implementation supplied by a selected Layer
   *  remains encapsulated, so its source name is checked against the child's
   *  nominal owner here and against the acquired graph's exact source identity
   *  at runtime. */
  at: selectSubscriptionPath,
  /** Feeds a declared raw Subscription Message through a Block-aware Story's
   *  selected graph. A root source retained by the selected Block facts may be
   *  passed directly. Select provider-private child sources with `at`.
   *  Construction is passive: no handler or Stream is started. */
  emit: emitBlockSubscriptionMessage,
  /** Returns an explicit emitter for a completed registry. Use this route for
   *  low-level update-only Stories without a selected Block graph. The entry
   *  must belong to that record or be the child entry from which a registered
   *  entry was lifted. */
  from: fromSubscriptions,
} as const

/** Resolves a pending Command with its raw result Message. A Definition matches
 *  its originating identity; an instance also matches its complete args.
 *  A scoped instance selects its composition occurrence. */
const resolveCommand: {
  <Name extends string, ResultMessage>(
    definition: ResolvableCommandDefinition<Name, ResultMessage>,
    resultMessage: ResultMessage,
  ): <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ) => StorySimulation<Model, Message, OutMessage>
  <ResultMessage>(
    instance: AnyCommandInstance<ResultMessage>,
    resultMessage: ResultMessage,
  ): <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ) => StorySimulation<Model, Message, OutMessage>
} =
  <ResultMessage>(matcher: CommandMatcher, resultMessage: ResultMessage) =>
  <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)
    assertResolveUnambiguous(internal.commands, matcher)
    const next = resolveByMatcher(internal, matcher, resultMessage)

    if (Predicate.isUndefined(next)) {
      const pending = Array.match(internal.commands, {
        onEmpty: () => '    (none)',
        onNonEmpty: nonEmpty =>
          pipe(
            nonEmpty,
            Array.map(command => `    ${formatCommand(command)}`),
            Array.join('\n'),
          ),
      })
      throw new Error(
        `I tried to resolve "${formatMatcher(matcher)}" but no matching pending Command was found.\n\n` +
          `Pending Commands:\n${pending}\n\n` +
          'Make sure the previous Message produced this Command.',
      )
    }

    return next
  }

/** Resolves listed Commands with their result Messages, cascading through any
 *  Commands the result produces. Each entry is consumed by exactly one
 *  matching dispatch in declaration order, so
 *  `[Def, m1], [Def, m2], [Def, m3]` reads as a sequence of three responses.
 *  For N identical responses, compose with
 *  `Array.makeBy(n, () => [Def, message])`. Resolvers apply only to this call:
 *  unmatched entries are discarded, while unrelated Commands remain pending. */
const resolveAllCommands =
  <Matchers extends ReadonlyArray<ResolvableCommandMatcher>>(
    ...resolvers: { [K in keyof Matchers]: Resolver<Matchers[K]> }
  ) =>
  <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> =>
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    resolveAllInternal(toInternal(simulation), resolvers) as StorySimulation<
      Model,
      Message,
      OutMessage
    >

/** Resolves listed Commands with their result Messages, cascading through any
 *  Commands the results produce. Every resolver must match one dispatch in
 *  this call, and no actual Commands may remain unresolved. Supplied resolvers
 *  do not carry forward. */
const resolveAllExactCommands =
  <Matchers extends ReadonlyArray<ResolvableCommandMatcher>>(
    ...resolvers: { [K in keyof Matchers]: Resolver<Matchers[K]> }
  ) =>
  <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> =>
    resolveAllExactInternal(toInternal(simulation), resolvers)

/** Runs an assertion function against the current Model. */
export const model = <Model>(f: (model: Model) => void): ModelStep<Model> => ({
  _tag: 'ModelStep',
  assert: f,
})

/** Groups Story steps so a reusable setup can remain type-safe without
 *  erasing its Message or OutMessage types through function composition. */
export const steps = <
  Steps extends ReadonlyArray<
    StoryStep<
      any,
      any,
      any,
      unknown,
      BlockSubscriptionMessageStep<any, any, any>
    >
  >,
>(
  ...storySteps: Steps
): StoryStepsStep<
  Steps[number] extends infer Step
    ? Step extends GivenStep<infer Model>
      ? Model
      : Step extends StoryStepsStep<infer Model, any, any, any, any, any>
        ? Model
        : never
    : never,
  Steps[number] extends infer Step
    ? Step extends ModelStep<infer Model>
      ? (model: Model) => void
      : Step extends MessageWithStep<infer Model, any>
        ? (model: Model) => void
        : Step extends StoryStepsStep<
              any,
              infer ModelAssertion,
              any,
              any,
              any,
              any
            >
          ? ModelAssertion
          : never
    : never,
  Steps[number] extends infer Step
    ? Step extends MessageStep<infer Message>
      ? Message
      : Step extends MessageWithStep<any, infer Message>
        ? Message
        : Step extends SubscriptionMessageStep<infer Message>
          ? Message
          : Step extends StoryStepsStep<any, any, infer Message, any, any, any>
            ? Message
            : never
    : never,
  Steps[number] extends infer Step
    ? Step extends OutMessageStep<infer OutMessage>
      ? OutMessage
      : Step extends StoryStepsStep<any, any, any, infer OutMessage, any, any>
        ? OutMessage
        : never
    : never,
  Steps[number] extends infer Step
    ? Step extends InMessageStep<infer Input>
      ? Input
      : Step extends StoryStepsStep<any, any, any, any, infer Input, any>
        ? Input
        : never
    : never,
  Steps[number] extends infer Step
    ? Step extends BlockSubscriptionMessageStep<any, any, any>
      ? Step
      : Step extends StoryStepsStep<any, any, any, any, any, infer BlockStep>
        ? BlockStep
        : never
    : never
> => ({
  _tag: 'StoryStepsStep',
  steps: storySteps,
})

/** Runs grouped Story steps, then asserts against the Models immediately before
 *  and after that group. */
export const models = <
  Model,
  GivenModel,
  ModelAssertion,
  Message,
  OutMessage,
  InMessage,
  BlockSubscriptionStep,
>(
  groupedSteps: StoryStepsStep<
    GivenModel,
    ModelAssertion,
    Message,
    OutMessage,
    InMessage,
    BlockSubscriptionStep
  >,
  assert: (before: Model, after: Model) => void,
): StoryStepsStep<
  GivenModel,
  ModelAssertion | ((model: Model) => void),
  Message,
  OutMessage,
  InMessage,
  BlockSubscriptionStep
> => ({
  ...groupedSteps,
  [AssertModels]: assert,
})

/** Asserts that every matcher selects a pending Command. Definitions select
 *  their originating identity; instances also compare complete args and any
 *  explicitly scoped composition occurrence. */
const expectHasCommandsStep =
  (...matchers: ReadonlyArray<CommandMatcher>) =>
  <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> => {
    assertHasCommands(toInternal(simulation).commands, matchers)
    return simulation
  }

/** Asserts that the pending Commands match the given matchers exactly
 *  (order-independent). Definitions select their originating identity;
 *  instances also compare complete args and any scoped occurrence.
 *  Each matcher must consume exactly one
 *  pending Command. */
const expectExactCommandsStep =
  (...matchers: ReadonlyArray<CommandMatcher>) =>
  <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> => {
    assertExactCommands(toInternal(simulation).commands, matchers)
    return simulation
  }

/** Asserts that the pending Commands match the given matchers exactly in
 *  dispatch order. Definitions select their originating identity; instances
 *  also compare complete args and any scoped occurrence. */
const expectExactCommandsInOrderStep =
  (...matchers: ReadonlyArray<CommandMatcher>) =>
  <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> => {
    assertExactCommandsInOrder(toInternal(simulation).commands, matchers)
    return simulation
  }

/** Asserts that there are no pending Commands. */
const expectNoCommandsStep =
  () =>
  <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> => {
    assertZeroCommands(toInternal(simulation).commands)

    return simulation
  }

/** Utilities for inspecting and resolving pending Commands of a story simulation.
 *  Destructure as `const { Command } = Story` for concise call sites. */
export const Command = {
  /** Projects captured args by reference when the pending Command has this
   * Definition's source identity, across all Binding and keyed occurrences.
   * An argless match returns `Some(undefined)`; other sources and name-only
   * metadata return `None`. This does not decode args, narrow the pending value,
   * run Effects, or choose among matching occurrences. */
  argsOf: <Definition extends ResolvableCommandDefinition<string, unknown>>(
    definition: Definition,
  ): ((pending: AnyCommand) => Option.Option<CommandArgs<Definition>>) =>
    commandArgs(definition),
  /** Resolves a specific pending Command with the given result Message. */
  resolve: resolveCommand,
  /** Resolves listed Commands with their result Messages, cascading through any
   *  Commands the result produces. Each entry resolves exactly one matching
   *  dispatch in declaration order; compose with `Array.makeBy` for N
   *  identical responses. Resolvers apply only to this call; unmatched entries
   *  are discarded and unrelated Commands remain pending. */
  resolveAll: resolveAllCommands,
  /** Resolves listed Commands and throws unless every resolver matches one
   *  dispatch and no actual Commands remain unresolved. Entries apply only to
   *  this call and never carry forward. */
  resolveAllExact: resolveAllExactCommands,
  /** Asserts that every given Command is among the pending Commands. */
  expectHas: expectHasCommandsStep,
  /** Asserts that the pending Commands match the given definitions exactly (order-independent). */
  expectExact: expectExactCommandsStep,
  /** Asserts that the pending Commands match the given matchers exactly in dispatch order. */
  expectExactInOrder: expectExactCommandsInOrderStep,
  /** Asserts that there are no pending Commands. */
  expectNone: expectNoCommandsStep,
} as const

const assertOutMessage = <Model, Message, OutMessage>(
  simulation: StorySimulation<Model, Message, OutMessage>,
  expected: unknown,
): void => {
  const internal = toInternal(simulation)
  const outMessage = internal.outMessage

  if (outMessage === undefined || !Equal.equals(outMessage, expected)) {
    throw new Error(
      `Expected OutMessage:\n\n    ${JSON.stringify(expected)}\n\nBut got:\n\n    ${JSON.stringify(outMessage)}`,
    )
  }
}

/** Asserts by structural equality that update emitted the expected OutMessage,
 *  so callers can pass a freshly constructed expected value. */
export const expectOutMessage = <OutMessage>(
  expected: OutMessage,
): OutMessageStep<OutMessage> => ({
  _tag: 'OutMessageStep',
  expected,
})

/** Asserts that update emitted no OutMessage. */
export const expectNoOutMessage =
  () =>
  <Model, Message, OutMessage>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)
    const outMessage = internal.outMessage

    if (!Predicate.isUndefined(outMessage)) {
      throw new Error(
        `Expected no OutMessage but got:\n\n    ${JSON.stringify(outMessage)}`,
      )
    }

    return simulation
  }

// STORY

const applyStoryStep = <
  Model,
  Message,
  OutMessage,
  InMessage,
  BlockSubscriptionStep,
>(
  current: StorySimulation<Model, Message, OutMessage>,
  step: StoryStep<Model, Message, OutMessage, InMessage, BlockSubscriptionStep>,
): StorySimulation<Model, Message, OutMessage> => {
  if (Predicate.isTagged(step, 'ModelStep')) {
    step.assert(toInternal(current).model)
    return current
  }

  if (Predicate.isTagged(step, 'MessageStep')) {
    return applyMessage(current, step.message)
  }

  if (Predicate.isTagged(step, 'BlockInMessageStep')) {
    return applyInMessage(current, step)
  }

  if (Predicate.isTagged(step, 'MessageWithStep')) {
    return applyMessage(current, step.toMessage(toInternal(current).model))
  }

  if (Predicate.isTagged(step, 'SubscriptionMessageStep')) {
    return applySubscriptionMessage(current, step)
  }

  if (Predicate.isTagged(step, 'BlockSubscriptionMessageStep')) {
    throw new Error(
      '[foldkit] Story.Subscription.emit requires a Block-aware Story. Use Story.Subscription.from(registry).emit for an update-only Story.',
    )
  }

  if (Predicate.isTagged(step, 'OutMessageStep')) {
    assertOutMessage(current, step.expected)
    return current
  }

  if (Predicate.isTagged(step, 'StoryStepsStep')) {
    const internal = toInternal(current)
    const assertModels = step[AssertModels]

    if (assertModels !== undefined && !internal.isInitialized) {
      throw new Error(
        '[foldkit] Story.models requires an initial Model before its grouped steps.',
      )
    }

    const next = Array.reduce(step.steps, current, applyStoryStep)

    assertModels?.(internal.model, toInternal(next).model)

    return next
  }

  if (Predicate.isFunction(step)) {
    const next = step(current)
    const nextInternal = toInternal(next)

    if (nextInternal.isInitialized === undefined) {
      return { ...toInternal(current), ...nextInternal }
    } else {
      return next
    }
  }

  return current
}

/** Executes a test story and returns its final Model. Throws if any Commands
 *  remain unresolved. */
export const story: {
  <Model, Message, OutMessage = never>(
    updateFn: (
      model: Model,
      message: Message,
    ) => Readonly<{
      model: Model
      commands?: ReadonlyArray<AnyCommand> | undefined
      outMessage?: OutMessage
    }>,
    ...steps: ReadonlyArray<
      StoryStep<NoInfer<Model>, NoInfer<Message>, NoInfer<OutMessage>>
    >
  ): Model
  <Model, Message>(
    updateFn: (
      model: Model,
      message: Message,
    ) => Readonly<{
      model: Model
      commands?: ReadonlyArray<AnyCommand> | undefined
      outMessage?: never
    }>,
    ...steps: ReadonlyArray<
      StoryStep<NoInfer<Model>, NoInfer<Message>, undefined>
    >
  ): Model
} = <Model, Message, OutMessage = undefined>(
  updateFn: (
    model: Model,
    message: Message,
  ) => SimulationUpdateReturn<Model, OutMessage>,
  ...steps: ReadonlyArray<StoryStep<Model, Message, OutMessage>>
): Model => {
  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  const seed = {
    isInitialized: false,
    model: undefined as unknown,
    message: undefined,
    commands: Array.empty(),
    outMessage: undefined,
    updateFn,
  } as unknown as StorySimulation<Model, Message, OutMessage>

  const result = Array.reduce(steps, seed, applyStoryStep)
  /* eslint-enable @typescript-eslint/consistent-type-assertions */

  const internal = toInternal(result)
  assertAllCommandsResolved(internal.commands)

  if (!internal.isInitialized) {
    throw new Error(
      '[foldkit] Story requires an initial Model before it can return a final Model.',
    )
  }

  return internal.model
}
