import { Equal, Option, Predicate } from 'effect'

import type { AnyBinding, BindingEvidence } from '../block/binding.js'
import { blockOf } from '../block/binding.js'
import { canonicalBindingOf } from '../block/composition.js'
import {
  copyIdentity,
  identityOf,
  invocationIdentity,
  invocationName,
} from '../block/identity.js'
import { type InstanceKey, commandInstances } from '../block/instanceContext.js'
import { isScopedInvocation } from '../block/scope.js'
import { CommandDefinitionTypeId } from '../command/index.js'
import type {
  AnyCommand,
  AnyCommandInstance,
  CommandArgs,
  CommandMatcher,
  ResolvableCommandDefinition,
} from './internal.js'

type BindingFrame = Readonly<{
  binding: object
  key: InstanceKey | undefined
}>

const bindingPaths = new WeakMap<object, ReadonlyArray<BindingFrame>>()
const bindingIds = new WeakMap<object, number>()
let nextBindingId = 0

const bindingId = (binding: object): number => {
  const existing = bindingIds.get(binding)
  if (existing !== undefined) {
    return existing
  }

  const id = nextBindingId
  nextBindingId += 1
  bindingIds.set(binding, id)
  return id
}

const keyFingerprint = (key: InstanceKey | undefined): string =>
  key === undefined ? 'none' : `${typeof key}:${JSON.stringify(key)}`

/** @internal A Binding-scoped matcher can inspect pending Commands while a
 * framework fixture derives an exact full-args instance. */
export type BoundCommandMatcher<Matcher> = Matcher &
  Readonly<{
    matches: (command: AnyCommand) => boolean
  }>

/** @internal Restricts one Command instance matcher to an exact suffix of
 * Binding objects and keyed occurrences captured by composition. Framework
 * packages use this to build public component test fixtures without exposing
 * private Command Definitions as consumer API. */
export const __bindCommandMatcher = <
  const BlockValue extends object,
  const BindingValue extends AnyBinding &
    BindingEvidence<NoInfer<BlockValue>, any, any, boolean>,
  const Matcher extends AnyCommandInstance<unknown>,
>(
  block: BlockValue,
  binding: BindingValue,
  matcher: Matcher,
  key?: InstanceKey,
): BoundCommandMatcher<Matcher> => {
  if (blockOf(binding) !== block) {
    throw new Error(
      `[foldkit] Command test matcher Binding "${binding.placement}" belongs to a different completed Block instance.`,
    )
  }

  const scoped = { ...matcher }
  copyIdentity(matcher, scoped)
  bindingPaths.set(scoped, [
    { binding: canonicalBindingOf(binding), key },
    ...(bindingPaths.get(matcher) ?? []),
  ])
  Object.defineProperty(scoped, 'matches', {
    value: (command: AnyCommand) => commandMatches(scoped, command),
  })
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return scoped as BoundCommandMatcher<Matcher>
}

/** @internal Whether a matcher selects an exact Binding path. */
export const isBindingCommandMatcher = (matcher: object): boolean =>
  bindingPaths.has(matcher)

/** @internal Whether a Command carries the selected Binding path suffix. */
export const matchesBindingPath = (
  matcher: object,
  command: object,
): boolean => {
  const expected = bindingPaths.get(matcher)
  if (expected === undefined) {
    return true
  }

  const actual = commandInstances(command)
  const offset = actual.length - expected.length
  if (offset < 0) {
    return false
  }

  return expected.every(({ binding, key }, index) => {
    const frame = actual.at(offset + index)
    return frame?.binding === binding && frame.key === key
  })
}

/** @internal Stable cache key for one Binding-scoped matcher path. */
export const bindingMatcherFingerprint = (matcher: object): string =>
  (bindingPaths.get(matcher) ?? [])
    .map(
      ({ binding, key }) =>
        `${String(bindingId(binding))}:${keyFingerprint(key)}`,
    )
    .join('/')

const isCommandDefinitionMatcher = (
  matcher: CommandMatcher,
): matcher is CommandMatcher &
  Readonly<Record<typeof CommandDefinitionTypeId, unknown>> =>
  Predicate.hasProperty(matcher, CommandDefinitionTypeId)

/** @internal Compares operation source identity and qualified names. */
export const sameOperation = (
  matcher: Readonly<{ name: string }>,
  operation: Readonly<{ name: string }>,
): boolean => {
  const expected = identityOf(matcher) ?? invocationIdentity(matcher)
  const actual = invocationIdentity(operation)

  if (expected !== undefined && actual !== undefined) {
    return (
      expected.token === actual.token &&
      (invocationName(matcher) ?? matcher.name) ===
        (invocationName(operation) ?? operation.name) &&
      (!isScopedInvocation(matcher) || matcher.name === operation.name)
    )
  }

  return matcher.name === operation.name
}

/** @internal Matches a pending Command by source, path, full args, and Binding
 * occurrence evidence. */
export const commandMatches = (
  matcher: CommandMatcher,
  command: AnyCommand,
): boolean =>
  sameOperation(matcher, command) &&
  matchesBindingPath(matcher, command) &&
  (isCommandDefinitionMatcher(matcher) ||
    matcher.args === undefined ||
    Equal.equals(matcher.args, command.args))

/** @internal Projects captured args after proving Command source identity. */
export function commandArgs<
  Definition extends ResolvableCommandDefinition<string, unknown>,
>(
  definition: Definition,
): (pending: AnyCommand) => Option.Option<CommandArgs<Definition>>
export function commandArgs(
  definition: ResolvableCommandDefinition<string, unknown>,
): (pending: AnyCommand) => Option.Option<AnyCommand['args']> {
  return pending =>
    identityOf(definition) !== undefined &&
    invocationIdentity(pending) !== undefined &&
    commandMatches(definition, pending)
      ? Option.some(pending.args)
      : Option.none()
}
