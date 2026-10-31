import { Array, Option } from 'effect'
import type { ESTree, Reference } from 'effect-oxlint'

import { unwrapExpression, resolveLocalValue } from './effect-constructor.ts'
import {
  isCallExpression,
  isIdentifier,
  isIdentifierReference,
  isMemberExpression,
  isObjectExpression,
  isObjectProperty,
  isVariableDeclarator,
  resolveFoldkitApiPath,
  resolveImportedPath,
  resolvedVariable,
  staticMemberName,
  staticMemberPath,
  staticPropertyName,
} from './guards.ts'

type FunctionNode = ESTree.ArrowFunctionExpression | ESTree.Function

type ClassNode = ESTree.Class

const isFunctionNode = (node: unknown): node is FunctionNode =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  (node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression' ||
    node.type === 'FunctionDeclaration')

const isClassNode = (node: unknown): node is ClassNode =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  (node.type === 'ClassDeclaration' || node.type === 'ClassExpression')

const isFoldkitBlockReference = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  const callee = unwrapExpression(node)
  if (references === undefined) {
    return isIdentifier(callee, 'Block')
  }

  return Option.exists(resolveFoldkitApiPath(references, callee), path => {
    const [namespace, member, extraMember] = path
    return (
      namespace === 'Block' &&
      (member === undefined ||
        (member === 'Block' && extraMember === undefined))
    )
  })
}

const blockDeclarationCall = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.CallExpression> => {
  const call = unwrapExpression(node)
  if (!isCallExpression(call)) {
    return Option.none()
  }

  const factoryCall = unwrapExpression(call.callee)
  return isCallExpression(factoryCall) &&
    Array.isArrayEmpty(factoryCall.arguments) &&
    isFoldkitBlockReference(factoryCall.callee, references)
    ? Option.some(call)
    : Option.none()
}

/** The `Block<Self, ...>()('Name', contract)` call that declares a Block:
 *  the superclass of a Block class, or the value itself when a generic
 *  factory binds the declaration to a const. */
export const blockClassDeclarationCall = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.CallExpression> => {
  if (!isClassNode(node)) {
    return blockDeclarationCall(node, references)
  }

  return node.superClass === null
    ? Option.none()
    : blockDeclarationCall(node.superClass, references)
}

/** Recognizes a class that extends a Foldkit Block declaration. */
export const isFoldkitBlockClass = (
  classNode: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean =>
  isClassNode(classNode) &&
  Option.isSome(blockClassDeclarationCall(classNode, references))

/** The Block declaration a local identifier refers to: a Block class, or a
 *  const bound to a Block declaration call. */
export const resolvedBlockDeclaration = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.Node> => {
  const expression = unwrapExpression(node)
  if (references === undefined || !isIdentifierReference(expression)) {
    return Option.none()
  }

  return Option.flatMap(resolvedVariable(references, expression), variable =>
    Array.findFirst(variable.defs, definition => {
      if (
        definition.type === 'ClassName' &&
        isFoldkitBlockClass(definition.node, references)
      ) {
        return Option.some<ESTree.Node>(definition.node)
      }

      if (
        definition.type === 'Variable' &&
        isVariableDeclarator(definition.node) &&
        definition.node.init !== null
      ) {
        const init = unwrapExpression(definition.node.init)
        return Option.isSome(blockClassDeclarationCall(init, references))
          ? Option.some(init)
          : Option.none()
      }

      return Option.none()
    }),
  )
}

const resolvesToBlockClass = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean =>
  references === undefined
    ? isIdentifier(unwrapExpression(node))
    : Option.isSome(resolvedBlockDeclaration(node, references))

/** Recognizes `Block.method(...)` on a local Foldkit Block class, such as
 *  `Counter.make(...)` or `Counter.each(...)`. */
export const isBlockClassMethodCall = (
  node: unknown,
  method: string,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (!isCallExpression(node)) {
    return false
  }

  const callee = unwrapExpression(node.callee)
  return (
    isMemberExpression(callee) &&
    Option.contains(staticMemberName(callee), method) &&
    resolvesToBlockClass(callee.object, references)
  )
}

const isEffectFunctionFactory = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  const callee = unwrapExpression(node)
  if (references === undefined) {
    return Option.exists(staticMemberPath(callee), path => {
      const [method, extraMember] = path.members
      return (
        path.root.name === 'Effect' &&
        (method === 'fn' || method === 'fnUntraced') &&
        extraMember === undefined
      )
    })
  }

  return Option.exists(resolveImportedPath(references, callee), path => {
    const members =
      path.source === 'effect/Effect'
        ? ['Effect', ...path.members]
        : path.members
    const [namespace, method, extraMember] = members
    return (
      (path.source === 'effect' || path.source === 'effect/Effect') &&
      namespace === 'Effect' &&
      (method === 'fn' || method === 'fnUntraced') &&
      extraMember === undefined
    )
  })
}

/** Unwraps `Effect.fn(body)`, `Effect.fn('name')(body)` and
 *  `Effect.fnUntraced(body)` to the body function. */
const effectFunctionBody = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<FunctionNode> =>
  Option.flatMap(resolveLocalValue(node, references), value => {
    if (isFunctionNode(value)) {
      return Option.some(value)
    }

    if (!isCallExpression(value)) {
      return Option.none()
    }

    const callee = unwrapExpression(value.callee)
    const isDirectFactory = isEffectFunctionFactory(callee, references)
    const isNamedFactory =
      isCallExpression(callee) &&
      isEffectFunctionFactory(callee.callee, references)
    if (!isDirectFactory && !isNamedFactory) {
      return Option.none()
    }

    return Option.flatMap(Array.head(value.arguments), argument => {
      const body = unwrapExpression(argument)
      return isFunctionNode(body) ? Option.some(body) : Option.none()
    })
  })

