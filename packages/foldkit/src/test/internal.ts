import {
  Array,
  Equal,
  Option,
  Order,
  Predicate,
  Schema,
  String,
  pipe,
} from 'effect'
import type { Effect, Stream } from 'effect'

import {
  type DefinitionIdentity,
  InvocationIdentityTypeId,
  InvocationNameTypeId,
  identityOf,
  invocationIdentity,
  invocationName,
} from '../block/identity.js'
import { isScopedEntry, isScopedInvocation } from '../block/scope.js'
import type { Scoped } from '../block/scope.js'
import { CommandDefinitionTypeId } from '../command/index.js'
import type { InterruptDefinitionNoArgs } from '../command/interruptible/index.js'
import { type MountDefinition, MountDefinitionTypeId } from '../mount/index.js'
import {
  type Subscription,
  type MessageDeclaration as SubscriptionMessageDeclaration,
  __messageMappers as subscriptionMessageMappers,
} from '../subscription/subscription.js'
import {
  bindingMatcherFingerprint,
  commandMatches,
  isBindingCommandMatcher,
  sameOperation,
} from './bindingMatcher.js'

/** A Command in a test simulation. Carries `name` and optionally the `args`
 *  the runtime captured at construction. Instance matchers (Command values
 *  produced by calling a Definition) are matched against this shape; the
 *  `effect` field on a real Command is irrelevant for matching, so we only
 *  retain the definition identity, displayed name, and args.
 *
 *  `messageMappers` is the Command's message-mapping chain (from
 *  `Command.mapMessage`/`mapMessages`). It rides along on pending Commands so
 *  `resolve` can apply the parent's wrapping to a substitute result Message
 *  without the test restating it. Absent on synthetic matchers built for
 *  formatting; treated as empty then.
 *
 *  `key` is present on Commands built with an interruptible `Command.define`:
 *  such Commands may stay pending across Messages (they model long-running
 *  work). `interruptsKey` is present on Interrupt Commands: resolving one
 *  drops every pending Command holding that key, mirroring the runtime
 *  guarantee that an interrupted Command's result Message never dispatches. */
export type AnyCommand = Readonly<{
  /** @internal Exact source identity preserved through composition. */
  [InvocationIdentityTypeId]?: DefinitionIdentity | undefined
  /** @internal Original name distinguishes an Interrupt from its operation. */
  [InvocationNameTypeId]?: string | undefined
  name: string
  args?: Record<string, unknown>
  key?: string
  interruptsKey?: string
  messageMappers?: ReadonlyArray<(message: unknown) => unknown>
}>

/** Pattern for matching a Command in test assertions. A Definition matches
 *  by originating definition ("this Command was dispatched"); an Instance
 *  also matches structural-equal args. A bound Instance selects its
 *  composition path. Choose the form per assertion based on
 *  whether the test cares about the args value.
 *
 *  Two modes only: definition identity or identity + full args. Partial-args matching is
 *  intentionally unsupported. If a subset of args carries the meaning the
 *  test is verifying, the right assertion is usually against the Model that
 *  the Command's result fed through update, not a partial Command shape. */
export type CommandMatcher =
  | ResolvableCommandDefinition<string, unknown>
  | AnyCommand

/** A typed Command instance carrying the result Message type through its
 * `effect` field. */
export type AnyCommandInstance<ResultMessage = unknown> = Readonly<{
  name: string
  args?: Record<string, unknown>
  effect: Effect.Effect<ResultMessage, any, any>
}>

/** A Command Definition whose result Message can be supplied by Story and
 * Scene resolution APIs. */
export type ResolvableCommandDefinition<
  Name extends string,
  ResultMessage,
> = Readonly<{
  [CommandDefinitionTypeId]: typeof CommandDefinitionTypeId
  name: Name
}> &
  ((
    ...args: Array<any>
  ) => Readonly<{ effect: Effect.Effect<ResultMessage, any, any> }>)

/** Captured argument type projected from a resolvable Command Definition. */
export type CommandArgs<
  Definition extends ResolvableCommandDefinition<string, unknown>,
