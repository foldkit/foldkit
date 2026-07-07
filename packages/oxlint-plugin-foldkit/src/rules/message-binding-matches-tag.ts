import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  firstStringArgument,
  isCallExpression,
  isIdentifier,
  isVariableDeclarator,
} from '../guards.ts'
import { isMCall } from '../message.ts'

/**
 * Requires a variable bound to an m() Message to share the name of the tag
 * passed to m().
 */
export const messageBindingMatchesTag = Rule.define({
  name: 'message-binding-matches-tag',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep a Message binding name in sync with the tag passed to m().',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      VariableDeclarator: (node: ESTree.Node) => {
        if (!isVariableDeclarator(node)) return Effect.void
        const init = node.init
        if (
          init === null ||
          init === undefined ||
          !isCallExpression(init) ||
          !isMCall(init)
        ) {
          return Effect.void
        }
        const messageName = firstStringArgument(init)
        if (
          messageName === undefined ||
          !isIdentifier(node.id) ||
          node.id.name === messageName.value
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node: node.id,
            message: `Message binding "${node.id.name}" does not match its m() tag "${messageName.value}".`,
          }),
        )
      },
    }
  },
})
