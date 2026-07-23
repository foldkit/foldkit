import { Effect } from 'effect'
import { AST, Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { isArrowFunction, isCallExpression, isIdentifier } from '../guards.ts'

const isSyncReturningIdentifier = (node: unknown): boolean => {
  if (!isCallExpression(node) || !AST.isCallOf(node, 'Effect', 'sync')) {
    return false
  }
  const [thunk] = node.arguments
  return isArrowFunction(thunk) && isIdentifier(thunk.body)
}

const isSucceedOfIdentifier = (node: unknown): boolean => {
  if (!isCallExpression(node) || !AST.isCallOf(node, 'Effect', 'succeed')) {
    return false
  }
  const [argument] = node.arguments
  return isIdentifier(argument)
}

const ACQUIRE_CAPTURED_HANDLE_MESSAGE =
  'Effect.acquireRelease must construct its resource inside the acquire Effect, not return a handle captured from an outer binding. An interruption between construction and acquire leaks the handle. Build it in place (Effect.sync(() => new Socket(...)) or a factory call) so acquire owns the whole lifetime.'

/**
 * Requires the acquire Effect of Effect.acquireRelease to construct its
 * resource in place. Flags an acquire that merely returns a pre-existing
 * identifier (Effect.sync(() => handle) or Effect.succeed(handle)), which
 * leaks the handle if interruption strikes between construction and acquire.
 */
export const acquireReleaseConstructsInAcquireBody = Rule.define({
  name: 'acquire-release-constructs-in-acquire-body',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Construct the resource inside the Effect.acquireRelease acquire Effect instead of returning a captured handle.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (
          !isCallExpression(node) ||
          !AST.isCallOf(node, 'Effect', 'acquireRelease')
        ) {
          return Effect.void
        }
        const [acquire] = node.arguments
        if (
          !isSyncReturningIdentifier(acquire) &&
          !isSucceedOfIdentifier(acquire)
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