> =
  Definition extends InterruptDefinitionNoArgs<string>
    ? undefined
    : ReturnType<Definition> extends infer Invocation
      ? Invocation extends unknown
        ? 'args' extends keyof Invocation
          ? Invocation['args']
          : Parameters<Definition> extends readonly []
            ? undefined
            : AnyCommand['args']
        : never
      : never

/** A Definition or Command instance accepted by Story and Scene resolution
 * APIs. */
export type ResolvableCommandMatcher =
  | ResolvableCommandDefinition<string, unknown>
  | AnyCommandInstance<unknown>

type ResultMessageForMatcher<Matcher extends ResolvableCommandMatcher> =
  Matcher extends ResolvableCommandDefinition<string, infer ResultMessage>
    ? ResultMessage
    : Matcher extends AnyCommandInstance<infer ResultMessage>
      ? ResultMessage
      : never

const isCommandDefinitionMatcher = (
  matcher: CommandMatcher,
): matcher is ResolvableCommandDefinition<string, unknown> =>
  Predicate.hasProperty(matcher, CommandDefinitionTypeId)

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
  /** @internal The originating Mount declaration. */
  [InvocationIdentityTypeId]?: DefinitionIdentity | undefined
  /** @internal The original Mount name before placement prefixes. */
  [InvocationNameTypeId]?: string | undefined
  name: string
  args?: Record<string, unknown>
  occurrence: number
  messageMappers?: ReadonlyArray<(message: unknown) => unknown>
}>

/** A Mount lifecycle event in a test simulation. Carries `name` and
 *  optionally the `args` used to construct the MountAction. Mirrors
 *  `AnyCommand` for Mount matchers. */
export type AnyMount = Readonly<{
  name: string
  args?: Record<string, unknown>
}>

/** Pattern for matching a pending Mount in test assertions. A Definition
 *  matches by originating definition; an Instance also matches structural-equal
 *  args. A bound Instance selects its composition path. Choose the form per assertion based
 *  on whether the test cares about the args value.
 *
 *  Two modes only: definition identity or identity + full args. Partial-args matching is
 *  intentionally unsupported, mirroring `CommandMatcher`. */
export type MountMatcher = MountDefinition<string, unknown> | AnyMount

const isMountDefinitionMatcher = (
  matcher: MountMatcher,
): matcher is MountDefinition<string, unknown> =>
  Predicate.hasProperty(matcher, MountDefinitionTypeId)

/** Matches a pending Mount by source identity, bound path, and declared args. */
export const mountMatches = (matcher: MountMatcher, mount: AnyMount): boolean =>
  sameOperation(matcher, mount) &&
  (isMountDefinitionMatcher(matcher) ||
    matcher.args === undefined ||
    Equal.equals(matcher.args, mount.args))

/** Formats a Mount matcher for display in error messages. Definition
 *  matchers render as just the name; Instance matchers append the args. */
export const formatMountMatcher = (matcher: MountMatcher): string =>
  isMountDefinitionMatcher(matcher)
    ? matcher.name
    : `${matcher.name}${formatArgs(matcher.args)}`

/**
 * Result shape used after Story and Scene replace executable Commands with
 * assertion metadata. Plain returns retain `outMessage?: never`, so code that
 * consumes only the Model and Commands cannot discard an OutMessage.
 *
 * @internal
 */
export type SimulationUpdateReturn<Model, OutMessage> =
  | Readonly<{
      model: Model
      commands?: ReadonlyArray<AnyCommand> | undefined
      outMessage?: never
    }>
  | Readonly<{
      model: Model
      commands?: ReadonlyArray<AnyCommand> | undefined
      outMessage?: OutMessage
    }>

/** A Command matcher (Definition or Instance) paired with the raw result
 *  Message to resolve a pending Command with. Definition matchers resolve by
 *  source identity; an Instance also selects its bound path and declared args. The matched Command's own message-mapping chain is applied to
 *  the result, so pass the child's raw result Message, not a parent-wrapped
 *  one. The result Message must belong to the matched Command. */
export type Resolver<
  Matcher extends ResolvableCommandMatcher = ResolvableCommandMatcher,
> = readonly [Matcher, ResultMessageForMatcher<Matcher>]

