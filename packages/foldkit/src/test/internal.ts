import { Array, Equivalence, Option, Order, Predicate, pipe } from 'effect'

import type { CommandDefinition } from '../command/index.js'

/** A Command in a test simulation, identified by name. */
export type AnyCommand = Readonly<{ name: string }>

type UpdateResult<Model, OutMessage> =
  | readonly [Model, ReadonlyArray<AnyCommand>]
  | readonly [Model, ReadonlyArray<AnyCommand>, OutMessage]

/** A Command definition with the result Message to resolve it with. */
export type Resolver<ResultMessage = unknown> =
  | readonly [CommandDefinition<string, ResultMessage>, ResultMessage]
  | readonly [
      CommandDefinition<string, ResultMessage>,
      ResultMessage,
      (message: ResultMessage) => unknown,
    ]

/** Base shape of an internal simulation — shared between Story and Scene. */
export type BaseInternal<Model, Message, OutMessage = undefined> = Readonly<{
  model: Model
  message: Message | undefined
  commands: ReadonlyArray<AnyCommand>
  outMessage: OutMessage
  updateFn: (model: Model, message: Message) => UpdateResult<Model, OutMessage>
  resolvers: Record<string, Message>
}>

/** Resolves a single command by name and feeds its result through update. */
export const resolveByName = <Model, Message>(
  internal: BaseInternal<Model, Message, unknown>,
  commandName: string,
  resolverMessage: Message,
): BaseInternal<Model, Message, unknown> | undefined =>
  pipe(
    internal.commands,
    Array.findFirstIndex(({ name }) => name === commandName),
    Option.match({
      onNone: () => undefined,
      onSome: commandIndex => {
        const remainingCommands = Array.remove(internal.commands, commandIndex)
        const [nextModel, newCommands, ...rest] = internal.updateFn(
          internal.model,
          resolverMessage,
        )
        const outMessage = Array.isArrayNonEmpty(rest)
          ? rest[0]
          : internal.outMessage

        return {
          ...internal,
          model: nextModel,
          message: resolverMessage,
          commands: Array.appendAll(remainingCommands, newCommands),
          outMessage,
        }
      },
    }),
  )

const MAX_CASCADE_DEPTH = 100

/** Resolves all listed Commands, cascading through any Commands produced by the result. */
export const resolveAllInternal = <Model, Message, OutMessage>(
  internal: BaseInternal<Model, Message, OutMessage>,
  resolvers: ReadonlyArray<Resolver>,
): BaseInternal<Model, Message, OutMessage> => {
  const resolverMap: Record<string, Message> = {}
  for (const resolver of resolvers) {
    const [definition, resultMessage] = resolver
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    resolverMap[definition.name] = (
      resolver.length === 3 ? resolver[2](resultMessage) : resultMessage
    ) as Message
  }

  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  let current = {
    ...internal,
    resolvers: { ...internal.resolvers, ...resolverMap },
  } as BaseInternal<Model, Message, unknown>

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

    current = next

    if (depth === MAX_CASCADE_DEPTH - 1) {
      throw new Error(
        'resolveAll hit the maximum cascade depth (100). ' +
          'This usually means Commands are producing Commands in an infinite cycle.',
      )
    }
  }

  return current as BaseInternal<Model, Message, OutMessage>
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
}

/** Throws if any of the given definitions are missing from the pending Commands. */
export const assertHasCommands = (
  commands: ReadonlyArray<AnyCommand>,
  definitions: ReadonlyArray<CommandDefinition<string, unknown>>,
): void => {
  const pendingNames = Array.map(commands, ({ name }) => name)
  const missing = Array.filter(
    definitions,
    ({ name }) => !Array.contains(pendingNames, name),
  )

  if (Array.isArrayNonEmpty(missing)) {
    const missingNames = pipe(
      missing,
      Array.map(({ name }) => `    ${name}`),
      Array.join('\n'),
    )
    const pending = Array.isArrayNonEmpty(commands)
      ? pipe(
          commands,
          Array.map(({ name }) => `    ${name}`),
          Array.join('\n'),
        )
      : '    (none)'
    throw new Error(
      `Expected to find Commands:\n\n${missingNames}\n\nBut the pending Commands are:\n\n${pending}`,
    )
  }
}

/** Throws if the pending Commands don't match the given definitions exactly (order-independent). */
export const assertExactCommands = (
  commands: ReadonlyArray<AnyCommand>,
  definitions: ReadonlyArray<CommandDefinition<string, unknown>>,
): void => {
  const expectedNames = pipe(
    definitions,
    Array.map(({ name }) => name),
    Array.sort(Order.String),
  )
  const actualNames = pipe(
    commands,
    Array.map(({ name }) => name),
    Array.sort(Order.String),
  )

  if (!Array.makeEquivalence(Equivalence.String)(expectedNames, actualNames)) {
    const expected = pipe(
      expectedNames,
      Array.map(name => `    ${name}`),
      Array.join('\n'),
    )
    const actual = Array.isArrayNonEmpty(actualNames)
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
}

/** Throws if there are any pending Commands. */
export const assertZeroCommands = (
  commands: ReadonlyArray<AnyCommand>,
): void => {
  if (Array.isArrayNonEmpty(commands)) {
    const pending = pipe(
      commands,
      Array.map(({ name }) => `    ${name}`),
      Array.join('\n'),
    )
    throw new Error(`Expected no Commands but found:\n\n${pending}`)
  }
}

/** Throws when trying to send a message with unresolved Commands. */
export const assertNoUnresolvedCommands = (
  commands: ReadonlyArray<AnyCommand>,
  context: string,
): void => {
  if (Array.isArrayNonEmpty(commands)) {
    const names = pipe(
      commands,
      Array.map(({ name }) => `    ${name}`),
      Array.join('\n'),
    )
    throw new Error(
      `I found unresolved Commands ${context}:\n\n${names}\n\n` +
        'Resolve all Commands before sending the next Message.\n' +
        'Use resolve(Definition, ResultMessage) for each one,\n' +
        'or resolveAll(...resolvers) to resolve them all at once.',
    )
  }
}

/** Throws when Commands remain at the end of a test. */
export const assertAllCommandsResolved = (
  commands: ReadonlyArray<AnyCommand>,
): void => {
  if (Array.isArrayNonEmpty(commands)) {
    const names = pipe(
      commands,
      Array.map(({ name }) => `    ${name}`),
      Array.join('\n'),
    )
    throw new Error(
      `I found Commands without resolvers:\n\n${names}\n\n` +
        'Every Command produced by update needs to be resolved.\n' +
        'Use resolve(Definition, ResultMessage) for each one,\n' +
        'or resolveAll(...resolvers) to resolve them all at once.',
    )
  }
}
