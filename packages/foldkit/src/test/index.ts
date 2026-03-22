import { Array, Predicate, pipe } from 'effect'

import type { CommandDefinition } from '../command'

/** A Command in a test simulation, identified by name. */
export type AnyCommand = Readonly<{ name: string }>

/** An immutable test simulation of a Foldkit program. */
export type Simulation<Model, Message, OutMessage = undefined> = Readonly<{
  model: Model
  message: Message | undefined
  commands: ReadonlyArray<AnyCommand>
  outMessage: OutMessage
}>

/** A callable step that sets the initial Model. Carries phantom type for compile-time validation. */
export type WithStep<Model> = Readonly<{ _phantomModel: Model }> &
  (<M, Message, OutMessage = undefined>(
    simulation: Simulation<M, Message, OutMessage>,
  ) => Simulation<M, Message, OutMessage>)

type UpdateResult<Model, OutMessage> =
  | readonly [Model, ReadonlyArray<AnyCommand>]
  | readonly [Model, ReadonlyArray<AnyCommand>, OutMessage]

type InternalSimulation<Model, Message, OutMessage = undefined> = Simulation<
  Model,
  Message,
  OutMessage
> &
  Readonly<{
    updateFn: (
      model: Model,
      message: Message,
    ) => UpdateResult<Model, OutMessage>
    resolvers: Record<string, Message>
  }>

const toInternal = <Model, Message, OutMessage>(
  simulation: Simulation<Model, Message, OutMessage>,
): InternalSimulation<Model, Message, OutMessage> =>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  simulation as InternalSimulation<Model, Message, OutMessage>

const resolveByName = <Model, Message>(
  internal: InternalSimulation<Model, Message, unknown>,
  commandName: string,
  resolverMessage: Message,
): InternalSimulation<Model, Message, unknown> | undefined => {
  const commandIndex = internal.commands.findIndex(
    ({ name }) => name === commandName,
  )

  if (commandIndex === -1) {
    return undefined
  }

  const remainingCommands = Array.remove(internal.commands, commandIndex)
  const result = internal.updateFn(internal.model, resolverMessage)
  const nextModel = result[0]
  const newCommands = result[1]
  const outMessage = result.length === 3 ? result[2] : internal.outMessage

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    ...internal,
    model: nextModel,
    message: resolverMessage,
    commands: Array.appendAll(remainingCommands, newCommands),
    outMessage,
  } as InternalSimulation<Model, Message, unknown>
}

/** Sets the initial Model for a test story. */
export { with_ as with }
const with_ = <Model>(model: Model): WithStep<Model> => {
  const step = <M, Message, OutMessage = undefined>(
    simulation: Simulation<M, Message, OutMessage>,
  ): Simulation<M, Message, OutMessage> => {
    const internal = toInternal(simulation)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return { ...internal, model } as unknown as Simulation<
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
    simulation: Simulation<Model, Message, OutMessage>,
  ): Simulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)

    if (Array.isNonEmptyReadonlyArray(internal.commands)) {
      const names = pipe(
        internal.commands,
        Array.map(({ name }) => `    ${name}`),
        Array.join('\n'),
      )
      throw new Error(
        `I found unresolved Commands when you sent a new Message:\n\n${names}\n\n` +
          'Resolve all Commands before sending the next Message.\n' +
          'Use Test.resolve(Definition, ResultMessage) for each one,\n' +
          'or Test.resolveAll([...pairs]) to resolve them all at once.',
      )
    }

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
    } as Simulation<Model, Message, OutMessage>
  }

