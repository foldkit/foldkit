import { Array, Equal, Option, Order, Predicate, pipe } from 'effect'

import {
  type CommandDefinition,
  CommandDefinitionTypeId,
} from '../command/index.js'
import { type MountDefinition, MountDefinitionTypeId } from '../mount/index.js'

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
    Equal.equals(matcher.args, command.args))

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
 *  tree-traversal order. `args` carries the runtime values used to construct
 *  the MountAction when its definition declared an args record. */
export type PendingMount = Readonly<{
  name: string
  args?: Record<string, unknown>
  occurrence: number
}>

/** A Mount lifecycle event in a test simulation. Carries `name` and
 *  optionally the `args` used to construct the MountAction. Mirrors
 *  `AnyCommand` for Mount matchers. */
export type AnyMount = Readonly<{
  name: string
  args?: Record<string, unknown>
}>

/** Pattern for matching a pending Mount in test assertions. A Definition
 *  matches by name only ("a Mount with this identity is in the rendered
 *  tree"); an Instance matches by name AND structural-equal args ("a Mount
 *  with this identity AND these args"). Choose the form per assertion based
 *  on whether the test cares about the args value.
 *
 *  Two modes only: name-only or name + full args. Partial-args matching is
 *  intentionally unsupported, mirroring `CommandMatcher`. */
export type MountMatcher = MountDefinition<string, unknown> | AnyMount

const isMountDefinitionMatcher = (
  matcher: MountMatcher,
): matcher is MountDefinition<string, unknown> =>
  Predicate.hasProperty(matcher, MountDefinitionTypeId)

/** Whether a `matcher` matches a pending Mount. Definition matchers match by
 *  name. Instance matchers (with declared args) match by name + structural
 *  args equality; instance matchers without args match by name. */
export const mountMatches = (matcher: MountMatcher, mount: AnyMount): boolean =>
  matcher.name === mount.name &&
  (isMountDefinitionMatcher(matcher) ||
    matcher.args === undefined ||
    Equal.equals(matcher.args, mount.args))

/** Formats a Mount matcher for display in error messages. Definition
 *  matchers render as just the name; Instance matchers append the args. */
export const formatMountMatcher = (matcher: MountMatcher): string =>
  isMountDefinitionMatcher(matcher)
    ? matcher.name
    : `${matcher.name}${formatArgs(matcher.args)}`

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

/** A Mount matcher (Definition or Instance) with the result Message to
 *  resolve it with. Mirrors `Resolver` for Commands. The optional third
 *  element lifts a child Mount result into the parent's Message universe
 *  (mirrors `Mount.mapMessage`). */
export type MountResolver<ResultMessage = unknown> =
  | readonly [MountMatcher, ResultMessage]
  | readonly [MountMatcher, ResultMessage, (message: ResultMessage) => unknown]

