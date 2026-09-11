import { Array, Effect, Option } from 'effect'
import {
  AST,
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import {
  calleeMatchesHelperName,
  indexReferences,
  isCallExpression,
  resolveFoldkitApiPath,
  resolveImportedPath,
} from '../guards.ts'

const isRouteQueryCall = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean =>
  references === undefined
    ? AST.isCallOf(node, 'Route', 'query')
    : Option.exists(resolveFoldkitApiPath(references, node.callee), path => {
        const [namespace, member, extraMember] = path
        return (
          namespace === 'Route' &&
          member === 'query' &&
          extraMember === undefined
        )
      })

const isWithConstructorDefaultCall = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): node is ESTree.CallExpression => {
  if (!isCallExpression(node)) {
    return false
  }
  if (references === undefined) {
    return calleeMatchesHelperName(node.callee, 'withConstructorDefault')
  }
  return Option.exists(resolveImportedPath(references, node.callee), path => {
    if (path.source === 'effect') {
      const [namespace, member, extraMember] = path.members
      return (
        namespace === 'Schema' &&
        member === 'withConstructorDefault' &&
        extraMember === undefined
      )
    }
    const [member, extraMember] = path.members
    return (
      path.source === 'effect/Schema' &&
      member === 'withConstructorDefault' &&
      extraMember === undefined
    )
  })
}

// NOTE: Oxlint attaches an upward parent link to every node. The walk skips it
// because following that back-reference would recurse forever.
const collectWithConstructorDefaultCalls = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  visited: WeakSet<object>,
): ReadonlyArray<ESTree.CallExpression> => {
  if (typeof node !== 'object' || node === null || visited.has(node)) {
    return []
  }

  visited.add(node)
  if (Array.isArray(node)) {
    return node.flatMap(item =>
      collectWithConstructorDefaultCalls(item, references, visited),
    )
  }
  const here = isWithConstructorDefaultCall(node, references) ? [node] : []
  const nested = Object.entries(node).flatMap(([key, value]) =>
    key === 'parent'
      ? []
      : collectWithConstructorDefaultCalls(value, references, visited),
  )
  return [...here, ...nested]
}

const CONSTRUCTOR_DEFAULT_MESSAGE =
  'Schema.withConstructorDefault has no effect on Route.query parsing. Constructor defaults run only during Schema construction, while Route.query decodes and encodes. Use Schema.withDecodingDefaultKey for a real decoding default or Schema.OptionFromOptional for absence.'

/**
 * Forbids Schema.withConstructorDefault on Route.query fields. Constructor
 * defaults run only during Schema construction, while Route.query decodes and
 * encodes, so the annotation has no effect on a missing query parameter.
 */
export const noRouteQueryConstructorDefault = Rule.define({
  name: 'no-route-query-constructor-default',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Avoid Schema.withConstructorDefault on Route.query fields because it has no effect on parsing.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)

    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !isRouteQueryCall(node, references)) {
          return Effect.void
        }
        const offendingCalls = node.arguments.flatMap(argument =>
          collectWithConstructorDefaultCalls(
            argument,
            references,
            new WeakSet(),
          ),
        )
        return Effect.forEach(
          offendingCalls,
          offendingCall =>
            ctx.report(
              Diagnostic.make({
                node: offendingCall,
                message: CONSTRUCTOR_DEFAULT_MESSAGE,
              }),
            ),
          { discard: true },
        )
      },
    }
  },
})
