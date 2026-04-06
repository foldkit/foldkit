import { Array, Equivalence, Option, Order, Predicate, pipe } from 'effect'

import type { CommandDefinition } from '../command'
import type { AnyCommand, BaseInternal, ResolverPair } from './internal'
import {
  assertAllCommandsResolved,
  assertNoUnresolvedCommands,
  resolveByName,
} from './internal'

export type { AnyCommand, ResolverPair }

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
    resolvers: Record<string, Message>
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

/** Resolves a specific pending Command with the given result Message. */
export const resolve: {
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
} =
  <Name extends string, ResultMessage>(
    definition: CommandDefinition<Name, ResultMessage>,
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
    const next = resolveByName(
      internal as BaseInternal<Model, Message, unknown>,
      definition.name,
      messageForUpdate,
    )

    if (Predicate.isUndefined(next)) {
      const pending = Array.isNonEmptyReadonlyArray(internal.commands)
        ? pipe(
            internal.commands,
            Array.map(({ name }) => `    ${name}`),
            Array.join('\n'),
          )
        : '    (none)'
      throw new Error(
        `I tried to resolve "${definition.name}" but it wasn't in the pending Commands.\n\n` +
          `Pending Commands:\n${pending}\n\n` +
          'Make sure the previous Message produced this Command.',
      )
    }

    return next as StorySimulation<Model, Message, OutMessage>
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
  }

/** Resolves all listed Commands with their result Messages. Handles cascading resolution. */
export const resolveAll =
  (pairs: ReadonlyArray<ResolverPair>) =>
  <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)
    const resolvers: Record<string, Message> = {}
    for (const [definition, resultMessage] of pairs) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      resolvers[definition.name] = resultMessage as Message
    }

    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    let current = {
      ...internal,
      resolvers: { ...internal.resolvers, ...resolvers },
    } as BaseInternal<Model, Message, OutMessage>

    const MAX_CASCADE_DEPTH = 100

    for (let depth = 0; depth < MAX_CASCADE_DEPTH; depth++) {
      const resolvable = current.commands.find(
        ({ name }) => name in current.resolvers,
      )

      if (Predicate.isUndefined(resolvable)) {
        break
      }

      const next = resolveByName(
        current,
        resolvable.name,
        current.resolvers[resolvable.name]!,
      )

      if (Predicate.isUndefined(next)) {
        break
      }

      current = next as BaseInternal<Model, Message, OutMessage>

      if (depth === MAX_CASCADE_DEPTH - 1) {
        throw new Error(
          'resolveAll hit the maximum cascade depth (100). ' +
            'This usually means Commands are producing Commands in an infinite cycle.',
        )
      }
    }

    return current as StorySimulation<Model, Message, OutMessage>
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
  }

/** Runs an assertion function against the current Model. */
export const model =
  <Model, Message, OutMessage = undefined>(f: (model: Model) => void) =>
  (
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> => {
    f(toInternal(simulation).model)
    return simulation
  }

/** Asserts that every given Command is among the pending Commands. */
export const expectHasCommands =
  (...definitions: ReadonlyArray<CommandDefinition<string, unknown>>) =>
  <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)
    const pendingNames = Array.map(internal.commands, ({ name }) => name)
    const missing = Array.filter(
      definitions,
      ({ name }) => !Array.contains(pendingNames, name),
    )

    if (Array.isNonEmptyReadonlyArray(missing)) {
      const missingNames = pipe(
        missing,
        Array.map(({ name }) => `    ${name}`),
        Array.join('\n'),
      )
      const pending = Array.isNonEmptyReadonlyArray(internal.commands)
        ? pipe(
            internal.commands,
            Array.map(({ name }) => `    ${name}`),
            Array.join('\n'),
          )
        : '    (none)'
      throw new Error(
        `Expected to find Commands:\n\n${missingNames}\n\nBut the pending Commands are:\n\n${pending}`,
      )
    }

    return simulation
  }

/** Asserts that the pending Commands match the given definitions exactly (order-independent). */
export const expectExactCommands =
  (...definitions: ReadonlyArray<CommandDefinition<string, unknown>>) =>
  <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)
    const expectedNames = pipe(
      definitions,
      Array.map(({ name }) => name),
      Array.sort(Order.string),
    )
    const actualNames = pipe(
      internal.commands,
      Array.map(({ name }) => name),
      Array.sort(Order.string),
    )

    if (!Array.getEquivalence(Equivalence.string)(expectedNames, actualNames)) {
      const expected = pipe(
        expectedNames,
        Array.map(name => `    ${name}`),
        Array.join('\n'),
      )
      const actual = Array.isNonEmptyReadonlyArray(actualNames)
        ? pipe(
            actualNames,
            Array.map(name => `    ${name}`),
            Array.join('\n'),
          )
        : '    (none)'
      throw new Error(
        `Expected exactly these Commands:\n\n${expected}\n\nBut found:\n\n${actual}`,
      )
    }

    return simulation
  }

/** Asserts that there are no pending Commands. */
export const expectNoCommands =
  () =>
  <Model, Message, OutMessage = undefined>(
    simulation: StorySimulation<Model, Message, OutMessage>,
  ): StorySimulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)

    if (Array.isNonEmptyReadonlyArray(internal.commands)) {
      const pending = pipe(
        internal.commands,
        Array.map(({ name }) => `    ${name}`),
        Array.join('\n'),
      )
      throw new Error(`Expected no Commands but found:\n\n${pending}`)
    }

    return simulation
  }

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
    resolvers: {},
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