/** The constructor function passed to a Block class's `make`. */
export const blockConstructorOfMakeCall = (
  call: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<FunctionNode> =>
  isBlockClassMethodCall(call, 'make', references)
    ? Option.flatMap(Array.head(call.arguments), argument =>
        effectFunctionBody(argument, references),
      )
    : Option.none()

const enclosingMakeCall = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  const parent = node.parent
  if (parent === null) {
    return false
  }

  if (isCallExpression(parent) && parent.arguments.includes(node as never)) {
    if (isBlockClassMethodCall(parent, 'make', references)) {
      return Option.exists(
        Array.head(parent.arguments),
        first => first === node,
      )
    }

    const callee = unwrapExpression(parent.callee)
    const isFactoryCall =
      isEffectFunctionFactory(callee, references) ||
      (isCallExpression(callee) &&
        isEffectFunctionFactory(callee.callee, references))
    return isFactoryCall && enclosingMakeCall(parent, references)
  }

  if (
    parent.type === 'ParenthesizedExpression' ||
    parent.type === 'TSAsExpression' ||
    parent.type === 'TSSatisfiesExpression' ||
    parent.type === 'TSNonNullExpression'
  ) {
    return enclosingMakeCall(parent, references)
  }

  return false
}

/** Recognizes a Block constructor: the function passed to a Block class's
 *  `make`, directly or through `Effect.fn`. */
export const isBlockConstructor = (
  fn: FunctionNode,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => enclosingMakeCall(fn, references)

const enclosingFunction = (node: ESTree.Node): Option.Option<FunctionNode> => {
  const parent = node.parent
  if (parent === null) {
    return Option.none()
  }

  return isFunctionNode(parent)
    ? Option.some(parent)
    : enclosingFunction(parent)
}

const returningFunction = (
  object: ESTree.ObjectExpression,
): Option.Option<FunctionNode> => {
  let current: ESTree.Node = object
  while (
    current.parent !== null &&
    (current.parent.type === 'ParenthesizedExpression' ||
      current.parent.type === 'TSAsExpression' ||
      current.parent.type === 'TSSatisfiesExpression')
  ) {
    current = current.parent
  }

  const parent = current.parent
  if (parent === null) {
    return Option.none()
  }

  if (parent.type === 'ArrowFunctionExpression' && parent.body === current) {
    return Option.some(parent)
  }

  return parent.type === 'ReturnStatement'
    ? enclosingFunction(parent)
    : Option.none()
}

/** Recognizes the implementation object a Block constructor returns. */
export const isBlockImplementationObject = (
  object: ESTree.ObjectExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean =>
  Option.exists(returningFunction(object), fn =>
    isBlockConstructor(fn, references),
  )

const propertyOfValue = (
  node: ESTree.Node,
): Option.Option<ESTree.ObjectProperty> => {
  const parent = node.parent
  return parent !== null && isObjectProperty(parent) && parent.value === node
    ? Option.some(parent)
    : Option.none()
}

/**
 * The property path from a Block implementation object to `node`, such as
 * `['view']`, `['update', 'ClickedSave']`, `['commands', 'Save']`, or
 * `['subscriptions', 'keys', 'stream']`. OutMessage handlers spread into
 * `update` through `instance.on({ ... })` have the path
 * `['update', 'on', 'Tag']`.
 */
export const blockImplementationPath = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ReadonlyArray<string>> => {
  const segments: Array<string> = []
  let current: ESTree.Node = node

  for (;;) {
    const maybeProperty = propertyOfValue(current)
    if (Option.isNone(maybeProperty)) {
      return Option.none()
    }

    const property = maybeProperty.value
    const maybeName = staticPropertyName(property)
    if (Option.isNone(maybeName)) {
      return Option.none()
    }
    segments.unshift(maybeName.value)

    const object = property.parent
    if (!isObjectExpression(object)) {
      return Option.none()
    }

    if (isBlockImplementationObject(object, references)) {
      return Option.some(segments)
    }

    const objectParent = object.parent
    if (
      objectParent !== null &&
      isCallExpression(objectParent) &&
      objectParent.arguments.includes(object as never) &&
      isMemberExpression(objectParent.callee) &&
      Option.contains(staticMemberName(objectParent.callee), 'on') &&
      objectParent.parent?.type === 'SpreadElement' &&
      isObjectExpression(objectParent.parent.parent)
    ) {
      segments.unshift('on')
      const updateObject = objectParent.parent.parent
      const maybeUpdateProperty = propertyOfValue(updateObject)
      if (
        Option.isNone(maybeUpdateProperty) ||
        !Option.contains(
          staticPropertyName(maybeUpdateProperty.value),
          'update',
        ) ||
        !isObjectExpression(maybeUpdateProperty.value.parent) ||
        !isBlockImplementationObject(
          maybeUpdateProperty.value.parent,
          references,
        )
      ) {
        return Option.none()
      }

      segments.unshift('update')
      return Option.some(segments)
    }

    current = object
  }
}

/** Recognizes a Block's update handler, including OutMessage handlers passed
 *  to a child instance's `on`. */
export const isBlockUpdateHandler = (
  fn: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean =>
  Option.exists(blockImplementationPath(fn, references), path => {
    const [slot, handlerOrOn, onHandler, extra] = path
    return (
      slot === 'update' &&
      handlerOrOn !== undefined &&
      extra === undefined &&
      (onHandler === undefined || handlerOrOn === 'on')
    )
  })
