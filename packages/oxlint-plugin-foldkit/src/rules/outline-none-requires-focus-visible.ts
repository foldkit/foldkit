import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

// `outline-none` as a whole token (not part of a larger Tailwind class).
const OUTLINE_NONE_TOKEN = /(?:^|\s)outline-none(?:\s|$)/
const FOCUS_VISIBLE_TOKEN = 'focus-visible:'

// GUARDS

const isIdentifier = (
  node: unknown,
  name?: string,
): node is Readonly<{ type: 'Identifier'; name: string }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Identifier' &&
  'name' in node &&
  typeof node.name === 'string' &&
  (name === undefined || node.name === name)

const isStringLiteral = (node: unknown): node is ESTree.StringLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Literal' &&
  'value' in node &&
  typeof node.value === 'string'

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression'

const isMemberExpression = (
  node: unknown,
): node is Readonly<{
  type: 'MemberExpression'
  object: unknown
  property: unknown
  computed?: boolean
}> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'MemberExpression'

const calleeMatchesHelperName = (
  callee: unknown,
  helperName: string,
): boolean =>
  isIdentifier(callee, helperName) ||
  (isMemberExpression(callee) &&
    !callee.computed &&
    isIdentifier(callee.property, helperName))

const missingFocusVisibleMessage =
  'This `Class` removes the native focus ring with `outline-none` but adds no `focus-visible:` style, so keyboard users see no focus indicator. Pair `outline-none` with a `focus-visible:` treatment such as `focus-visible:ring-2`.'

// RULE

/**
 * Requires any Class(...) string that removes the outline with the outline-none
 * token to also carry a focus-visible: token, so keyboard focus stays visible.
 */
export const outlineNoneRequiresFocusVisible = Rule.define({
  name: 'outline-none-requires-focus-visible',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Pair outline-none with a focus-visible: style so keyboard focus stays visible.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (
          !isCallExpression(node) ||
          !calleeMatchesHelperName(node.callee, 'Class')
        ) {
          return Effect.void
        }
        const [firstArgument] = node.arguments
        if (!isStringLiteral(firstArgument)) {
          return Effect.void
        }
        const classValue = firstArgument.value
        if (
          !OUTLINE_NONE_TOKEN.test(classValue) ||
          classValue.includes(FOCUS_VISIBLE_TOKEN)
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({ node, message: missingFocusVisibleMessage }),
        )
      },
    }
  },
})
