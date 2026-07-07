import { Array, Effect, Option } from 'effect'
import { AST, Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { isArrayExpression } from '../guards.ts'

const DUPLICATE_ON_MOUNT_MESSAGE =
  'Only one OnMount attribute can attach to an element. Foldkit installs a single insert hook and tracks a single Mount fiber per element, so a later OnMount replaces the earlier one and its factory never runs. Combine the behaviors into one Mount definition.'

const isOnMountCallee = (callee: ESTree.Expression): boolean => {
  if (callee.type === 'Identifier') {
    return callee.name === 'OnMount'
  }
  if (callee.type === 'MemberExpression') {
    return Option.match(AST.memberPath(callee), {
      onNone: () => false,
      onSome: path => Array.lastNonEmpty(path) === 'OnMount',
    })
  }
  return false
}

const isOnMountCall = (element: ESTree.ArrayExpressionElement): boolean =>
  element !== null &&
  element.type === 'CallExpression' &&
  isOnMountCallee(element.callee)

/** Flags array literals carrying two or more top-level OnMount attributes. Foldkit installs a single insert hook and tracks a single Mount fiber per element, so a later OnMount silently replaces the earlier one. */
export const noDuplicateOnmountPerElement = Rule.define({
  name: 'no-duplicate-onmount-per-element',
  meta: Rule.meta({
    type: 'problem',
    description: 'Attach at most one OnMount attribute per element.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      ArrayExpression: (node: ESTree.Node) => {
        if (!isArrayExpression(node)) return Effect.void
        const onMountCallCount = node.elements.filter(isOnMountCall).length
        if (onMountCallCount <= 1) return Effect.void
        return ctx.report(
          Diagnostic.make({ node, message: DUPLICATE_ON_MOUNT_MESSAGE }),
        )
      },
    }
  },
})
