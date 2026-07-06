import { Effect } from 'effect'
import { AST, Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  firstStringArgument,
  isCallExpression,
  isIdentifier,
  isVariableDeclarator,
} from '../guards.ts'

const innerCommandDefineCall = (
  node: ESTree.Node,
): ESTree.CallExpression | undefined => {
  if (!isCallExpression(node)) return undefined
  const callee = node.callee
  if (!isCallExpression(callee)) return undefined
  if (!AST.isCallOf(callee, 'Command', 'define')) return undefined
  return callee
}

/**
 * Requires a variable bound to Command.define to share the name passed to
 * Command.define.
 */
export const commandBindingMatchesName = Rule.define({
  name: 'command-binding-matches-name',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep a Command binding name in sync with the name passed to Command.define.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      VariableDeclarator: (node: ESTree.Node) => {
        if (!isVariableDeclarator(node)) return Effect.void
        const init = node.init
        if (init === null || init === undefined) return Effect.void
        const innerCall = innerCommandDefineCall(init)
        if (innerCall === undefined) return Effect.void
        const nameArgument = firstStringArgument(innerCall)
        if (
          nameArgument === undefined ||
          !isIdentifier(node.id) ||
          node.id.name === nameArgument.value
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node: node.id,
            message: `Command binding "${node.id.name}" does not match its Command.define name "${nameArgument.value}".`,
          }),
        )
      },
    }
  },
})