/** A Mount matcher (Definition or Instance) paired with the raw result Message
 *  to resolve it with. Mirrors `Resolver` for Commands. When the mount lives
 *  inside a Block, the boundary's own `toParentMessage` chain (snapshotted at
 *  render time) is applied to the result, so pass the child's raw result
 *  Message, not a parent-wrapped one. */
export type MountResolver<ResultMessage = unknown> = readonly [
  MountMatcher,
  ResultMessage,
]

/** A resolver entry pairs a Command matcher with the raw result Message that
 *  should be fed back through update when a pending Command matches. The
 *  matched Command's own message-mapping chain is applied to the result at
 *  resolve time. Stored as a list (not a name-keyed map) so Instance matchers
 *  with the same name but different args can coexist. Each entry is consumed on
 *  its first matching dispatch. */
export type ResolverEntry = Readonly<{
  matcher: CommandMatcher
  resultMessage: unknown
}>

type MatchedResolver = Readonly<{
  entry: ResolverEntry
  resolverIndex: number
}>

/** Base shape of an internal simulation — shared between Story and Scene. */
export type BaseInternal<Model, Message, OutMessage = undefined> = Readonly<{
  model: Model
  message: Message | undefined
  commands: ReadonlyArray<AnyCommand>
  outMessage: OutMessage | undefined
  updateFn: (
    model: Model,
    message: Message,
  ) => SimulationUpdateReturn<Model, OutMessage>
  resolvers: ReadonlyArray<ResolverEntry>
}>

/** Drops every pending Command holding `interruptsKey` when a resolved
 *  Command declares one (an Interrupt Command). Resolving the Interrupt
 *  before the target declares that the interrupt won the race, so the
 *  target's result Message never arrives; resolving the target first models
 *  completion before the interrupt ran. */
const dropInterruptedCommands = (
  pending: ReadonlyArray<AnyCommand>,
  resolvedCommand: AnyCommand,
): ReadonlyArray<AnyCommand> =>
  Predicate.isUndefined(resolvedCommand.interruptsKey)
    ? pending
    : Array.filter(
        pending,
        pendingCommand => pendingCommand.key !== resolvedCommand.interruptsKey,
      )

/** Folds a recorded message-mapping chain over `resultMessage`, reproducing the
 *  wrapping a resolved Command or mounted child's result travels through in
 *  production: the parent's `Command.mapMessages` for a Command, or the
 *  Block-boundary lift for a mount. A root or scene test can then resolve
 *  with the child's raw result. An absent chain is the identity. */
const foldMessageMappers = (
  messageMappers: ReadonlyArray<(message: unknown) => unknown> | undefined,
  resultMessage: unknown,
): unknown =>
  Array.reduce(messageMappers ?? [], resultMessage, (current, mapper) =>
    mapper(current),
  )

/** Resolves the first pending Command that matches the given matcher and feeds
 *  its result through update, applying the matched Command's own message-mapping
 *  chain to `resultMessage` first. Returns `undefined` when no pending Command
 *  matches. Definition matchers select the source; Instance matchers also
 *  select their bound path and args. */
export const resolveByMatcher = <Model, Message, OutMessage>(
  internal: BaseInternal<Model, Message, OutMessage>,
  matcher: CommandMatcher,
  resultMessage: unknown,
): BaseInternal<Model, Message, OutMessage> | undefined =>
  pipe(
    internal.commands,
    Array.findFirstIndex(command => commandMatches(matcher, command)),
    Option.flatMap(commandIndex =>
      pipe(
        internal.commands,
        Array.get(commandIndex),
        Option.map(matchedCommand => {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          const resolverMessage = foldMessageMappers(
            matchedCommand.messageMappers,
            resultMessage,
          ) as Message
          const remainingCommands = dropInterruptedCommands(
            Array.remove(internal.commands, commandIndex),
            matchedCommand,
          )
          const messageUpdate = internal.updateFn(
            internal.model,
            resolverMessage,
          )
          return {
            ...internal,
            model: messageUpdate.model,
            message: resolverMessage,
            commands: Array.appendAll(
              remainingCommands,
              messageUpdate.commands ?? [],
            ),
            outMessage: messageUpdate.outMessage,
          }
        }),
      ),
    ),
    Option.getOrUndefined,
  )

const MAX_CASCADE_DEPTH = 100

