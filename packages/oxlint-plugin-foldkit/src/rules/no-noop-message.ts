import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { firstStringArgument, isCallExpression } from '../guards.ts'
import { isMCall } from '../message.ts'

/**
 * Flags generic NoOp Messages (NoOp, Noop, NoOperation) passed to m(), steering
 * toward Messages that describe what happened.
 */
export const noNoopMessage = Rule.define({
  name: 'no-noop-message',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Use meaningful Foldkit Messages instead of generic NoOp Messages.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !isMCall(node)) return Effect.void
        const messageName = firstStringArgument(node)
        if (
          messageName === undefined ||
          !['NoOp', 'Noop', 'NoOperation'].includes(messageName.value)
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node: messageName,
            message:
              'Every Foldkit Message should describe what happened; avoid generic NoOp Messages.',
          }),
        )
      },
    }
  },
})
