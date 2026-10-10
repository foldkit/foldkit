import { Array, Option, pipe } from 'effect'
import { AST, type ESTree, type Reference, type Variable } from 'effect-oxlint'

import {
  isCallExpression,
  isIdentifier,
  isIdentifierReference,
  isVariableDeclarator,
  resolveImportedPath,
  resolvedVariable,
} from './guards.ts'

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

const isGeneratorConstructorFunction = (
  node: unknown,
): node is ESTree.Function =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') &&
  'generator' in node &&
  node.generator === true

const localVariableValue = (variable: Variable): Option.Option<ESTree.Node> => {
  if (variable.defs.length !== 1) {
    return Option.none()
  }

  const [definition] = variable.defs
  if (definition === undefined) {
    return Option.none()
  }

  if (
    definition.type === 'Variable' &&
    isVariableDeclarator(definition.node) &&
    isIdentifier(definition.node.id) &&
    definition.node.init !== null &&
    definition.node.parent.type === 'VariableDeclaration' &&
    definition.node.parent.kind === 'const'
  ) {
    return Option.some(definition.node.init)
  }

  if (
    definition.type === 'FunctionName' &&
    definition.node.type === 'FunctionDeclaration' &&
    !variable.references.some(reference => reference.isWrite())
  ) {
    return Option.some(definition.node)
  }

  return Option.none()
}

const resolveLocalValueWith = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  visited: Set<Variable>,
): Option.Option<ESTree.Node> => {
  const expression = unwrapExpression(node)
  if (references === undefined || !isIdentifierReference(expression)) {
    return Option.some(expression)
  }

  return Option.flatMap(resolvedVariable(references, expression), variable => {
    if (visited.has(variable)) {
      return Option.none()
    }

    visited.add(variable)
    return Option.flatMap(localVariableValue(variable), value =>
      resolveLocalValueWith(value, references, visited),
    )
  })
}

/** @internal Resolves immutable local aliases to a local function, object, or expression. Imported, mutable, ambiguous, and cyclic bindings are left unresolved. */
export const resolveLocalValue = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.Node> =>
  resolveLocalValueWith(node, references, new Set())

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

const effectConstructorValueWith = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  visited: ReadonlySet<ESTree.Node>,
): Option.Option<ESTree.Node> =>
  Option.flatMap(resolveLocalValue(node, references), expression => {
    if (visited.has(expression)) {
      return Option.none()
    }

    const nextVisited = new Set(visited)
    nextVisited.add(expression)

    if (!isCallExpression(expression)) {
      return Option.none()
    }

    if (isEffectCall(expression, 'succeed', references)) {
      return pipe(
        Array.head(expression.arguments),
        Option.flatMap(value => resolveLocalValue(value, references)),
      )
    }

    if (
      isEffectCall(expression, 'sync', references) ||
      isEffectCall(expression, 'gen', references) ||
      isEffectCall(expression, 'map', references)
    ) {
      return pipe(
        returnedBy(
          expression,
          isEffectCall(expression, 'map', references) ? 'last' : 'first',
        ),
        Option.flatMap(value => resolveLocalValue(value, references)),
      )
    }

    if (isEffectCall(expression, 'flatMap', references)) {
      return pipe(
        returnedBy(expression, 'last'),
        Option.flatMap(returned =>
          effectConstructorValueWith(returned, references, nextVisited),
        ),
      )
    }

    if (isEffectCall(expression, 'acquireRelease', references)) {
      return pipe(
        Array.head(expression.arguments),
        Option.map(unwrapExpression),
        Option.flatMap(acquire =>
          effectConstructorValueWith(acquire, references, nextVisited),
        ),
      )
    }

    return Option.none()
  })

/** @internal Resolves the handler value produced by a supported Effect constructor. */
export const effectConstructorValue = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.Node> =>
  effectConstructorValueWith(node, references, new Set())

/** @internal Resolves the handler value returned by a generator constructor. */
export const generatorConstructorValue = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.Node> =>
  pipe(
    resolveLocalValue(node, references),
    Option.filter(isGeneratorConstructorFunction),
    Option.flatMap(returnedExpression),
    Option.flatMap(value => resolveLocalValue(value, references)),
  )
