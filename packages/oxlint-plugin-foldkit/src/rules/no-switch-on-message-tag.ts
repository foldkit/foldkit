import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { isIdentifier, isMemberExpression, isStringLiteral } from '../guards.ts'

const isSwitchStatement = (node: unknown): node is ESTree.SwitchStatement =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'SwitchStatement'

const discriminatesOnTag = (
  member: Readonly<{ computed?: boolean; property: unknown }>,
): boolean =>
  member.computed
    ? isStringLiteral(member.property) && member.property.value === '_tag'
    : isIdentifier(member.property, '_tag')

const SWITCH_ON_TAG_MESSAGE =
  "Do not switch on a Message or state _tag. Use the tagged union's match helper for exhaustive dispatch, or Effect Match when the union has no matcher. Exhaustiveness turns a forgotten variant into a type error instead of a silent runtime fall-through."

/**
 * Forbids `switch (x._tag)` in favor of the tagged union's match helper or
 * Effect Match, whose exhaustiveness check turns a forgotten Message or state
 * variant into a compile error instead of a silent runtime fall-through.
 */
export const noSwitchOnMessageTag = Rule.define({
  name: 'no-switch-on-message-tag',
  meta: Rule.meta({
    type: 'problem',
    description:
      "Dispatch on tagged Messages and state with the union's match helper or Effect Match instead of switching on _tag.",
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
