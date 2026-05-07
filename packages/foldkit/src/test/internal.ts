import { Array, Equivalence, Option, Order, Predicate, pipe } from 'effect'

import {
  type CommandDefinition,
  CommandDefinitionTypeId,
} from '../command/index.js'
import type { MountDefinition } from '../mount/index.js'

/** A Command in a test simulation. Carries `name` and optionally the `args`
 *  the runtime captured at construction. Instance matchers (Command values
 *  produced by calling a Definition) are matched against this shape; the
 *  `effect` field on a real Command is irrelevant for matching, so we only
 *  retain `name + args`. */
export type AnyCommand = Readonly<{
  name: string
  args?: Record<string, unknown>
}>

/** Pattern for matching a Command in test assertions. A Definition matches
 *  by name only ("a Command with this identity was dispatched"); an Instance
 *  matches by name AND structural-equal args ("a Command with this identity
 *  AND these args was dispatched"). Choose the form per assertion based on
 *  whether the test cares about the args value.
 *
 *  Two modes only: name-only or name + full args. Partial-args matching is
 *  intentionally unsupported. If a subset of args carries the meaning the
 *  test is verifying, the right assertion is usually against the Model that
 *  the Command's result fed through update, not a partial Command shape. */
export type CommandMatcher = CommandDefinition<string, unknown> | AnyCommand

const isCommandDefinitionMatcher = (
  matcher: CommandMatcher,
): matcher is CommandDefinition<string, unknown> =>
  Predicate.hasProperty(matcher, CommandDefinitionTypeId)

/** Structural deep-equal for Command args. Args are constrained to
 *  Schema-typed values (Record<string, unknown>), so primitives, arrays,
 *  nested records, and Date values are the value space. Date instances
 *  compare by timestamp because Schema's `S.Date` decodes ISO strings to
 *  Date objects with no enumerable keys, which would otherwise compare equal
 *  for any two distinct timestamps. */
const argsEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true
  }
  if (!Predicate.isObjectOrArray(a) || !Predicate.isObjectOrArray(b)) {
    return false
  }
  if (a instanceof Date) {
    return b instanceof Date && a.getTime() === b.getTime()
  }
  if (b instanceof Date) {
    return false
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) {
      return false
    }
    return a.every((item, index) => argsEqual(item, b[index]))
  }
  if (Array.isArray(b)) {
    return false
  }
  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  const aRecord = a as Record<string, unknown>
  const bRecord = b as Record<string, unknown>
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
  const aKeys = Object.keys(aRecord)
  const bKeys = Object.keys(bRecord)
  if (aKeys.length !== bKeys.length) {
    return false
  }
  return aKeys.every(
    key => key in bRecord && argsEqual(aRecord[key], bRecord[key]),
  )
}

/** Whether a `matcher` matches a pending Command. Definition matchers match
 *  by name. Instance matchers (with declared args) match by name + structural
 *  args equality; instance matchers without args match by name. */
const commandMatches = (
  matcher: CommandMatcher,
  command: AnyCommand,
): boolean =>
  matcher.name === command.name &&
  (isCommandDefinitionMatcher(matcher) ||
    matcher.args === undefined ||
    argsEqual(matcher.args, command.args))

const formatArgs = (args: Record<string, unknown> | undefined): string =>
  args === undefined ? '' : ` ${JSON.stringify(args)}`

/** Formats a Command matcher for display in error messages. Definition
 *  matchers render as just the name; Instance matchers append the args. */
export const formatMatcher = (matcher: CommandMatcher): string =>
  isCommandDefinitionMatcher(matcher)
    ? matcher.name
    : `${matcher.name}${formatArgs(matcher.args)}`

/** Formats a pending Command for display in error messages. Same shape as
 *  `formatMatcher` so failure messages diff visually at a glance. */
export const formatCommand = (command: AnyCommand): string =>
  `${command.name}${formatArgs(command.args)}`

/** A pending Mount in a Scene simulation. Identified by `name` and an
 *  `occurrence` index that disambiguates same-named mounts in the rendered
 *  tree (e.g. two open popovers each contributing an `AnchorPopover`). The
 *  occurrence is the 0-based position among same-named markers in
 *  tree-traversal order. */
export type PendingMount = Readonly<{
  name: string
  occurrence: number
}>

type UpdateResult<Model, OutMessage> =
  | readonly [Model, ReadonlyArray<AnyCommand>]
  | readonly [Model, ReadonlyArray<AnyCommand>, OutMessage]

