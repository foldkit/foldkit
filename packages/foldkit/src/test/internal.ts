import { Array, Equivalence, Option, Order, pipe } from 'effect'

import type { CommandDefinition } from '../command'

/** A Command in a test simulation, identified by name. */
export type AnyCommand = Readonly<{ name: string }>

type UpdateResult<Model, OutMessage> =
  | readonly [Model, ReadonlyArray<AnyCommand>]
  | readonly [Model, ReadonlyArray<AnyCommand>, OutMessage]

/** A Command definition paired with the result Message to resolve it with. */
export type ResolverPair<
  Name extends string = string,
  ResultMessage = unknown,
> =
  | readonly [CommandDefinition<Name, ResultMessage>, ResultMessage]
  | readonly [
      CommandDefinition<Name, ResultMessage>,
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
        const outMessage = Array.isNonEmptyArray(rest)
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

  if (Array.isNonEmptyReadonlyArray(missing)) {
    const missingNames = pipe(
      missing,
      Array.map(({ name }) => `    ${name}`),
      Array.join('\n'),
    )
    const pending = Array.isNonEmptyReadonlyArray(commands)
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
    Array.sort(Order.string),
  )
  const actualNames = pipe(
    commands,
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
}

/** Throws if there are any pending Commands. */
export const assertZeroCommands = (
  commands: ReadonlyArray<AnyCommand>,
): void => {
  if (Array.isNonEmptyReadonlyArray(commands)) {
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
  if (Array.isNonEmptyReadonlyArray(commands)) {
    const names = pipe(
      commands,
      Array.map(({ name }) => `    ${name}`),
      Array.join('\n'),
    )
    throw new Error(
      `I found unresolved Commands ${context}:\n\n${names}\n\n` +
        'Resolve all Commands before sending the next Message.\n' +
        'Use resolve(Definition, ResultMessage) for each one,\n' +
        'or resolveAll(...pairs) to resolve them all at once.',
    )
  }
}

/** Throws when Commands remain at the end of a test. */
export const assertAllCommandsResolved = (
  commands: ReadonlyArray<AnyCommand>,
): void => {
  if (Array.isNonEmptyReadonlyArray(commands)) {
    const names = pipe(
      commands,
      Array.map(({ name }) => `    ${name}`),
      Array.join('\n'),
    )
    throw new Error(
      `I found Commands without resolvers:\n\n${names}\n\n` +
        'Every Command produced by update needs to be resolved.\n' +
        'Use resolve(Definition, ResultMessage) for each one,\n' +
        'or resolveAll(...pairs) to resolve them all at once.',
    )
  }
}
