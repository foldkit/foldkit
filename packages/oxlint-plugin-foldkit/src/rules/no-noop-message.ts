import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { indexReferences, isCallExpression } from '../guards.ts'
import { messageCases, recordFoldkitMessageUnionBindings } from '../message.ts'

/**
 * Flags generic NoOp Messages (NoOp, Noop, NoOperation) declared with
 * `defineMessageUnion`, steering toward Messages that describe what happened.
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
            ['NoOp', 'Noop', 'NoOperation'].includes(messageCase.name)
              ? ctx.report(
                  Diagnostic.make({
                    node: messageCase.nameNode,
                    message:
                      'Every Foldkit Message should describe what happened; avoid generic NoOp Messages.',
                  }),
                )
              : Effect.void,
          { discard: true },
        )
      },
    }
  },
})
