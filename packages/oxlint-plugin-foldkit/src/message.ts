import { type ESTree } from 'effect-oxlint'

import { isIdentifier, isObjectExpression, isStringLiteral } from './guards.ts'

export const isMCall = (node: ESTree.CallExpression): boolean =>
  isIdentifier(node.callee, 'm')

export const hasMessagePayloadProperty = (
  node: ESTree.CallExpression,
): boolean => {
  const [, second] = node.arguments
  if (!isObjectExpression(second)) {
    return false
  }
  return second.properties.some(
    property =>
      property.type === 'Property' &&
      (isIdentifier(property.key, 'message') ||
        (isStringLiteral(property.key) && property.key.value === 'message')),
  )
}
