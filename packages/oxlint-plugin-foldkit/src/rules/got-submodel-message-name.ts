import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { firstStringArgument, isCallExpression } from '../guards.ts'
import { hasMessagePayloadProperty, isMCall } from '../message.ts'

/**
 * Requires m() Messages that carry a { message } payload to follow the
 * Got*Message naming convention.
 */
export const gotSubmodelMessageName = Rule.define({
  name: 'got-submodel-message-name',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Name Foldkit Submodel wrapper Messages with the Got*Message convention.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (
          !isCallExpression(node) ||
          !isMCall(node) ||
          !hasMessagePayloadProperty(node)
        ) {
          return Effect.void
        }
        const messageName = firstStringArgument(node)
        if (
          messageName === undefined ||
          /^Got[A-Z].*Message$/.test(messageName.value)
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node: messageName,
            message:
              'Submodel wrapper Messages should be named Got*Message so Foldkit DevTools can filter them.',
          }),
        )
      },
    }
  },
})
