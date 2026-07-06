import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  isCallExpression,
  isIdentifier,
  isObjectExpression,
} from '../guards.ts'

/**
 * Flags calling a no-field Message constructor with an empty object literal
 * instead of no arguments.
 */
export const noEmptyObjectTaggedCall = Rule.define({
  name: 'no-empty-object-tagged-call',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Call no-field Message constructors with no arguments instead of an empty object.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !isIdentifier(node.callee)) {
          return Effect.void
        }
        if (
          !/^[A-Z][A-Za-z0-9]*$/.test(node.callee.name) ||
          node.arguments.length !== 1
        ) {
          return Effect.void
        }
        const [argument] = node.arguments
        if (!isObjectExpression(argument) || argument.properties.length > 0) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node,
            message: `Call no-field Message constructors as ${node.callee.name}() instead of ${node.callee.name}({}).`,
          }),
        )
      },
    }
  },
})