/** A resolver entry pairs a Command matcher with the Message that should be
 *  fed back through update when a pending Command matches. Stored as a list
 *  (not a name-keyed map) so Instance matchers with the same name but
 *  different args can coexist. Each entry is consumed on its first matching
 *  dispatch. */
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
 *  the result. Each entry is consumed by exactly one matching dispatch in
 *  declaration order; for N identical responses, compose with
 *  `Array.makeBy(n, () => [Def, message])`. Across calls, new entries replace
 *  any leftover resolvers sharing their fingerprint (latest wins). */
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
  ): Option.Option<{ entry: ResolverEntry<Message>; resolverIndex: number }> =>
    Array.findFirst(state.commands, command =>
      pipe(
        state.resolvers,
        Array.findFirstIndex(({ matcher }) => commandMatches(matcher, command)),
        Option.flatMap(resolverIndex =>
          pipe(
            state.resolvers,
            Array.get(resolverIndex),
            Option.map(entry => ({ entry, resolverIndex })),
          ),
        ),
      ),
    )

  for (let depth = 0; depth < MAX_CASCADE_DEPTH; depth++) {
    const matched = findNextMatch(current)

    if (Option.isNone(matched)) {
      break
    }

    const next = resolveByMatcher(
      current,
      matched.value.entry.matcher,
      matched.value.entry.message,
    )

    if (Predicate.isUndefined(next)) {
      break
    }

    current = {
      ...next,
      resolvers: Array.remove(next.resolvers, matched.value.resolverIndex),
    }

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

/** Throws if more than one pending Command matches the given matcher. Used
 *  by single-resolve paths (`Story.Command.resolve`, `Scene.Command.resolve`)
 *  where ambiguity is a bug. The test author can't have intended one specific
 *  Command if multiple match. `resolveAll` consumes ordered pairings and
 *  skips this check. */
export const assertResolveUnambiguous = (
  commands: ReadonlyArray<AnyCommand>,
  matcher: CommandMatcher,
): void => {
  const matches = Array.filter(commands, command =>
    commandMatches(matcher, command),
  )

  if (matches.length > 1) {
    throw new Error(
      `I tried to resolve "${formatMatcher(matcher)}" but multiple pending Commands match.\n\n` +
        `Matches:\n${formatCommandList(matches)}\n\n` +
        'To disambiguate, pass a Command instance with specific args, ' +
        'or use resolveAll for ordered consumption.',
    )
  }
}

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
  const consumed = new Set<number>()
  const unmatched = Array.filter(matchers, matcher =>
    pipe(
      commands,
      Array.findFirstIndex(
        (command, index) =>
          !consumed.has(index) && commandMatches(matcher, command),
      ),
      Option.match({
        onNone: () => true,
        onSome: index => {
          consumed.add(index)
          return false
        },
      }),
    ),
  )
  const remaining = Array.filter(commands, (_, index) => !consumed.has(index))

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

const formatPendingMount = ({
  name,
  args,
  occurrence,
}: PendingMount): string => {
  const occurrenceSuffix = occurrence === 0 ? '' : ` (#${occurrence + 1})`
  return `${name}${formatArgs(args)}${occurrenceSuffix}`
}

/** Formats a list of pending Mounts (with args + occurrence suffix where
 *  applicable) for display in error messages. Returns "    (none)" when
 *  empty, mirroring the Command-side formatters. */
export const formatMountList = (mounts: ReadonlyArray<PendingMount>): string =>
  Array.match(mounts, {
    onEmpty: () => '    (none)',
    onNonEmpty: nonEmpty =>
      pipe(
        nonEmpty,
        Array.map(mount => `    ${formatPendingMount(mount)}`),
        Array.join('\n'),
      ),
  })

/** Resolves the first pending Mount that matches the given matcher and feeds
 *  its result through update. Returns `undefined` when no pending Mount
 *  matches. Definition matchers match by name; Instance matchers match by
 *  name + args. */
export const resolveMountByMatcher = <Model, Message>(
  internal: BaseInternal<Model, Message, unknown>,
  pendingMounts: ReadonlyArray<PendingMount>,
  matcher: MountMatcher,
  resolverMessage: Message,
):
  | Readonly<{
      internal: BaseInternal<Model, Message, unknown>
      pendingMounts: ReadonlyArray<PendingMount>
    }>
  | undefined =>
  pipe(
    pendingMounts,
    Array.findFirstIndex(mount => mountMatches(matcher, mount)),
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

/** Throws if any of the given matchers are missing from the pending mount
 *  list. Definition matchers match by name; Instance matchers match by
 *  name + structural-equal args. */
export const assertHasMounts = (
  pendingMounts: ReadonlyArray<PendingMount>,
  matchers: ReadonlyArray<MountMatcher>,
): void => {
  const missing = Array.filter(
    matchers,
    matcher => !pendingMounts.some(mount => mountMatches(matcher, mount)),
  )

  if (Array.isReadonlyArrayNonEmpty(missing)) {
    const missingFormatted = pipe(
      missing,
      Array.map(matcher => `    ${formatMountMatcher(matcher)}`),
      Array.join('\n'),
    )
    throw new Error(
      `Expected to find Mounts:\n\n${missingFormatted}\n\n` +
        `But the pending Mounts are:\n\n${formatMountList(pendingMounts)}`,
    )
  }
}

/** Throws if the pending Mounts don't match the given matchers exactly. Each
 *  matcher must consume exactly one pending Mount. Order-independent.
 *  Definition matchers match by name; Instance matchers match by
 *  name + structural-equal args. */
export const assertExactMounts = (
  pendingMounts: ReadonlyArray<PendingMount>,
  matchers: ReadonlyArray<MountMatcher>,
): void => {
  const consumed = new Set<number>()
  const unmatched = Array.filter(matchers, matcher =>
    pipe(
      pendingMounts,
      Array.findFirstIndex(
        (mount, index) => !consumed.has(index) && mountMatches(matcher, mount),
      ),
      Option.match({
        onNone: () => true,
        onSome: index => {
          consumed.add(index)
          return false
        },
      }),
    ),
  )
  const leftover = pipe(
    pendingMounts,
    Array.filter((_, index) => !consumed.has(index)),
  )

  if (
    Array.isReadonlyArrayNonEmpty(unmatched) ||
    Array.isReadonlyArrayNonEmpty(leftover)
  ) {
    const expected = pipe(
      matchers,
      Array.map(matcher => `    ${formatMountMatcher(matcher)}`),
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
        'Use resolveMount(Definition | instance, ResultMessage) for each one,\n' +
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
        'Use resolveMount(Definition | instance, ResultMessage) for each one,\n' +
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
