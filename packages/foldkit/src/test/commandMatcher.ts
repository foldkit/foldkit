import { Array, Equal, Option, Predicate } from 'effect'

import { type Path, isBlockMessage } from '../blocks/engine.js'
import { CommandDefinitionTypeId } from '../command/index.js'
import {
  copyIdentity,
  identityOf,
  invocationIdentity,
  invocationName,
} from '../definitionIdentity.js'
import type {
  AnyCommand,
  CommandArgs,
  CommandMatcher,
  ResolvableCommandDefinition,
} from './internal.js'

const blockPaths = new WeakMap<object, Path>()

const PATH_PROBE = { _tag: 'foldkit/test/PathProbe' }

/** @internal The path of the Block instance whose update returned a Command. */
export const commandBlockPath = (command: AnyCommand): Path => {
  const probe = Array.reduce(
    command.messageMappers ?? [],
    PATH_PROBE,
    (message: unknown, mapper) => mapper(message),
  )
  return isBlockMessage(probe) ? probe.path : []
}

const isSamePath = Array.makeEquivalence<string>(
  (left, right) => left === right,
)

/** @internal Narrows a Command matcher to the instance at `path`. */
export const atBlockPath = <const Matcher extends CommandMatcher>(
  path: string | Path,
  matcher: Matcher,
): Matcher => {
  const scoped: Matcher = Object.create(matcher)
  copyIdentity(matcher, scoped)
  blockPaths.set(scoped, Predicate.isString(path) ? [path] : path)
  return scoped
}

/** @internal The instance path a matcher was narrowed to, if any. */
export const matcherBlockPath = (matcher: object): Path | undefined =>
  blockPaths.get(matcher)

const matchesBlockPath = (matcher: object, command: AnyCommand): boolean => {
  const expected = blockPaths.get(matcher)
  return (
    expected === undefined || isSamePath(commandBlockPath(command), expected)
  )
}

/** @internal Distinguishes matchers that select different instance paths. */
export const matcherPathFingerprint = (matcher: object): string => {
  const blockPath = blockPaths.get(matcher)
  return blockPath === undefined ? '' : JSON.stringify(blockPath)
}

const isCommandDefinitionMatcher = (
  matcher: CommandMatcher,
): matcher is CommandMatcher &
  Readonly<Record<typeof CommandDefinitionTypeId, unknown>> =>
  Predicate.hasProperty(matcher, CommandDefinitionTypeId)

/** @internal Whether a matcher and an invocation come from the same definition. */
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
        (invocationName(operation) ?? operation.name)
    )
  }

  return matcher.name === operation.name
}

/** @internal Whether a Command matches a definition or instance matcher. */
export const commandMatches = (
  matcher: CommandMatcher,
  command: AnyCommand,
): boolean =>
  sameOperation(matcher, command) &&
  matchesBlockPath(matcher, command) &&
  (isCommandDefinitionMatcher(matcher) ||
    matcher.args === undefined ||
    Equal.equals(matcher.args, command.args))

/** @internal Reads a pending Command's args when it comes from `definition`. */
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
