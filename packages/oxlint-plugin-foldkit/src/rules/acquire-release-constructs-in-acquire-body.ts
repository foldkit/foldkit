import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression'

const isMemberExpression = (node: unknown): node is ESTree.MemberExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'MemberExpression'

const isIdentifierNamed = (
  node: unknown,
  name: string,
): node is Readonly<{ type: 'Identifier'; name: string }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Identifier' &&
  'name' in node &&
  node.name === name

const isIdentifier = (
  node: unknown,
): node is Readonly<{ type: 'Identifier'; name: string }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Identifier'

// A call `Effect.<method>(...)`, e.g. `Effect.acquireRelease(...)`.
const isEffectMethodCall = (node: unknown, method: string): boolean =>
  isCallExpression(node) &&
  isMemberExpression(node.callee) &&
  !node.callee.computed &&
  isIdentifierNamed(node.callee.object, 'Effect') &&
  isIdentifierNamed(node.callee.property, method)

const isArrowFunction = (
  node: unknown,
): node is ESTree.ArrowFunctionExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrowFunctionExpression'

// `Effect.sync(() => <Identifier>)` — a thunk that returns a bare binding.
const isSyncReturningIdentifier = (node: unknown): boolean => {
  if (!isEffectMethodCall(node, 'sync') || !isCallExpression(node)) {
    return false
  }
  const [thunk] = node.arguments
  return isArrowFunction(thunk) && isIdentifier(thunk.body)
}

// `Effect.succeed(<Identifier>)` — a pre-existing handle lifted as-is.
const isSucceedOfIdentifier = (node: unknown): boolean => {
  if (!isEffectMethodCall(node, 'succeed') || !isCallExpression(node)) {
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
          !isEffectMethodCall(node, 'acquireRelease')
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
