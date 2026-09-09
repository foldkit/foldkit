import { Array, Equal, Predicate, pipe } from 'effect'

import type {
  AnyCommand,
  AnyCommandInstance,
  CommandMatcher,
  ResolvableCommandDefinition,
  ResolvableCommandMatcher,
  Resolver,
  ResolverEntry,
  SimulationUpdateReturn,
} from './internal.js'
import {
  assertAllCommandsResolved,
  assertExactCommands,
  assertHasCommands,
  assertNoUnresolvedCommands,
  assertResolveUnambiguous,
  assertZeroCommands,
  formatCommand,
  formatMatcher,
  resolveAllExactInternal,
  resolveAllInternal,
  resolveByMatcher,
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

/** A single step in a story: a {@link GivenStep}, {@link ModelStep},
 *  {@link MessageStep}, {@link OutMessageStep}, {@link StoryStepsStep}, or
 *  simulation transform. */
export type StoryStep<Model, Message = unknown, OutMessage = unknown> =
  | GivenStep<NoInfer<Model>>
  | ModelStep<NoInfer<Model>>
  | MessageStep<NoInfer<Message>>
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

  assertNoUnresolvedCommands(internal.commands, 'when you sent a new Message')

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

/** Resolves a pending Command with the given result Message. Accepts either
 *  a Command Definition (matches by name; any pending Command of that name)
 *  or a Command instance (matches by name AND args; strict). */
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
      : Step extends StoryStepsStep<any, infer ModelAssertion, any, any>
        ? ModelAssertion
        : never
    : never,
  Steps[number] extends infer Step
    ? Step extends MessageStep<infer Message>
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

/** Asserts that every given matcher matches a pending Command. Definition
 *  matchers match by name only; Instance matchers match by name + args. */
const expectHasCommandsStep =
  (...matchers: ReadonlyArray<CommandMatcher>) =>
  <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> => {
    assertHasCommands(toInternal(simulation).commands, matchers)
    return simulation
  }

/** Asserts that the pending Commands match the given matchers exactly
 *  (order-independent). Definition matchers compare by name; Instance
 *  matchers compare by name + args. Each matcher must consume exactly one
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

/** Steps that operate on the pending Commands of a story simulation.
 *  Destructure as `const { Command } = Story` for concise call sites. */
export const Command = {
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
      commands?: ReadonlyArray<AnyCommand>
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
      commands?: ReadonlyArray<AnyCommand>
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
