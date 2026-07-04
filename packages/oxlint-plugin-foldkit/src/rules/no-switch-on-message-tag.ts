import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

const isSwitchStatement = (node: unknown): node is ESTree.SwitchStatement =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'SwitchStatement'

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

const isTagStringLiteral = (node: unknown): boolean =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Literal' &&
  'value' in node &&
  node.value === '_tag'

// A discriminant reads a `._tag`, whether written `x._tag` or `x['_tag']`.
const discriminatesOnTag = (node: ESTree.MemberExpression): boolean =>
  node.computed
    ? isTagStringLiteral(node.property)
    : isIdentifierNamed(node.property, '_tag')

const SWITCH_ON_TAG_MESSAGE =
  'Do not switch on a Message/state _tag. A switch gives no exhaustiveness guarantee, so a new variant silently falls through. Dispatch with M.tagsExhaustive (Effect Match) so a missing case is a type error.'

/**
 * Forbids `switch (x._tag)` in favor of `M.tagsExhaustive`, whose exhaustiveness
 * check turns a forgotten Message/state variant into a compile error instead of
 * a silent runtime fall-through.
 */
export const noSwitchOnMessageTag = Rule.define({
  name: 'no-switch-on-message-tag',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Dispatch on tagged Messages/state with M.tagsExhaustive instead of a switch on _tag.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      SwitchStatement: (node: ESTree.Node) => {
        if (!isSwitchStatement(node)) {
          return Effect.void
        }
        const discriminant = node.discriminant
        if (
          !isMemberExpression(discriminant) ||
          !discriminatesOnTag(discriminant)
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({ node, message: SWITCH_ON_TAG_MESSAGE }),
        )
      },
    }
  },
})