/** A Command matcher (Definition or Instance) with the result Message to
 *  resolve a pending Command with. Definition matchers resolve by name; an
 *  Instance matcher resolves only the pending Command whose name AND args
 *  match. */
export type Resolver<ResultMessage = unknown> =
  | readonly [CommandMatcher, ResultMessage]
  | readonly [
      CommandMatcher,
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

/** A resolver entry pairs a Command matcher with the Message that should be
 *  fed back through update when a pending Command matches. Stored as a list
 *  (not a name-keyed map) so Instance matchers with the same name but
 *  different args can coexist. */
export type ResolverEntry<Message> = Readonly<{
  matcher: CommandMatcher
  message: Message
}>

/** Base shape of an internal simulation — shared between Story and Scene. */
export type BaseInternal<Model, Message, OutMessage = undefined> = Readonly<{
  model: Model
  message: Message | undefined
  commands: ReadonlyArray<AnyCommand>
  outMessage: OutMessage
  updateFn: (model: Model, message: Message) => UpdateResult<Model, OutMessage>
  resolvers: ReadonlyArray<ResolverEntry<Message>>
}>

/** Resolves the first pending Command that matches the given matcher and
 *  feeds its result through update. Returns `undefined` when no pending
 *  Command matches. Definition matchers match by name; Instance matchers
 *  match by name + args. */
export const resolveByMatcher = <Model, Message>(
  internal: BaseInternal<Model, Message, unknown>,
  matcher: CommandMatcher,
  resolverMessage: Message,
): BaseInternal<Model, Message, unknown> | undefined =>
  pipe(
    internal.commands,
    Array.findFirstIndex(command => commandMatches(matcher, command)),
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

/** A fingerprint identifying a matcher's match space. Two matchers with the
 *  same fingerprint resolve the same set of Commands; the newer one wins. */
const matcherFingerprint = (matcher: CommandMatcher): string =>
  isCommandDefinitionMatcher(matcher)
    ? `def:${matcher.name}`
    : `inst:${matcher.name}:${JSON.stringify(matcher.args ?? null)}`

/** Resolves all listed Commands, cascading through any Commands produced by
 *  the result. Resolvers stay applicable across the cascade so multiple
 *  Commands matching the same matcher reuse it. When a new resolver shares a
 *  fingerprint with an existing one (same Definition, or same Instance shape),
 *  the new resolver replaces the old. Mirrors the prior name-keyed semantics
 *  where the latest wins. */
export const resolveAllInternal = <Model, Message, OutMessage>(
  internal: BaseInternal<Model, Message, OutMessage>,
  resolvers: ReadonlyArray<Resolver>,
): BaseInternal<Model, Message, OutMessage> => {
  const newEntries: ReadonlyArray<ResolverEntry<Message>> = Array.map(
    resolvers,
    resolver => {
      const [matcher, resultMessage] = resolver
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      const message = (
        resolver.length === 3 ? resolver[2](resultMessage) : resultMessage
      ) as Message
      return { matcher, message }
    },
  )

  const newFingerprints = new Set(
    Array.map(newEntries, ({ matcher }) => matcherFingerprint(matcher)),
  )
  const survivingExisting = Array.filter(
    internal.resolvers,
    ({ matcher }) => !newFingerprints.has(matcherFingerprint(matcher)),
  )

  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  let current = {
    ...internal,
    resolvers: [...survivingExisting, ...newEntries],
  } as BaseInternal<Model, Message, unknown>

  const findNextMatch = (
    state: BaseInternal<Model, Message, unknown>,
  ): Option.Option<ResolverEntry<Message>> =>
    Array.findFirst(state.commands, command =>
      Array.findFirst(state.resolvers, ({ matcher }) =>
        commandMatches(matcher, command),
      ),
    )

  for (let depth = 0; depth < MAX_CASCADE_DEPTH; depth++) {
    const matched = findNextMatch(current)

    if (Option.isNone(matched)) {
      break
    }

    const next = resolveByMatcher(
      current,
      matched.value.matcher,
      matched.value.message,
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

const formatCommandList = (commands: ReadonlyArray<AnyCommand>): string =>
  Array.match(commands, {
    onEmpty: () => '    (none)',
    onNonEmpty: nonEmpty =>
      pipe(
        nonEmpty,
        Array.map(command => `    ${formatCommand(command)}`),
        Array.join('\n'),
      ),
  })

const formatMatcherList = (matchers: ReadonlyArray<CommandMatcher>): string =>
  pipe(
    matchers,
    Array.map(matcher => `    ${formatMatcher(matcher)}`),
    Array.join('\n'),
  )

/** Throws if any of the given matchers fail to match a pending Command.
 *  Definition matchers match by name; Instance matchers match by name + args. */
export const assertHasCommands = (
  commands: ReadonlyArray<AnyCommand>,
  matchers: ReadonlyArray<CommandMatcher>,
): void => {
  const missing = Array.filter(
    matchers,
    matcher => !commands.some(command => commandMatches(matcher, command)),
  )

  if (Array.isReadonlyArrayNonEmpty(missing)) {
    throw new Error(
      `Expected to find Commands:\n\n${formatMatcherList(missing)}\n\nBut the pending Commands are:\n\n${formatCommandList(commands)}`,
    )
  }
}

/** Throws if the pending Commands don't match the given matchers exactly
 *  (order-independent). Definition matchers compare by name; Instance
 *  matchers compare by name + args. Each matcher must consume exactly one
 *  pending Command. */
export const assertExactCommands = (
  commands: ReadonlyArray<AnyCommand>,
  matchers: ReadonlyArray<CommandMatcher>,
): void => {
  const remaining: Array<AnyCommand> = [...commands]
  const unmatched: Array<CommandMatcher> = []

  for (const matcher of matchers) {
    const index = remaining.findIndex(command =>
      commandMatches(matcher, command),
    )
    if (index === -1) {
      unmatched.push(matcher)
    } else {
      remaining.splice(index, 1)
    }
  }

  if (
    Array.isReadonlyArrayNonEmpty(unmatched) ||
    Array.isReadonlyArrayNonEmpty(remaining)
  ) {
    const expected = formatMatcherList(
      pipe(
        matchers,
        Array.map(matcher => formatMatcher(matcher)),
        Array.sort(Order.String),
        Array.map((line): CommandMatcher => ({ name: line })),
      ),
    )
    const actual = formatCommandList(
      pipe(
        commands,
        Array.map(command => formatCommand(command)),
        Array.sort(Order.String),
        Array.map((line): AnyCommand => ({ name: line })),
      ),
    )

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
    throw new Error(
      `Expected no Commands but found:\n\n${formatCommandList(commands)}`,
    )
  }
}

/** Throws when trying to send a message with unresolved Commands. */
export const assertNoUnresolvedCommands = (
  commands: ReadonlyArray<AnyCommand>,
  context: string,
): void => {
  if (Array.isReadonlyArrayNonEmpty(commands)) {
    throw new Error(
      `I found unresolved Commands ${context}:\n\n${formatCommandList(commands)}\n\n` +
        'Resolve all Commands before sending the next Message.\n' +
        'Use resolve(Definition | instance, ResultMessage) for each one,\n' +
        'or resolveAll(...resolvers) to resolve them all at once.',
    )
  }
}

/** Throws when Commands remain at the end of a test. */
export const assertAllCommandsResolved = (
  commands: ReadonlyArray<AnyCommand>,
): void => {
  if (Array.isReadonlyArrayNonEmpty(commands)) {
    throw new Error(
      `I found Commands without resolvers:\n\n${formatCommandList(commands)}\n\n` +
        'Every Command produced by update needs to be resolved.\n' +
        'Use resolve(Definition | instance, ResultMessage) for each one,\n' +
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

/** Throws when trying to send a Message with unacknowledged unmounts
 *  from previous renders. */
export const assertNoUnacknowledgedUnmounts = (
  unacknowledgedEnded: ReadonlyArray<PendingMount>,
  context: string,
): void => {
  if (Array.isReadonlyArrayNonEmpty(unacknowledgedEnded)) {
    throw new Error(
      `I found unacknowledged unmounts ${context}:\n\n${formatMountList(unacknowledgedEnded)}\n\n` +
        'Acknowledge unmounts before sending the next Message.\n' +
        'Use Scene.Mount.expectEnded(Definition) for each one.',
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

/** Throws when Mounts ended (unmounted) without being acknowledged. */
export const assertAllUnmountsAcknowledged = (
  unacknowledgedEnded: ReadonlyArray<PendingMount>,
): void => {
  if (Array.isReadonlyArrayNonEmpty(unacknowledgedEnded)) {
    throw new Error(
      `I found Mounts that ended without being acknowledged:\n\n${formatMountList(unacknowledgedEnded)}\n\n` +
        'Every Mount that fires and then unmounts during a scene must be\n' +
        'acknowledged with Scene.Mount.expectEnded(Definition), even if it\n' +
        'was previously resolved.',
    )
  }
}
