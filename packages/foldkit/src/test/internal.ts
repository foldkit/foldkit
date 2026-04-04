import { Array, Option, pipe } from 'effect'

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
> = readonly [CommandDefinition<Name, ResultMessage>, ResultMessage]

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
        'or resolveAll([...pairs]) to resolve them all at once.',
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
        'or resolveAll([...pairs]) to resolve them all at once.',
    )
  }
}
