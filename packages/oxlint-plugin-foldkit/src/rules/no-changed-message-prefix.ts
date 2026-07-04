import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

const CHANGED_TAG = /^Changed([A-Z]|$)/
const CHANGED_PREFIX = 'Changed'

const ALLOWED_CHANGED_TAGS: ReadonlyArray<string> = [
  'ChangedRoute',
  'ChangedUrl',
]

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression'

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

const isStringLiteral = (node: unknown): node is ESTree.StringLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Literal' &&
  'value' in node &&
  typeof node.value === 'string'

const vagueChangedMessage = (tag: string): string => {
  const rest = tag.slice(CHANGED_PREFIX.length)
  return `Message tag ${tag} uses Changed, the vaguest verb available. Name what actually happened: Updated* for edited values (Updated${rest}), Selected* or Switched* for discrete choices, Toggled* for binary flips.`
}

/**
 * Forbids Message tags with the Changed* prefix in favor of a more precise
 * verb, exempting the router boundary events ChangedRoute and ChangedUrl.
 */
export const noChangedMessagePrefix = Rule.define({
  name: 'no-changed-message-prefix',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Name Messages with a precise verb like Updated*, Selected*, Switched*, or Toggled* instead of Changed*.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !isIdentifierNamed(node.callee, 'm')) {
          return Effect.void
        }
        const [firstArgument] = node.arguments
        if (!isStringLiteral(firstArgument)) {
          return Effect.void
        }
        const tag = firstArgument.value
        if (!CHANGED_TAG.test(tag) || ALLOWED_CHANGED_TAGS.includes(tag)) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({ node, message: vagueChangedMessage(tag) }),
        )
      },
    }
  },
})
