import { Array, Equivalence, Option, Order, Predicate, pipe } from 'effect'

import type { CommandDefinition } from '../command/index.js'
import type { MountDefinition } from '../mount/index.js'

/** A Command in a test simulation, identified by name. */
export type AnyCommand = Readonly<{ name: string }>

/** A pending Mount in a Scene simulation. Identified by `name` and an
 *  `occurrence` index that disambiguates same-named mounts in the rendered
 *  tree (e.g. two open popovers each contributing a `PopoverAnchor`). The
 *  occurrence is the 0-based position among same-named markers in
 *  tree-traversal order. */
export type PendingMount = Readonly<{
  name: string
  occurrence: number
}>

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

/** A Mount definition with the result Message to resolve it with. Mirrors
 *  `Resolver` for Commands. The optional third element lifts a child Mount
 *  result into the parent's Message universe (mirrors `Mount.mapMessage`). */
export type MountResolver<ResultMessage = unknown> =
  | readonly [MountDefinition<string, ResultMessage>, ResultMessage]
  | readonly [
      MountDefinition<string, ResultMessage>,
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
        const outMessage = Array.isReadonlyArrayNonEmpty(rest)
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

  if (Array.isReadonlyArrayNonEmpty(missing)) {
    const missingNames = pipe(
      missing,
      Array.map(({ name }) => `    ${name}`),
      Array.join('\n'),
    )
    const pending = Array.isReadonlyArrayNonEmpty(commands)
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
    const actual = Array.isReadonlyArrayNonEmpty(actualNames)
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
  if (Array.isReadonlyArrayNonEmpty(commands)) {
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
  if (Array.isReadonlyArrayNonEmpty(commands)) {
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
  if (Array.isReadonlyArrayNonEmpty(commands)) {
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

const formatMountList = (mounts: ReadonlyArray<PendingMount>): string =>
  Array.match(mounts, {
    onEmpty: () => '    (none)',
    onNonEmpty: nonEmpty =>
      pipe(
        nonEmpty,
        Array.map(({ name, occurrence }) =>
          occurrence === 0 ? `    ${name}` : `    ${name} (#${occurrence + 1})`,
        ),
        Array.join('\n'),
      ),
  })

/** Resolves the first pending Mount with the given name by feeding `message`
 *  through update. Returns the updated internal simulation, or `undefined`
 *  when no pending mount with that name exists. */
export const resolveMountByName = <Model, Message>(
  internal: BaseInternal<Model, Message, unknown>,
  pendingMounts: ReadonlyArray<PendingMount>,
  mountName: string,
  resolverMessage: Message,
):
  | Readonly<{
      internal: BaseInternal<Model, Message, unknown>
      pendingMounts: ReadonlyArray<PendingMount>
    }>
  | undefined =>
  pipe(
    pendingMounts,
    Array.findFirstIndex(({ name }) => name === mountName),
    Option.match({
      onNone: () => undefined,
      onSome: index => {
        const remaining = Array.remove(pendingMounts, index)
        const [nextModel, newCommands, ...rest] = internal.updateFn(
          internal.model,
          resolverMessage,
        )
        const outMessage = Array.match(rest, {
          onEmpty: () => internal.outMessage,
          onNonEmpty: ([first]) => first,
        })
        return {
          internal: {
            ...internal,
            model: nextModel,
            message: resolverMessage,
            commands: Array.appendAll(internal.commands, newCommands),
            outMessage,
          },
          pendingMounts: remaining,
        }
      },
    }),
  )

/** Throws if any of the given mount definitions are missing from the pending
 *  mount list. */
export const assertHasMounts = (
  pendingMounts: ReadonlyArray<PendingMount>,
  definitions: ReadonlyArray<MountDefinition<string, unknown>>,
): void => {
  const pendingNames = Array.map(pendingMounts, ({ name }) => name)
  const missing = Array.filter(
    definitions,
    ({ name }) => !Array.contains(pendingNames, name),
  )

  if (Array.isReadonlyArrayNonEmpty(missing)) {
    const missingNames = pipe(
      missing,
      Array.map(({ name }) => `    ${name}`),
      Array.join('\n'),
    )
    throw new Error(
      `Expected to find Mounts:\n\n${missingNames}\n\n` +
        `But the pending Mounts are:\n\n${formatMountList(pendingMounts)}`,
    )
  }
}

/** Throws if the pending Mounts don't match the given definitions exactly
 *  (order-independent, by name). */
export const assertExactMounts = (
  pendingMounts: ReadonlyArray<PendingMount>,
  definitions: ReadonlyArray<MountDefinition<string, unknown>>,
): void => {
  const expectedNames = pipe(
    definitions,
    Array.map(({ name }) => name),
    Array.sort(Order.String),
  )
  const actualNames = pipe(
    pendingMounts,
    Array.map(({ name }) => name),
    Array.sort(Order.String),
  )

  if (!Array.makeEquivalence(Equivalence.String)(expectedNames, actualNames)) {
    const expected = pipe(
      expectedNames,
      Array.map(name => `    ${name}`),
      Array.join('\n'),
    )
    throw new Error(
      `Expected exactly these Mounts:\n\n${expected}\n\n` +
        `But found:\n\n${formatMountList(pendingMounts)}`,
    )
  }
}

/** Throws if there are any pending Mounts. */
export const assertZeroMounts = (
  pendingMounts: ReadonlyArray<PendingMount>,
): void => {
  if (Array.isReadonlyArrayNonEmpty(pendingMounts)) {
    throw new Error(
      `Expected no Mounts but found:\n\n${formatMountList(pendingMounts)}`,
    )
  }
}

/** Throws when trying to send a Message with unresolved Mounts in the
 *  rendered view. */
export const assertNoUnresolvedMounts = (
  pendingMounts: ReadonlyArray<PendingMount>,
  context: string,
): void => {
  if (Array.isReadonlyArrayNonEmpty(pendingMounts)) {
    throw new Error(
      `I found unresolved Mounts ${context}:\n\n${formatMountList(pendingMounts)}\n\n` +
        'Resolve all Mounts before sending the next Message.\n' +
        'Use resolveMount(Definition, ResultMessage) for each one,\n' +
        'or resolveAllMounts(...resolvers) to resolve them all at once.',
    )
  }
}

/** Throws when Mounts remain at the end of a test. */
export const assertAllMountsResolved = (
  pendingMounts: ReadonlyArray<PendingMount>,
): void => {
  if (Array.isReadonlyArrayNonEmpty(pendingMounts)) {
    throw new Error(
      `I found Mounts without resolvers:\n\n${formatMountList(pendingMounts)}\n\n` +
        'Every OnMount in the rendered view needs to be resolved.\n' +
        'Use resolveMount(Definition, ResultMessage) for each one,\n' +
        'or resolveAllMounts(...resolvers) to resolve them all at once.',
    )
  }
}
