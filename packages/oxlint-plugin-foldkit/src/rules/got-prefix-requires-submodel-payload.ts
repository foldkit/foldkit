import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { firstStringArgument, isCallExpression } from '../guards.ts'
import { hasMessagePayloadProperty, isMCall } from '../message.ts'

/**
 * Requires Got-prefixed m() Messages to carry a { message: Child.Message }
 * Submodel payload.
 */
export const gotPrefixRequiresSubmodelPayload = Rule.define({
  name: 'got-prefix-requires-submodel-payload',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Reserve Got* Messages for Submodel wrappers with a { message: Child.Message } payload.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !isMCall(node)) return Effect.void
        const messageName = firstStringArgument(node)
        if (
          messageName === undefined ||
          !/^Got[A-Z]/.test(messageName.value) ||
          hasMessagePayloadProperty(node)
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node: messageName,
            message:
              'Got* is reserved for Submodel wrappers. Add a { message: Child.Message } payload or choose a Message name that does not start with Got.',
          }),
        )
      },
    }
  },
})
