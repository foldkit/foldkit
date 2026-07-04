import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression'

const isMemberExpression = (node: unknown): node is ESTree.MemberExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'MemberExpression'

const isIdentifierNamed = (
  node: unknown,
  name: string,
): node is Readonly<{ type: 'Identifier'; name: string }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Identifier' &&
  'name' in node &&
  node.name === name

const isObjectExpression = (node: unknown): node is ESTree.ObjectExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ObjectExpression'

const isArrowFunction = (
  node: unknown,
): node is ESTree.ArrowFunctionExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrowFunctionExpression'

const isArrayExpression = (node: unknown): node is ESTree.ArrayExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrayExpression'

// `Option.match` called with the data-first `(x, { onNone, onSome })` shape.
const isOptionMatchCall = (node: ESTree.CallExpression): boolean =>
  isMemberExpression(node.callee) &&
  !node.callee.computed &&
  isIdentifierNamed(node.callee.object, 'Option') &&
  isIdentifierNamed(node.callee.property, 'match')

const arrowBodyArray = (
  node: unknown,
): ESTree.ArrayExpression | undefined => {
  if (!isArrowFunction(node) || !isArrayExpression(node.body)) {
    return undefined
  }
  return node.body
}

// `() => []`
const isEmptyArrayArrow = (node: unknown): boolean => {
  const body = arrowBodyArray(node)
  return body !== undefined && body.elements.length === 0
}

// `(p) => [p]` — a single element that is exactly the arrow's own parameter.
const isSingletonOfParamArrow = (node: unknown): boolean => {
  if (!isArrowFunction(node)) {
    return false
  }
  const [param] = node.params
  if (
    typeof param !== 'object' ||
    param === null ||
    !('type' in param) ||
    param.type !== 'Identifier' ||
    !('name' in param)
  ) {
    return false
  }
  const body = arrowBodyArray(node)
  if (body === undefined || body.elements.length !== 1) {
    return false
  }
  const [element] = body.elements
  return isIdentifierNamed(element, param.name)
}

const propertyValueForKey = (
  object: ESTree.ObjectExpression,
  key: string,
): unknown => {
  for (const property of object.properties) {
    if (
      property.type === 'Property' &&
      property.computed !== true &&
      isIdentifierNamed(property.key, key)
    ) {
      return property.value
    }
  }
  return undefined
}

const PREFER_FROMOPTION_MESSAGE =
  'Building a zero-or-one Command list with Option.match ({ onNone: () => [], onSome: (c) => [c] }) is a hand-rolled Array.fromOption. Use Array.fromOption(maybeCommand) so the empty vs single-element list is one canonical call.'

/**
 * Suggests Array.fromOption over the hand-written Option.match that returns
 * [] for None and [command] for Some — the exact shape Array.fromOption
 * already expresses.
 */
export const preferArrayFromoptionForOptionalCommand = Rule.define({
  name: 'prefer-array-fromoption-for-optional-command',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Use Array.fromOption to build a zero-or-one Command list instead of a hand-written Option.match.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !isOptionMatchCall(node)) {
          return Effect.void
        }
        const [, options] = node.arguments
        if (!isObjectExpression(options)) {
          return Effect.void
        }
        const onNone = propertyValueForKey(options, 'onNone')
        const onSome = propertyValueForKey(options, 'onSome')
        if (!isEmptyArrayArrow(onNone) || !isSingletonOfParamArrow(onSome)) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({ node, message: PREFER_FROMOPTION_MESSAGE }),
        )
      },
    }
  },
})
