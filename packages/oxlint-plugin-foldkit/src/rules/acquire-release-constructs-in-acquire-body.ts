import { Effect, Option } from 'effect'
import {
  AST,
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import {
  indexReferences,
  isArrowFunction,
  isCallExpression,
  isIdentifier,
  resolveImportedPath,
} from '../guards.ts'

const isEffectCall = (
  node: unknown,
  memberName: string,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): node is ESTree.CallExpression => {
  if (!isCallExpression(node)) {
    return false
  }
  if (references === undefined) {
    return AST.isCallOf(node, 'Effect', memberName)
  }
  return Option.exists(resolveImportedPath(references, node.callee), path => {
    if (path.source === 'effect') {
      const [namespace, member, extraMember] = path.members
      return (
        namespace === 'Effect' &&
        member === memberName &&
        extraMember === undefined
      )
    }
    const [member, extraMember] = path.members
    return (
      path.source === 'effect/Effect' &&
      member === memberName &&
      extraMember === undefined
    )
  })
}

const isSyncReturningIdentifier = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (!isEffectCall(node, 'sync', references)) {
    return false
  }
  const [thunk] = node.arguments
  return isArrowFunction(thunk) && isIdentifier(thunk.body)
}

const isEagerSucceed = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => isEffectCall(node, 'succeed', references)

const ACQUIRE_CAPTURED_HANDLE_MESSAGE =
  'Effect.acquireRelease must construct its resource inside the acquire Effect, not return an eagerly created or captured handle. An interruption between construction and acquire leaks the handle. Build it in place with Effect.sync or another lazy Effect so acquire owns the whole lifetime.'

/**
 * Requires the acquire Effect of Effect.acquireRelease to construct its
 * resource in place. Flags an acquire that merely returns a pre-existing
 * identifier or uses eager Effect.succeed, which leaks the handle if
 * interruption strikes between construction and acquire.
 */
export const acquireReleaseConstructsInAcquireBody = Rule.define({
  name: 'acquire-release-constructs-in-acquire-body',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Construct resources lazily inside the Effect.acquireRelease acquire Effect instead of returning eager or captured handles.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)

    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isEffectCall(node, 'acquireRelease', references)) {
          return Effect.void
        }
        const [acquire] = node.arguments
        if (
          !isSyncReturningIdentifier(acquire, references) &&
          !isEagerSucceed(acquire, references)
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({ node, message: ACQUIRE_CAPTURED_HANDLE_MESSAGE }),
        )
      },
    }
  },
})
