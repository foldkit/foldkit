import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

// Foldkit navigation/DOM primitives whose Effects have no error channel.
const INFALLIBLE_NAV_PRIMITIVES: ReadonlyArray<string> = [
  'pushUrl',
  'replaceUrl',
  'load',
  'back',
  'forward',
  'openUrl',
]

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

// `X.pipe` written with a dot (not `X['pipe']`).
const isPipeCallee = (node: unknown): node is ESTree.MemberExpression =>
  isMemberExpression(node) &&
  !node.computed &&
  isIdentifierNamed(node.property, 'pipe')

// A call to one of the infallible primitives, e.g. `pushUrl(route())`.
const isInfallibleNavCall = (node: unknown): boolean =>
  isCallExpression(node) &&
  typeof node.callee === 'object' &&
  node.callee !== null &&
  'type' in node.callee &&
  node.callee.type === 'Identifier' &&
  'name' in node.callee &&
  INFALLIBLE_NAV_PRIMITIVES.includes(node.callee.name)

// The bare `Effect.ignore` member (data-first pipe combinator).
const isEffectIgnore = (node: unknown): boolean =>
  isMemberExpression(node) &&
  !node.computed &&
  isIdentifierNamed(node.object, 'Effect') &&
  isIdentifierNamed(node.property, 'ignore')

const IGNORE_ON_INFALLIBLE_MESSAGE =
  'Effect.ignore on a Foldkit navigation primitive is dead ceremony: pushUrl/replaceUrl/load/back/forward have no error channel, so there is nothing to ignore. Drop Effect.ignore and pipe straight to Effect.as with your Completed* Message.'

/**
 * Forbids wrapping an infallible Foldkit navigation primitive
 * (pushUrl, replaceUrl, load, back, forward, openUrl) in Effect.ignore.
 * These Effects carry no error channel, so the suppression is dead ceremony.
 */
export const noEffectIgnoreOnInfallibleCommand = Rule.define({
  name: 'no-effect-ignore-on-infallible-command',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Do not pipe an infallible Foldkit navigation primitive through Effect.ignore; it has no error channel.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !isPipeCallee(node.callee)) {
          return Effect.void
        }
        if (!isInfallibleNavCall(node.callee.object)) {
          return Effect.void
        }
        if (!node.arguments.some(isEffectIgnore)) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({ node, message: IGNORE_ON_INFALLIBLE_MESSAGE }),
        )
      },
    }
  },
})
