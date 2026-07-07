import { Array, Effect } from 'effect'
import { AST, Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { calleeMatchesHelperName, isCallExpression } from '../guards.ts'

const isWithConstructorDefaultCall = (
  node: unknown,
): node is ESTree.CallExpression =>
  isCallExpression(node) &&
  calleeMatchesHelperName(node.callee, 'withConstructorDefault')

// NOTE: oxlint attaches an upward `parent` link to every node. The walk skips
// it (following the back-reference recurses forever), and a visited set guards
// against any other cycle.
const collectWithConstructorDefaultCalls = (
  node: unknown,
  visited: WeakSet<object>,
): ReadonlyArray<ESTree.CallExpression> => {
  if (typeof node !== 'object' || node === null || visited.has(node)) {
    return []
  }
  visited.add(node)
  if (Array.isArray(node)) {
    return node.flatMap(item =>
      collectWithConstructorDefaultCalls(item, visited),
    )
  }
  const here = isWithConstructorDefaultCall(node) ? [node] : []
  const nested = Object.entries(node).flatMap(([key, value]) =>
    key === 'parent' ? [] : collectWithConstructorDefaultCalls(value, visited),
  )
  return [...here, ...nested]
}

const CONSTRUCTOR_DEFAULT_MESSAGE =
  'Schema.withConstructorDefault on a Route.query field makes it optional in the constructor-input type that Route.mapTo encodes, so the Route.query plus Route.mapTo pipe stops typechecking. Drop the default and model the missing parameter with Option instead.'

/**
 * Forbids Schema.withConstructorDefault on Route.query fields. A constructor
 * default makes the field optional in the tagged struct's constructor-input
 * type, which Route.mapTo encodes, so it no longer matches the required field
 * Route.query parses and the Route.query plus Route.mapTo pipe stops
 * typechecking with an opaque error.
 */
export const noRouteQueryConstructorDefault = Rule.define({
  name: 'no-route-query-constructor-default',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Avoid Schema.withConstructorDefault on Route.query fields; it breaks Route.query plus Route.mapTo composition.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !AST.isCallOf(node, 'Route', 'query')) {
          return Effect.void
        }
        const offendingCalls = node.arguments.flatMap(argument =>
          collectWithConstructorDefaultCalls(argument, new WeakSet()),
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
