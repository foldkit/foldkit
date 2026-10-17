import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { indexReferences, isCallExpression } from '../guards.ts'
import {
  hasBlockMessagePayload,
  messageCases,
  recordFoldkitMessageUnionBindings,
} from '../message.ts'

/**
 * Requires Got-prefixed Messages to carry a { message: Child.Message } Block
 * payload.
 */
export const gotPrefixRequiresBlockPayload = Rule.define({
  name: 'got-prefix-requires-block-payload',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Reserve Got* Messages for Block wrappers with a { message: Child.Message } payload.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    const messageUnionBindings = new Set<string>()
    return {
      Program: (node: ESTree.Node) => {
        recordFoldkitMessageUnionBindings(messageUnionBindings, node)
        return Effect.void
      },
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) return Effect.void

        return Effect.forEach(
          messageCases(node, messageUnionBindings, references),
          messageCase =>
            /^Got[A-Z]/.test(messageCase.name) &&
            !hasBlockMessagePayload(messageCase.fields, references)
              ? ctx.report(
                  Diagnostic.make({
                    node: messageCase.nameNode,
                    message:
                      'Got* is reserved for Block wrappers. Add a { message: Child.Message } payload or choose a Message name that does not start with Got.',
                  }),
                )
              : Effect.void,
          { discard: true },
        )
      },
    }
  },
})
