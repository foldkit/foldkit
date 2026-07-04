import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

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

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression'

const isArrayExpression = (node: unknown): node is ESTree.ArrayExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrayExpression'

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

const missingAltMessage =
  'This `img` has no `Alt(...)` attribute. Screen readers announce the raw file name (or nothing) in its place. Add `Alt(text)` describing the image, or `Alt("")` to mark it purely decorative.'

// RULE

/**
 * Requires every img call with a statically visible attribute array to carry an
 * Alt(...) attribute, so screen readers have text to announce instead of the
 * raw source URL.
 */
export const requireAltOnImage = Rule.define({
  name: 'require-alt-on-image',
  meta: Rule.meta({
    type: 'problem',
    description: 'Require an Alt(...) attribute on every img element.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (
          !isCallExpression(node) ||
          !calleeMatchesHelperName(node.callee, 'img')
        ) {
          return Effect.void
        }
        const [attributesArgument] = node.arguments
        if (!isArrayExpression(attributesArgument)) {
          return Effect.void
        }
        const hasAltAttribute = attributesArgument.elements.some(
          element =>
            isCallExpression(element) &&
            calleeMatchesHelperName(element.callee, 'Alt'),
        )
        if (hasAltAttribute) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({ node, message: missingAltMessage }),
        )
      },
    }
  },
})
