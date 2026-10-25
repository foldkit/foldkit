import { Array, Equal, type Option, Predicate, Schema, pipe } from 'effect'

import {
  type MessageDeclaration,
  type Registrations,
  type RegistryEntries,
  type Subscription as RuntimeSubscription,
  __messageDeclarations as subscriptionMessageDeclarations,
} from '../subscription/subscription.js'
import { commandArgs } from './bindingMatcher.js'
import type {
  AnyCommand,
  AnyCommandInstance,
  CommandArgs,
  CommandMatcher,
  ResolvableCommandDefinition,
  ResolvableCommandMatcher,
  Resolver,
  ResolverEntry,
  SimulationUpdateReturn,
  SubscriptionEmissionSource,
} from './internal.js'
import {
  assertAllCommandsResolved,
  assertExactCommands,
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

export type { AnyCommand, CommandMatcher, Resolver }

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

/** A typed OutMessage assertion step produced by {@link expectOutMessage}. */
export type OutMessageStep<OutMessage> = Readonly<{
  _tag: 'OutMessageStep'
  expected: OutMessage
}>

/** A grouped sequence of Story steps produced by {@link steps}. */
export type StoryStepsStep<GivenModel, ModelAssertion, Message, OutMessage> =
  Readonly<{
    _tag: 'StoryStepsStep'
    /** @internal Carries the produced Model type through a reusable step group. */
    _phantomGivenModel?: GivenModel
    /** @internal Carries Model assertion types through a reusable step group. */
    _phantomModelAssertion?: ModelAssertion
    /** @internal Carries the Message type through a reusable step group. */
    _phantomMessage?: Message
    /** @internal Carries the OutMessage type through a reusable step group. */
    _phantomOutMessage?: OutMessage
    steps: ReadonlyArray<StoryStep<any, any, any>>
  }>

/** A single step in a story. */
export type StoryStep<Model, Message = unknown, OutMessage = unknown> =
  | GivenStep<NoInfer<Model>>
  | ModelStep<NoInfer<Model>>
  | MessageStep<NoInfer<Message>>
  | MessageWithStep<NoInfer<Model>, NoInfer<Message>>
  | SubscriptionMessageStep<NoInfer<Message>>
  | OutMessageStep<NoInfer<OutMessage>>
  | StoryStepsStep<
      NoInfer<Model>,
      (model: NoInfer<Model>) => void,
      NoInfer<Message>,
      NoInfer<OutMessage>
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
    message: Message | undefined
    updateFn: (
      model: Model,
      message: Message,
    ) => SimulationUpdateReturn<Model, OutMessage>
    resolvers: ReadonlyArray<ResolverEntry>
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
    return { ...internal, model } as unknown as StorySimulation<
      M,
      Message,
      OutMessage
    >
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

type MessageOfSubscriptions<Subscriptions> =
  IsAny<Subscriptions> extends true
    ? any
    : RegistryEntries<Subscriptions>[keyof RegistryEntries<Subscriptions>] extends RuntimeSubscription<
          any,
          infer Message,
          any,
          any
        >
      ? Message
      : never

type EmissionSourceOf<Subscriptions> =
  IsAny<Subscriptions> extends true
    ? any
    : {
        readonly [
          Key in keyof RegistryEntries<Subscriptions>
        ]: SubscriptionEmissionSource<RegistryEntries<Subscriptions>[Key]>
      }[keyof RegistryEntries<Subscriptions>]

/** Emission steps for one registered Subscription record. Explicit annotations
 *  retain the accepted entry source as the second type argument. */
export type SubscriptionEmitter<Message, EmissionSource> = Readonly<{
  /** Feeds a decoded Message declared by `entry` through update. For a child
   *  entry, Story applies the generated delivery in the registered record. */
  emit: <
    Entry extends Readonly<{
      messages: ReadonlyArray<Schema.Top>
    }> &
      EmissionSource,
  >(
    entry: Entry,
    message: NoInfer<Schema.Schema.Type<Entry['messages'][number]>>,
  ) => SubscriptionMessageStep<Message>
}>

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
  /** Returns an emitter for a completed Block's registered Subscriptions. The
   *  entry must belong to that record or be the child entry from which a
   *  registered entry was lifted. */
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
 *  `Array.makeBy(n, () => [Def, message])`. Resolvers carry across
 *  `resolveAll` calls: unused entries can match later dispatches, and a new
 *  entry replaces any leftover resolvers sharing its Definition or Instance
 *  shape (latest wins). */
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
export const steps = <Steps extends ReadonlyArray<StoryStep<any, any, any>>>(
  ...storySteps: Steps
): StoryStepsStep<
  Steps[number] extends infer Step
    ? Step extends GivenStep<infer Model>
      ? Model
      : Step extends StoryStepsStep<infer Model, any, any, any>
        ? Model
        : never
    : never,
  Steps[number] extends infer Step
    ? Step extends ModelStep<infer Model>
      ? (model: Model) => void
      : Step extends MessageWithStep<infer Model, any>
        ? (model: Model) => void
        : Step extends StoryStepsStep<any, infer ModelAssertion, any, any>
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
          : Step extends StoryStepsStep<any, any, infer Message, any>
            ? Message
            : never
    : never,
  Steps[number] extends infer Step
    ? Step extends OutMessageStep<infer OutMessage>
      ? OutMessage
      : Step extends StoryStepsStep<any, any, any, infer OutMessage>
        ? OutMessage
        : never
    : never
> => ({
  _tag: 'StoryStepsStep',
  steps: storySteps,
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
   *  identical responses. Resolvers carry across calls; a new entry replaces
   *  any leftovers sharing its Definition or Instance shape (latest wins). */
  resolveAll: resolveAllCommands,
  /** Resolves listed Commands and throws unless every resolver matches one
   *  dispatch and no actual Commands remain unresolved. Entries apply only to
   *  this call and never carry forward. */
  resolveAllExact: resolveAllExactCommands,
  /** Asserts that every given Command is among the pending Commands. */
  expectHas: expectHasCommandsStep,
  /** Asserts that the pending Commands match the given definitions exactly (order-independent). */
  expectExact: expectExactCommandsStep,
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

const applyStoryStep = <Model, Message, OutMessage>(
  current: StorySimulation<Model, Message, OutMessage>,
  step: StoryStep<Model, Message, OutMessage>,
): StorySimulation<Model, Message, OutMessage> => {
  if (Predicate.isTagged(step, 'ModelStep')) {
    step.assert(toInternal(current).model)
    return current
  }

  if (Predicate.isTagged(step, 'MessageStep')) {
    return applyMessage(current, step.message)
  }

  if (Predicate.isTagged(step, 'MessageWithStep')) {
    return applyMessage(current, step.toMessage(toInternal(current).model))
  }

  if (Predicate.isTagged(step, 'SubscriptionMessageStep')) {
    return applySubscriptionMessage(current, step)
  }

  if (Predicate.isTagged(step, 'OutMessageStep')) {
    assertOutMessage(current, step.expected)
    return current
  }

  if (Predicate.isTagged(step, 'StoryStepsStep')) {
    return Array.reduce(step.steps, current, applyStoryStep)
  }

  if (Predicate.isFunction(step)) {
    return step(current)
  }

  return current
}

/** Executes a test story. Throws if any Commands remain unresolved. */
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
  ): void
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
  ): void
} = <Model, Message, OutMessage = undefined>(
  updateFn: (
    model: Model,
    message: Message,
  ) => SimulationUpdateReturn<Model, OutMessage>,
  ...steps: ReadonlyArray<StoryStep<Model, Message, OutMessage>>
): void => {
  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  const seed = {
    model: undefined as unknown,
    message: undefined,
    commands: Array.empty(),
    outMessage: undefined,
    updateFn,
    resolvers: [],
  } as unknown as StorySimulation<Model, Message, OutMessage>

  const result = Array.reduce(steps, seed, applyStoryStep)
  /* eslint-enable @typescript-eslint/consistent-type-assertions */

  const internal = toInternal(result)
  assertAllCommandsResolved(internal.commands)
}
