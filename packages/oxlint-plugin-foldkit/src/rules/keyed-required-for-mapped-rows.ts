import { Array, Effect, Option, pipe } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  calleeMatchesHelperName,
  helperCalleeName,
  isArrayExpression,
  isCallExpression,
  isIdentifier,
  isMemberExpression,
} from '../guards.ts'

const rowElementTagNames = ['li', 'div', 'tr', 'article', 'section']

const singleValueMapNamespaces = [
  'Option',
  'Effect',
  'Stream',
  'Result',
  'Either',
  'Exit',
  'Fiber',
  'STM',
  'Match',
]

// GUARDS

type ArrowCallback = Readonly<{
  type: 'ArrowFunctionExpression'
  params: ReadonlyArray<unknown>
  body: unknown
}>

const isArrowFunctionExpression = (node: unknown): node is ArrowCallback =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrowFunctionExpression'

const isBlockStatement = (
  node: unknown,
): node is Readonly<{ type: 'BlockStatement'; body: ReadonlyArray<unknown> }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'BlockStatement'

const isReturnStatement = (
  node: unknown,
): node is Readonly<{ type: 'ReturnStatement'; argument: unknown }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ReturnStatement'

const isObjectPattern = (
  node: unknown,
): node is Readonly<{
  type: 'ObjectPattern'
  properties: ReadonlyArray<unknown>
}> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ObjectPattern'

const isSingleValueMapCallee = (callee: unknown): boolean =>
  isMemberExpression(callee) &&
  !callee.computed &&
  isIdentifier(callee.property, 'map') &&
  isIdentifier(callee.object) &&
  singleValueMapNamespaces.includes(callee.object.name)

const arrowCallback = (
  node: ESTree.CallExpression,
): Option.Option<ArrowCallback> => {
  const [firstArgument, secondArgument] = node.arguments
  if (isArrowFunctionExpression(firstArgument)) {
    return Option.some(firstArgument)
  }
  if (isArrowFunctionExpression(secondArgument)) {
    return Option.some(secondArgument)
  }
  return Option.none()
}

const referencesIdOfParameter = (
  value: unknown,
  parameterName: string,
): boolean => {
  if (Array.isArray(value)) {
    return value.some(element =>
      referencesIdOfParameter(element, parameterName),
    )
  }
  if (typeof value !== 'object' || value === null) {
    return false
  }
  if (
    isMemberExpression(value) &&
    isIdentifier(value.object, parameterName) &&
    isIdentifier(value.property, 'id')
  ) {
    return true
  }
  const fieldEntries = Object.entries(value)
  return fieldEntries.some(
    ([fieldName, fieldValue]) =>
      fieldName !== 'parent' &&
      referencesIdOfParameter(fieldValue, parameterName),
  )
}

const destructuresId = (
  pattern: Readonly<{ properties: ReadonlyArray<unknown> }>,
): boolean =>
  pattern.properties.some(
    property =>
      typeof property === 'object' &&
      property !== null &&
      'key' in property &&
      isIdentifier(property.key, 'id'),
  )

const isIdentityBearing = (callback: ArrowCallback): boolean => {
  const [firstParameter] = callback.params
  if (isIdentifier(firstParameter)) {
    return referencesIdOfParameter(callback.body, firstParameter.name)
  }
  if (isObjectPattern(firstParameter)) {
    return destructuresId(firstParameter)
  }
  return false
}

const callbackReturnExpression = (
  callback: ArrowCallback,
): Option.Option<unknown> => {
  if (!isBlockStatement(callback.body)) {
    return Option.some(callback.body)
  }
  return pipe(
    callback.body.body,
    Array.findLast(isReturnStatement),
    Option.flatMap(returnStatement =>
      Option.fromNullishOr(returnStatement.argument),
    ),
  )
}

const isKeyedWrapped = (node: ESTree.CallExpression): boolean =>
  isCallExpression(node.callee) &&
  calleeMatchesHelperName(node.callee.callee, 'keyed')

const hasKeyAttribute = (rowElementCall: ESTree.CallExpression): boolean => {
  const [attributesArgument] = rowElementCall.arguments
  if (!isArrayExpression(attributesArgument)) {
    return false
  }
  return attributesArgument.elements.some(
    element =>
      isCallExpression(element) &&
      calleeMatchesHelperName(element.callee, 'Key'),
  )
}

type UnkeyedRow = Readonly<{
  rowElementCall: ESTree.CallExpression
  tagName: string
}>

const unkeyedRowElement = (
  returnExpression: unknown,
): Option.Option<UnkeyedRow> => {
  if (!isCallExpression(returnExpression)) {
    return Option.none()
  }
  if (isKeyedWrapped(returnExpression) || hasKeyAttribute(returnExpression)) {
    return Option.none()
  }
  return pipe(
    helperCalleeName(returnExpression.callee),
    Option.filter(tagName => rowElementTagNames.includes(tagName)),
    Option.map(tagName => ({ rowElementCall: returnExpression, tagName })),
  )
}

// RULE

/**
 * Requires a map callback that returns an identity-bearing row element (one
 * whose callback references the item's id) to wrap that element in keyed, so
 * the runtime patches the right rows when the list reorders or shrinks.
 */
export const keyedRequiredForMappedRows = Rule.define({
  name: 'keyed-required-for-mapped-rows',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Wrap identity-bearing mapped row elements in keyed so the runtime patches the right rows.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (
          !isCallExpression(node) ||
          !calleeMatchesHelperName(node.callee, 'map') ||
          isSingleValueMapCallee(node.callee)
        ) {
          return Effect.void
        }
        return pipe(
          arrowCallback(node),
          Option.filter(isIdentityBearing),
          Option.flatMap(callbackReturnExpression),
          Option.flatMap(unkeyedRowElement),
          Option.match({
            onNone: () => Effect.void,
            onSome: ({ rowElementCall, tagName }) =>
              ctx.report(
                Diagnostic.make({
                  node: rowElementCall,
                  message: `This map callback returns \`${tagName}(...)\` without a \`keyed\` wrapper. When the list reorders or loses a row, the runtime patches surviving rows in place and event handlers can end up on the wrong row. Wrap it as \`keyed('${tagName}')(item.id, attributes, children)\` using a stable Model identifier, or suppress a genuinely identity-free row with \`// oxlint-disable-next-line foldkit/keyed-required-for-mapped-rows\`.`,
                }),
              ),
          }),
        )
      },
    }
  },
})
