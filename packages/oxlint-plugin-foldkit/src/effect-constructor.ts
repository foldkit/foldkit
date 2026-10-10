import { Array, Option, pipe } from 'effect'
import { AST, type ESTree, type Reference } from 'effect-oxlint'

import { isCallExpression, resolveImportedPath } from './guards.ts'

type EffectConstructorFunction =
  | ESTree.ArrowFunctionExpression
  | ESTree.Function

type TransparentExpression =
  | ESTree.ChainExpression
  | ESTree.ParenthesizedExpression
  | ESTree.TSAsExpression
  | ESTree.TSInstantiationExpression
  | ESTree.TSNonNullExpression
  | ESTree.TSSatisfiesExpression
  | ESTree.TSTypeAssertion

const isTransparentExpression = (
  node: unknown,
): node is TransparentExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  (node.type === 'ChainExpression' ||
    node.type === 'ParenthesizedExpression' ||
    node.type === 'TSAsExpression' ||
    node.type === 'TSInstantiationExpression' ||
    node.type === 'TSNonNullExpression' ||
    node.type === 'TSSatisfiesExpression' ||
    node.type === 'TSTypeAssertion')

/** @internal Removes syntax-only wrappers around an expression. */
export const unwrapExpression = (node: ESTree.Node): ESTree.Node =>
  isTransparentExpression(node) ? unwrapExpression(node.expression) : node

const isEffectConstructorFunction = (
  node: unknown,
): node is EffectConstructorFunction =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  (node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression')

const isEffectCall = (
  node: ESTree.CallExpression,
  methodName: string,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references === undefined) {
    return AST.isCallOf(node, 'Effect', methodName)
  }

  return Option.exists(resolveImportedPath(references, node.callee), path => {
    if (path.source === 'effect') {
      const [namespace, method, extraMember] = path.members
      return (
        namespace === 'Effect' &&
        method === methodName &&
        extraMember === undefined
      )
    }

    if (path.source === 'effect/Effect') {
      const [method, extraMember] = path.members
      return method === methodName && extraMember === undefined
    }

    return false
  })
}

const returnedExpression = (
  node: EffectConstructorFunction,
): Option.Option<ESTree.Node> => {
  if (
    node.type === 'ArrowFunctionExpression' &&
    node.body.type !== 'BlockStatement'
  ) {
    return Option.some(unwrapExpression(node.body))
  }

  if (node.body === null || node.body.type !== 'BlockStatement') {
    return Option.none()
  }

  return pipe(
    node.body.body,
    Array.findFirst(statement => statement.type === 'ReturnStatement'),
    Option.flatMap(statement => Option.fromNullishOr(statement.argument)),
    Option.map(unwrapExpression),
  )
}

const returnedBy = (
  node: ESTree.CallExpression,
  argument: 'first' | 'last',
): Option.Option<ESTree.Node> =>
  pipe(
    argument === 'first'
      ? Array.head(node.arguments)
      : Array.last(node.arguments),
    Option.map(unwrapExpression),
    Option.filter(isEffectConstructorFunction),
    Option.flatMap(returnedExpression),
  )

/** @internal Resolves the handler value produced by a supported Effect constructor. */
export function effectConstructorValue(
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.Node> {
  const expression = unwrapExpression(node)
  if (!isCallExpression(expression)) {
    return Option.none()
  }

  if (isEffectCall(expression, 'succeed', references)) {
    return pipe(Array.head(expression.arguments), Option.map(unwrapExpression))
  }

  if (
    isEffectCall(expression, 'sync', references) ||
    isEffectCall(expression, 'gen', references) ||
    isEffectCall(expression, 'map', references)
  ) {
    return returnedBy(
      expression,
      isEffectCall(expression, 'map', references) ? 'last' : 'first',
    )
  }

  if (isEffectCall(expression, 'flatMap', references)) {
    return pipe(
      returnedBy(expression, 'last'),
      Option.flatMap(returned => effectConstructorValue(returned, references)),
    )
  }

  if (isEffectCall(expression, 'acquireRelease', references)) {
    return pipe(
      Array.head(expression.arguments),
      Option.map(unwrapExpression),
      Option.flatMap(acquire => effectConstructorValue(acquire, references)),
    )
  }

  return Option.none()
}