/** Resolves a specific pending Command with the given result Message. */
export const resolve: {
  <Name extends string, ResultMessage>(
    definition: CommandDefinition<Name, ResultMessage>,
    resultMessage: ResultMessage,
  ): <Model, Message, OutMessage = undefined>(
    simulation: Simulation<Model, Message, OutMessage>,
  ) => Simulation<Model, Message, OutMessage>
  <Name extends string, ResultMessage, ParentMessage>(
    definition: CommandDefinition<Name, ResultMessage>,
    resultMessage: ResultMessage,
    toParentMessage: (message: ResultMessage) => ParentMessage,
  ): <Model, Message, OutMessage = undefined>(
    simulation: Simulation<Model, Message, OutMessage>,
  ) => Simulation<Model, Message, OutMessage>
} =
  <Name extends string, ResultMessage>(
    definition: CommandDefinition<Name, ResultMessage>,
    resultMessage: ResultMessage,
    toParentMessage?: (message: ResultMessage) => unknown,
  ) =>
  <Model, Message, OutMessage = undefined>(
    simulation: Simulation<Model, Message, OutMessage>,
  ): Simulation<Model, Message, OutMessage> => {
    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    const internal = toInternal(simulation)
    const messageForUpdate = (Predicate.isUndefined(toParentMessage)
      ? resultMessage
      : toParentMessage(resultMessage)) as unknown as Message
    const next = resolveByName(internal, definition.name, messageForUpdate)

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

    return next as Simulation<Model, Message, OutMessage>
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
  }

/** A Command definition paired with the result Message to resolve it with. */
export type ResolverPair<
  Name extends string = string,
  ResultMessage = unknown,
> = readonly [CommandDefinition<Name, ResultMessage>, ResultMessage]

/** Resolves all listed Commands with their result Messages. Handles cascading resolution. */
export const resolveAll =
  (pairs: ReadonlyArray<ResolverPair>) =>
  <Model, Message, OutMessage = undefined>(
    simulation: Simulation<Model, Message, OutMessage>,
  ): Simulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)
    const resolvers: Record<string, Message> = {}
    for (const [definition, resultMessage] of pairs) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      resolvers[definition.name] = resultMessage as Message
    }

    let current: InternalSimulation<Model, Message, OutMessage> = {
      ...internal,
      resolvers: { ...internal.resolvers, ...resolvers },
    }

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

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      current = next as InternalSimulation<Model, Message, OutMessage>

      if (depth === MAX_CASCADE_DEPTH - 1) {
        throw new Error(
          'resolveAll hit the maximum cascade depth (100). ' +
            'This usually means Commands are producing Commands in an infinite cycle.',
        )
      }
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return current as Simulation<Model, Message, OutMessage>
  }

/** Runs a function for side effects (e.g. assertions) without breaking the pipe chain. */
export const tap =
  <Model, Message, OutMessage = undefined>(
    f: (simulation: Simulation<Model, Message, OutMessage>) => void,
  ) =>
  (
    simulation: Simulation<Model, Message, OutMessage>,
  ): Simulation<Model, Message, OutMessage> => {
    f(simulation)
    return simulation
  }

/** A single step in a test story — either a {@link WithStep} or a simulation transform. */
export type StoryStep<Model, Message, OutMessage> =
  | WithStep<NoInfer<Model>>
  | ((
      simulation: Simulation<Model, Message, OutMessage>,
    ) => Simulation<Model, Message, OutMessage>)

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
  } as unknown as Simulation<Model, Message, OutMessage>

  const result = steps.reduce(
    (current, step) =>
      (
        step as (
          simulation: Simulation<Model, Message, OutMessage>,
        ) => Simulation<Model, Message, OutMessage>
      )(current),
    seed,
  )
  /* eslint-enable @typescript-eslint/consistent-type-assertions */

  const internal = toInternal(result)

  if (Array.isNonEmptyReadonlyArray(internal.commands)) {
    const names = pipe(
      internal.commands,
      Array.map(({ name }) => `    ${name}`),
      Array.join('\n'),
    )
    throw new Error(
      `I found Commands without resolvers:\n\n${names}\n\n` +
        'Every Command produced by update needs to be resolved.\n' +
        'Use Test.resolve(Definition, ResultMessage) for each one,\n' +
        'or Test.resolveAll([...pairs]) to resolve them all at once.',
    )
  }
}