/** A fingerprint identifying a matcher's match space. Two matchers with the
 *  same fingerprint resolve the same set of Commands; the newer one wins. */
const matcherIdentities = new WeakMap<DefinitionIdentity, number>()
let nextMatcherIdentity = 0

const matcherFingerprint = (matcher: CommandMatcher): string => {
  const identity = identityOf(matcher) ?? invocationIdentity(matcher)
  let source = matcher.name
  if (identity !== undefined) {
    const identityId = matcherIdentities.get(identity) ?? nextMatcherIdentity++
    matcherIdentities.set(identity, identityId)
    source = `${identityId}:${invocationName(matcher) ?? matcher.name}:${isScopedInvocation(matcher) ? matcher.name : ''}:${bindingMatcherFingerprint(matcher)}`
  }
  return isCommandDefinitionMatcher(matcher)
    ? `def:${source}`
    : `inst:${source}:${JSON.stringify(matcher.args ?? null)}`
}

const findNextMatch = (
  commands: ReadonlyArray<AnyCommand>,
  resolvers: ReadonlyArray<ResolverEntry>,
): Option.Option<MatchedResolver> => {
  const toMatchedResolver = (
    command: AnyCommand,
  ): Option.Option<MatchedResolver> =>
    pipe(
      resolvers,
      Array.findFirstWithIndex(({ matcher }) =>
        commandMatches(matcher, command),
      ),
      Option.map(([entry, resolverIndex]) => ({ entry, resolverIndex })),
    )

  return Array.findFirst(commands, toMatchedResolver)
}

const assertBindingResolversUnambiguous = (
  commands: ReadonlyArray<AnyCommand>,
  resolvers: ReadonlyArray<ResolverEntry>,
): void => {
  for (const { matcher } of resolvers) {
    if (isBindingCommandMatcher(matcher)) {
      assertResolveUnambiguous(commands, matcher)
    }
  }
}

/** Resolves all listed Commands, cascading through any Commands produced by
 *  the result. Each entry is consumed by exactly one matching dispatch in
 *  declaration order; for N identical responses, compose with
 *  `Array.makeBy(n, () => [Def, message])`. Across calls, new entries replace
 *  any leftover resolvers sharing their fingerprint (latest wins). */
