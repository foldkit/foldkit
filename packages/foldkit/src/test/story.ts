import { Array, Effect, Option, Predicate, pipe } from 'effect'

import type { CommandDefinition } from '../command/index.js'
import type {
  AnyCommand,
  BaseInternal,
  CommandMatcher,
  Resolver,
  ResolverEntry,
} from './internal.js'
import {
  assertAllCommandsResolved,
  assertExactCommands,
  assertHasCommands,
  assertNoUnresolvedCommands,
  assertZeroCommands,
  resolveAllInternal,
  resolveByMatcher,
} from './internal.js'

export type { AnyCommand, CommandMatcher, Resolver }

/** A typed Command instance carrying the result Message type via its
 *  `effect` field, so passing `FetchWeather({ zipCode })` to `Story.Command.resolve`
 *  preserves the link between the Command and its declared result Message. */
type AnyCommandInstance<ResultMessage = unknown> = Readonly<{
  name: string
  args?: Record<string, unknown>
  effect: Effect.Effect<ResultMessage, any, any>
}>

/** An immutable test simulation of a Foldkit program. */
export type StorySimulation<Model, Message, OutMessage = undefined> = Readonly<{
  /** @internal Carries the Message type through the step chain. */
  _phantomMessage?: Message
  model: Model
  commands: ReadonlyArray<AnyCommand>
  outMessage: OutMessage
}>

/** A callable step that sets the initial Model. Carries phantom type for compile-time validation. */
export type WithStep<Model> = Readonly<{ _phantomModel: Model }> &
  (<M, Message, OutMessage = undefined>(
    simulation: StorySimulation<M, Message, OutMessage>,
  ) => StorySimulation<M, Message, OutMessage>)

/** A single step in a story — either a {@link WithStep} or a simulation transform. */
export type StoryStep<Model, Message, OutMessage> =
  | WithStep<NoInfer<Model>>
  | ((
      simulation: StorySimulation<Model, Message, OutMessage>,
    ) => StorySimulation<Model, Message, OutMessage>)

// INTERNAL

type UpdateResult<Model, OutMessage> =
  | readonly [Model, ReadonlyArray<AnyCommand>]
  | readonly [Model, ReadonlyArray<AnyCommand>, OutMessage]

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
    ) => UpdateResult<Model, OutMessage>
    resolvers: ReadonlyArray<ResolverEntry<Message>>
  }>

const toInternal = <Model, Message, OutMessage>(
  simulation: StorySimulation<Model, Message, OutMessage>,
): InternalStorySimulation<Model, Message, OutMessage> =>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  simulation as InternalStorySimulation<Model, Message, OutMessage>

// STEPS

/** Sets the initial Model for a test story. */
export { with_ as with }
const with_ = <Model>(model: Model): WithStep<Model> => {
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
  }) as WithStep<Model>
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
}

/** Sends a Message through update. Commands stay pending until resolve or resolveAll. */
export const message =
  <Message>(message_: NoInfer<Message>) =>
  <Model, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)

    assertNoUnresolvedCommands(internal.commands, 'when you sent a new Message')

    const result = internal.updateFn(internal.model, message_)
    const nextModel = result[0]
    const commands = result[1]
    const outMessage = result.length === 3 ? result[2] : internal.outMessage

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return {
      ...internal,
      model: nextModel,
      message: message_,
      commands: Array.appendAll(internal.commands, commands),
      outMessage,
    } as StorySimulation<Model, Message, OutMessage>
  }

/** Resolves a pending Command with the given result Message. Accepts either
 *  a Command Definition (matches by name; any pending Command of that name)
 *  or a Command instance (matches by name AND args; strict). */
const resolveCommand: {
  <Name extends string, ResultMessage>(
    definition: CommandDefinition<Name, ResultMessage>,
    resultMessage: ResultMessage,
  ): <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ) => StorySimulation<Model, Message, OutMessage>
  <Name extends string, ResultMessage, ParentMessage>(
    definition: CommandDefinition<Name, ResultMessage>,
    resultMessage: ResultMessage,
    toParentMessage: (message: ResultMessage) => ParentMessage,
  ): <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ) => StorySimulation<Model, Message, OutMessage>
  <ResultMessage>(
    instance: AnyCommandInstance<ResultMessage>,
    resultMessage: ResultMessage,
  ): <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ) => StorySimulation<Model, Message, OutMessage>
  <ResultMessage, ParentMessage>(
    instance: AnyCommandInstance<ResultMessage>,
    resultMessage: ResultMessage,
    toParentMessage: (message: ResultMessage) => ParentMessage,
  ): <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ) => StorySimulation<Model, Message, OutMessage>
} =
  <ResultMessage>(
    matcher: CommandMatcher,
    resultMessage: ResultMessage,
    toParentMessage?: (message: ResultMessage) => unknown,
  ) =>
  <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> => {
    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    const internal = toInternal(simulation)
    const messageForUpdate = (Predicate.isUndefined(toParentMessage)
      ? resultMessage
      : toParentMessage(resultMessage)) as unknown as Message
    const next = resolveByMatcher(
      internal as BaseInternal<Model, Message, unknown>,
      matcher,
      messageForUpdate,
    )

    if (Predicate.isUndefined(next)) {
      const pending = Array.isReadonlyArrayNonEmpty(internal.commands)
        ? pipe(
            internal.commands,
            Array.map(command => {
              const args = command.args
              return args === undefined
                ? `    ${command.name}`
                : `    ${command.name} ${JSON.stringify(args)}`
            }),
            Array.join('\n'),
          )
        : '    (none)'
      const matcherLabel =
        'args' in matcher && matcher.args !== undefined
          ? `${matcher.name} ${JSON.stringify(matcher.args)}`
          : matcher.name
      throw new Error(
        `I tried to resolve "${matcherLabel}" but no matching pending Command was found.\n\n` +
          `Pending Commands:\n${pending}\n\n` +
          'Make sure the previous Message produced this Command.',
      )
    }

    return next as StorySimulation<Model, Message, OutMessage>
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
  }

