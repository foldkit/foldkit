import { Effect, Option } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  indexReferences,
  isUnshadowedReference,
  staticMemberName,
  staticPropertyName,
} from '../guards.ts'

const restrictedGlobalNames: ReadonlySet<string> = new Set([
  'alert',
  'cancelAnimationFrame',
  'cancelIdleCallback',
  'confirm',
  'customElements',
  'document',
  'getComputedStyle',
  'history',
  'IntersectionObserver',
  'localStorage',
  'location',
  'matchMedia',
  'MutationObserver',
  'navigator',
  'prompt',
  'requestAnimationFrame',
  'requestIdleCallback',
  'ResizeObserver',
  'screen',
  'sessionStorage',
  'window',
])

const isInsideTypeQuery = (node: ESTree.Node): boolean => {
  const parent = node.parent

  if (parent === null) {
    return false
  }
  if (parent.type === 'TSTypeQuery') {
    return true
  }
  if (parent.type === 'TSQualifiedName') {
    return isInsideTypeQuery(parent)
  }
  return false
}

const destructuringSource = (
  node: ESTree.ObjectPattern | ESTree.ObjectAssignmentTarget,
): ESTree.Expression | null | undefined => {
  const parent = node.parent

  if (parent.type === 'VariableDeclarator' && parent.id === node) {
    return parent.init
  }
  if (parent.type === 'AssignmentExpression' && parent.left === node) {
    return parent.right
  }
  return undefined
}

const destructuredGlobalThis = (
  node: ESTree.ObjectPattern | ESTree.ObjectAssignmentTarget,
): ESTree.IdentifierReference | undefined => {
  const source = destructuringSource(node)

  return source?.type === 'Identifier' && source.name === 'globalThis'
    ? source
    : undefined
}

const restrictedGlobalDiagnostic = (node: ESTree.Node, name: string) =>
  Diagnostic.make({
    node,
    message: `Global \`${name}\` is not portable across Foldkit server targets. Use a server API available everywhere you deploy or pass the value into the entry.`,
  })

/**
 * Flags selected browser-only globals in files that run on a server.
 */
export const noNonportableServerGlobals = Rule.define({
  name: 'no-nonportable-server-globals',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Avoid browser-only globals in files that run across Foldkit server targets.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const references = indexReferences(ctx.sourceCode.scopeManager.scopes)
    return {
      Identifier: (node: ESTree.Node) => {
        if (
          node.type !== 'Identifier' ||
          !restrictedGlobalNames.has(node.name) ||
          isInsideTypeQuery(node)
        ) {
          return Effect.void
        }
        return isUnshadowedReference(references, node)
          ? ctx.report(restrictedGlobalDiagnostic(node, node.name))
          : Effect.void
      },
      MemberExpression: (node: ESTree.Node) => {
        if (
          node.type !== 'MemberExpression' ||
          node.object.type !== 'Identifier' ||
          node.object.name !== 'globalThis'
        ) {
          return Effect.void
        }
        const maybeMemberName = staticMemberName(node)
        if (
          Option.isNone(maybeMemberName) ||
          !restrictedGlobalNames.has(maybeMemberName.value)
        ) {
          return Effect.void
        }
        return isUnshadowedReference(references, node.object)
          ? ctx.report(restrictedGlobalDiagnostic(node, maybeMemberName.value))
          : Effect.void
      },
      ObjectPattern: (node: ESTree.Node) => {
        if (node.type !== 'ObjectPattern') {
          return Effect.void
        }
        const source = destructuredGlobalThis(node)
        if (source === undefined) {
          return Effect.void
        }
        const restrictedProperties = node.properties.flatMap(property => {
          if (property.type !== 'Property') {
            return []
          }
          const maybeName = staticPropertyName(property)
          return Option.isSome(maybeName) &&
            restrictedGlobalNames.has(maybeName.value)
            ? [{ name: maybeName.value, property }]
            : []
        })
        return isUnshadowedReference(references, source)
          ? Effect.forEach(
              restrictedProperties,
              ({ name, property }) =>
                ctx.report(restrictedGlobalDiagnostic(property, name)),
              { discard: true },
            )
          : Effect.void
      },
    }
  },
})
