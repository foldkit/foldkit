import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { indexReferences, isCallExpression } from '../guards.ts'
import {
  hasSubmodelMessagePayload,
  messageCases,
  recordFoldkitMessageUnionBindings,
} from '../message.ts'

/**
 * Requires Messages that carry a { message } payload to follow the Got*Message
 * naming convention.
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
            hasSubmodelMessagePayload(messageCase.fields, references) &&
            !/^Got[A-Z].*Message$/.test(messageCase.name)
              ? ctx.report(
                  Diagnostic.make({
                    node: messageCase.nameNode,
                    message:
                      'Submodel wrapper Messages should be named Got*Message so Foldkit DevTools can filter them.',
                  }),
                )
              : Effect.void,
          { discard: true },
        )
      },
    }
  },
})
