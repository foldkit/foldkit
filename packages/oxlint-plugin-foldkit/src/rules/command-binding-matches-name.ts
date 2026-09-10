import { Effect, Option } from 'effect'
import {
  AST,
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import {
  firstStringArgument,
  indexReferences,
  isCallExpression,
  isIdentifier,
  isVariableDeclarator,
  resolveFoldkitApiPath,
} from '../guards.ts'

const isCommandDefineCall = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references === undefined) {
    return AST.isCallOf(node, 'Command', 'define')
  }

  return Option.exists(resolveFoldkitApiPath(references, node.callee), path => {
    const [namespace, methodName, extraMember] = path

    return (
      namespace === 'Command' &&
      methodName === 'define' &&
      extraMember === undefined
    )
  })
}

const innerCommandDefineCall = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ESTree.CallExpression | undefined => {
  if (!isCallExpression(node)) return undefined
  if (isCommandDefineCall(node, references)) {
    return node
  }
  const callee = node.callee
  if (!isCallExpression(callee)) return undefined
  if (!isCommandDefineCall(callee, references)) return undefined
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
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    return {
      VariableDeclarator: (node: ESTree.Node) => {
        if (!isVariableDeclarator(node)) return Effect.void
        const init = node.init
        if (init === null || init === undefined) return Effect.void
        const innerCall = innerCommandDefineCall(init, references)
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