export const resolveAllInternal = <Model, Message, OutMessage>(
  internal: BaseInternal<Model, Message, OutMessage>,
  resolvers: ReadonlyArray<Resolver>,
): BaseInternal<Model, Message, OutMessage> => {
  const newEntries: ReadonlyArray<ResolverEntry> = Array.map(
    resolvers,
    ([matcher, resultMessage]) => ({ matcher, resultMessage }),
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

  for (let depth = 0; depth < MAX_CASCADE_DEPTH; depth++) {
    assertBindingResolversUnambiguous(current.commands, current.resolvers)
    const matched = findNextMatch(current.commands, current.resolvers)

    if (Option.isNone(matched)) {
      break
    }

    const next = resolveByMatcher(
      current,
      matched.value.entry.matcher,
      matched.value.entry.resultMessage,
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

/** Resolves only the listed Command resolvers, cascading through result
 *  Messages, and throws unless every resolver matches one dispatched Command.
 *  Unlike `resolveAllInternal`, unmatched entries never carry forward. */
export const resolveAllExactInternal = <Model, Message, OutMessage>(
  internal: BaseInternal<Model, Message, OutMessage>,
  resolvers: ReadonlyArray<Resolver>,
): BaseInternal<Model, Message, OutMessage> => {
  let remainingResolvers: ReadonlyArray<ResolverEntry> = Array.map(
    resolvers,
    ([matcher, resultMessage]) => ({ matcher, resultMessage }),
  )

  let current = internal

  for (let depth = 0; depth < MAX_CASCADE_DEPTH; depth++) {
    assertBindingResolversUnambiguous(current.commands, remainingResolvers)
    const matched = findNextMatch(current.commands, remainingResolvers)

    if (Option.isNone(matched)) {
      break
    }

    const next = resolveByMatcher(
      current,
      matched.value.entry.matcher,
      matched.value.entry.resultMessage,
    )

    if (Predicate.isUndefined(next)) {
      break
    }

    current = next
    remainingResolvers = Array.remove(
      remainingResolvers,
      matched.value.resolverIndex,
    )

    if (depth === MAX_CASCADE_DEPTH - 1) {
      throw new Error(
        'resolveAllExact hit the maximum cascade depth (100). ' +
          'This usually means Commands are producing Commands in an infinite cycle.',
      )
    }
  }

  if (Array.isReadonlyArrayNonEmpty(remainingResolvers)) {
    throw new Error(
      `resolveAllExact expected Commands that were not dispatched:\n\n${formatMatcherList(
        Array.map(remainingResolvers, ({ matcher }) => matcher),
      )}\n\nPending Commands after resolving matches:\n\n${formatCommandList(current.commands)}`,
    )
  }

  assertAllCommandsResolved(current.commands)

  return current
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
    const resolutionAdvice = isBindingCommandMatcher(matcher)
      ? 'Include the missing ancestor Binding and keyed occurrence in the component test fixture.'
      : 'To disambiguate, pass a Command instance with specific args, or use resolveAll for ordered consumption.'
    throw new Error(
      `I tried to resolve "${formatMatcher(matcher)}" but multiple pending Commands match.\n\n` +
        `Matches:\n${formatCommandList(matches)}\n\n` +
        resolutionAdvice,
    )
  }
}

/** Throws if any of the given matchers fail to match a pending Command.
 *  Definition matchers select the source; Instance matchers also select args. */
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
 *  (order-independent). Definition matchers compare by source identity; Instance
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
        Array.map(line => ({ name: line })),
      ),
    )
    const actual = formatCommandList(
      pipe(
        commands,
        Array.map(command => formatCommand(command)),
        Array.sort(Order.String),
        Array.map(line => ({ name: line })),
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

const formatChildBlockCommandHint = (
  commands: ReadonlyArray<AnyCommand>,
): string =>
  Array.some(commands, command =>
    Array.isReadonlyArrayNonEmpty(command.messageMappers ?? []),
  )
    ? '\n\nSome Commands came from a child Block. If the child is an\n' +
      '@foldkit/ui component, check its test namespace for a helper\n' +
      '(for example, ToastBlock.test.drainEntry).'
    : ''

/** Throws when trying to send a message with unresolved Commands. Keyed
 *  Commands (built with an interruptible `Command.define`) and Interrupt
 *  Commands are exempt: they model in-flight async work that legitimately
 *  stays pending while later Messages arrive, so a story can dispatch the
 *  Message that interrupts a keyed Command, or keep typing while a
 *  cancellation is in flight. They must still be resolved by the end of the
 *  test. */
export const assertNoUnresolvedCommands = (
  commands: ReadonlyArray<AnyCommand>,
  context: string,
): void => {
  const unresolvable = Array.filter(
    commands,
    command =>
      Predicate.isUndefined(command.key) &&
      Predicate.isUndefined(command.interruptsKey),
  )
  if (Array.isReadonlyArrayNonEmpty(unresolvable)) {
    throw new Error(
      `I found unresolved Commands ${context}:\n\n${formatCommandList(unresolvable)}\n\n` +
        'Resolve all Commands before sending the next Message.\n' +
        'Use resolve(Definition | instance, ResultMessage) for each one,\n' +
        'or resolveAll(...resolvers) to resolve them all at once.' +
        formatChildBlockCommandHint(unresolvable),
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
        'or resolveAll(...resolvers) to resolve them all at once.' +
        formatChildBlockCommandHint(commands),
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
 *  its result through update, folding the matched Mount's Block-boundary
 *  chain over `resultMessage` first. Returns `undefined` when no pending Mount
 *  matches. Definition matchers select the source; Instance matchers also
 *  select their bound path and args. */
export const resolveMountByMatcher = <Model, Message>(
  internal: BaseInternal<Model, Message, unknown>,
  pendingMounts: ReadonlyArray<PendingMount>,
  matcher: MountMatcher,
  resultMessage: unknown,
):
  | Readonly<{
      internal: BaseInternal<Model, Message, unknown>
      pendingMounts: ReadonlyArray<PendingMount>
    }>
  | undefined =>
  pipe(
    pendingMounts,
    Array.findFirstIndex(mount => mountMatches(matcher, mount)),
    Option.flatMap(index =>
      pipe(
        pendingMounts,
        Array.get(index),
        Option.map(matchedMount => {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          const resolverMessage = foldMessageMappers(
            matchedMount.messageMappers,
            resultMessage,
          ) as Message
          const remaining = Array.remove(pendingMounts, index)
          const messageUpdate = internal.updateFn(
            internal.model,
            resolverMessage,
          )
          return {
            internal: {
              ...internal,
              model: messageUpdate.model,
              message: resolverMessage,
              commands: Array.appendAll(
                internal.commands,
                messageUpdate.commands ?? [],
              ),
              outMessage: messageUpdate.outMessage,
            },
            pendingMounts: remaining,
          }
        }),
      ),
    ),
    Option.getOrUndefined,
  )

/** Throws if any of the given matchers are missing from the pending mount
 *  list. Definition matchers select the source; Instance matchers also
 *  select their bound path and structural-equal args. */
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

// SUBSCRIPTIONS

type UnscopedSubscriptionRequirements<Requirements> =
  Requirements extends Scoped<any, infer Contract> ? Contract : Requirements

/** The entry values a test may pass to emit a registered Subscription entry:
 *  the entry itself, or the child entry it was lifted from. */
export type SubscriptionEmissionSource<Entry> =
  Entry extends Readonly<{
    dependenciesToStream: (
      ...args: ReadonlyArray<any>
    ) => Stream.Stream<any, never, infer Requirements>
  }>
    ?
        | Subscription<any, any, any, Requirements>
        | Subscription<
            any,
            any,
            any,
            UnscopedSubscriptionRequirements<Requirements>
          >
    : never

const applySubscriptionMappers = (
  declaration: SubscriptionMessageDeclaration,
  message: unknown,
): unknown =>
  Array.reduce(
    declaration.messageMappers,
    message,
    (current, toParentMessage) => toParentMessage(current),
  )

/** Validates a Message emitted for a registered Subscription entry and
 *  applies that entry's generated delivery. */
export const resolveSubscriptionMessage = (
  stepName: string,
  declarations: ReadonlyArray<SubscriptionMessageDeclaration>,
  entry: unknown,
  message: unknown,
): unknown => {
  const exactDeclarations = Array.filter(
    declarations,
    declaration => declaration.entry === entry,
  )
  const sourceDeclarations = Array.isArrayNonEmpty(exactDeclarations)
    ? exactDeclarations
    : Array.filter(declarations, declaration => {
        if (!Predicate.isObject(entry)) {
          return false
        }

        const expected = identityOf(entry)
        const actual = identityOf(declaration.entry)
        if (expected === undefined || actual?.token !== expected.token) {
          return false
        }

        const sourceMappers = subscriptionMessageMappers(entry)
        if (
          !sourceMappers.every(
            (mapper, index) =>
              Option.getOrUndefined(
                Array.get(declaration.messageMappers, index),
              ) === mapper,
          )
        ) {
          return false
        }

        const name = Reflect.get(entry, 'name')
        const declarationName = Reflect.get(declaration.entry, 'name')
        return (
          !isScopedEntry(entry) ||
          declarationName === name ||
          (Predicate.isString(name) &&
            Predicate.isString(declarationName) &&
            String.endsWith(`/${name}`)(declarationName))
        )
      })
  const matchingDeclarations = Array.filter(sourceDeclarations, declaration =>
    Array.some(declaration.schemas, schema => Schema.is(schema)(message)),
  )

  return Array.matchLeft(matchingDeclarations, {
    onEmpty: () => {
      throw new Error(
        `${stepName} received a Message that is not declared by the selected Subscription:\n\n` +
          `    ${JSON.stringify(message)}`,
      )
    },
    onNonEmpty: (declaration, remainingDeclarations) => {
      if (Array.isArrayNonEmpty(remainingDeclarations)) {
        const entryKeys = pipe(
          matchingDeclarations,
          Array.map(({ entryKey }) => entryKey),
          Array.join(', '),
        )

        throw new Error(
          `${stepName} selected a Subscription entry ` +
            `registered under multiple keys: ${entryKeys}.\n\n` +
            'Select the bound Subscription entry for the intended child placement.',
        )
      }

      return applySubscriptionMappers(declaration, message)
    },
  })
}