/** Resolves all listed Commands with their result Messages. Handles cascading resolution. */
const resolveAllCommands =
  <R extends ReadonlyArray<unknown>>(
    ...resolvers: { [K in keyof R]: Resolver<R[K]> }
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

/** Runs an assertion function against the current Model. */
export const model =
  <Model, Message, OutMessage = undefined>(f: (model: Model) => void) =>
  (
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> => {
    f(toInternal(simulation).model)
    return simulation
  }

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
  /** Resolves all listed Commands with their result Messages. Handles cascading resolution. */
  resolveAll: resolveAllCommands,
  /** Asserts that every given Command is among the pending Commands. */
  expectHas: expectHasCommandsStep,
  /** Asserts that the pending Commands match the given definitions exactly (order-independent). */
  expectExact: expectExactCommandsStep,
  /** Asserts that there are no pending Commands. */
  expectNone: expectNoCommandsStep,
} as const

/** Asserts that the OutMessage is Some with the expected value. */
export const expectOutMessage =
  <OutMessage>(expected: OutMessage) =>
  <Model, Message>(
    simulation: StorySimulation<Model, Message, Option.Option<OutMessage>>,
  ): StorySimulation<Model, Message, Option.Option<OutMessage>> => {
    const internal = toInternal(simulation)
    const outMessage = internal.outMessage

    if (
      !Option.isOption(outMessage) ||
      Option.isNone(outMessage) ||
      JSON.stringify(outMessage.value) !== JSON.stringify(expected)
    ) {
      throw new Error(
        `Expected OutMessage:\n\n    Some(${JSON.stringify(expected)})\n\nBut got:\n\n    ${JSON.stringify(outMessage)}`,
      )
    }

    return simulation
  }

/** Asserts that the OutMessage is None. */
export const expectNoOutMessage =
  () =>
  <Model, Message, OutMessage>(
    simulation: StorySimulation<Model, Message, Option.Option<OutMessage>>,
  ): StorySimulation<Model, Message, Option.Option<OutMessage>> => {
    const internal = toInternal(simulation)
    const outMessage = internal.outMessage

    if (
      !Predicate.isUndefined(outMessage) &&
      !(Option.isOption(outMessage) && Option.isNone(outMessage))
    ) {
      throw new Error(
        `Expected no OutMessage but got:\n\n    ${JSON.stringify(outMessage)}`,
      )
    }

    return simulation
  }

// STORY

/** Executes a test story. Throws if any Commands remain unresolved. */
export const story: {
  <Model, Message, OutMessage>(
    updateFn: (
      model: Model,
      message: Message,
    ) => readonly [Model, ReadonlyArray<AnyCommand>, OutMessage],
    ...steps: ReadonlyArray<StoryStep<Model, Message, OutMessage>>
  ): void
  <Model, Message>(
    updateFn: (
      model: Model,
      message: Message,
    ) => readonly [Model, ReadonlyArray<AnyCommand>],
    ...steps: ReadonlyArray<StoryStep<Model, Message, undefined>>
  ): void
} = <Model, Message, OutMessage = undefined>(
  updateFn: (model: Model, message: Message) => UpdateResult<Model, OutMessage>,
  ...steps: ReadonlyArray<StoryStep<Model, Message, OutMessage>>
): void => {
  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  const seed = {
    model: undefined as unknown,
    message: undefined,
    commands: [],
    outMessage: undefined as unknown,
    updateFn,
    resolvers: [],
  } as unknown as StorySimulation<Model, Message, OutMessage>

  const result = steps.reduce(
    (current, step) =>
      (
        step as (
          simulation: StorySimulation<Model, Message, OutMessage>,
        ) => StorySimulation<Model, Message, OutMessage>
      )(current),
    seed,
  )
  /* eslint-enable @typescript-eslint/consistent-type-assertions */

  const internal = toInternal(result)
  assertAllCommandsResolved(internal.commands)
}
