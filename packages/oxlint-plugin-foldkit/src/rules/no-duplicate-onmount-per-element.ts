import { Effect } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import {
  indexReferences,
  isArrayExpression,
  isFoldkitHtmlBuilderMember,
} from '../guards.ts'

const DUPLICATE_ON_MOUNT_MESSAGE =
  'Only one OnMount attribute can attach to an element. Foldkit installs a single insert hook and tracks a single Mount fiber per element, so a later OnMount replaces the earlier one and its `execute` never runs. Combine the behaviors into one Mount definition.'

const isOnMountCallee = (
  callee: ESTree.Expression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => isFoldkitHtmlBuilderMember(callee, 'OnMount', references)

const isOnMountCall = (
  element: ESTree.ArrayExpressionElement,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean =>
  element !== null &&
  element.type === 'CallExpression' &&
  isOnMountCallee(element.callee, references)

/** Flags array literals carrying two or more top-level OnMount attributes. Foldkit installs a single insert hook and tracks a single Mount fiber per element, so a later OnMount silently replaces the earlier one. */
export const noDuplicateOnmountPerElement = Rule.define({
  name: 'no-duplicate-onmount-per-element',
  meta: Rule.meta({
    type: 'problem',
    description: 'Attach at most one OnMount attribute per element.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    return {
      ArrayExpression: (node: ESTree.Node) => {
        if (!isArrayExpression(node)) return Effect.void
        const onMountCallCount = node.elements.filter(element =>
          isOnMountCall(element, references),
        ).length
        if (onMountCallCount <= 1) return Effect.void
        return ctx.report(
          Diagnostic.make({ node, message: DUPLICATE_ON_MOUNT_MESSAGE }),
        )
      },
    }
  },
})
