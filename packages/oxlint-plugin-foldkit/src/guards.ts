import { Array, Option } from 'effect'
import { type ESTree } from 'effect-oxlint'

export const isIdentifier = (
  node: unknown,
  name?: string,
): node is Readonly<{ type: 'Identifier'; name: string }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Identifier' &&
  'name' in node &&
  typeof node.name === 'string' &&
  (name === undefined || node.name === name)

export const isStringLiteral = (node: unknown): node is ESTree.StringLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Literal' &&
  'value' in node &&
  typeof node.value === 'string'

export const isTemplateLiteral = (
  node: unknown,
): node is ESTree.TemplateLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'TemplateLiteral'

export const isCallExpression = (
  node: unknown,
): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression'

export const isMemberExpression = (
  node: unknown,
): node is Readonly<{
  type: 'MemberExpression'
  object: unknown
  property: unknown
  computed?: boolean
}> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'MemberExpression'

export const isObjectExpression = (
  node: unknown,
): node is ESTree.ObjectExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ObjectExpression'

export const isArrayExpression = (
  node: unknown,
): node is Readonly<{
  type: 'ArrayExpression'
  elements: ReadonlyArray<unknown>
}> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrayExpression'

export const isSpreadElement = (node: unknown): boolean =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'SpreadElement'

export const helperCalleeName = (callee: unknown): Option.Option<string> => {
  if (isIdentifier(callee)) {
    return Option.some(callee.name)
  }
  if (
    isMemberExpression(callee) &&
    !callee.computed &&
    isIdentifier(callee.property)
  ) {
    return Option.some(callee.property.name)
  }
  return Option.none()
}

export const calleeMatchesHelperName = (
  callee: unknown,
  helperName: string,
): boolean =>
  Option.exists(helperCalleeName(callee), name => name === helperName)

export const staticStringValue = (node: unknown): Option.Option<string> => {
  if (isStringLiteral(node)) {
    return Option.some(node.value)
  }
  if (isTemplateLiteral(node) && Array.isArrayEmpty(node.expressions)) {
    return Option.flatMap(Array.head(node.quasis), quasi =>
      Option.fromNullishOr(quasi.value.cooked),
    )
  }
  return Option.none()
}

export const isVariableDeclarator = (
  node: unknown,
): node is ESTree.VariableDeclarator =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'VariableDeclarator'

export const isVariableDeclaration = (
  node: unknown,
): node is ESTree.VariableDeclaration =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'VariableDeclaration'

export const isProgram = (node: unknown): node is ESTree.Program =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Program'

export const firstStringArgument = (
  node: ESTree.CallExpression,
): ESTree.StringLiteral | undefined => {
  const [first] = node.arguments
  return isStringLiteral(first) ? first : undefined
}
