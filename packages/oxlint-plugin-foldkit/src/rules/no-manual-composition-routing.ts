import { Effect, Option } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import {
  blockBindingConfiguration,
  indexReferences,
  isBlockBindingCall,
  isCallExpression,
  isIdentifier,
  isIdentifierReference,
  isMemberExpression,
  isObjectExpression,
  isOwnedDefinitionCallee,
  isOwnedDefinitionCall,
  resolvedVariable,
  staticMemberPath,
  staticPropertyName,
  staticStringValue,
} from '../guards.ts'

const manualRoutingMessage =
  'Do not handle a Got* child wrapper in an authored Composition update. Bind the completed child Block without an authored wrapper or Message mapper; Composition routes its generated envelope. Put parent coordination in the Binding OutMessage policy and use exposed operations for parent-driven child changes.'

const hiddenChildInspectionMessage =
  'Do not inspect an internal child Message through the parent wrapper. Surface the child fact as an OutMessage and handle it in the Binding policy.'

const authoredMappingMessage = (propertyName: string): string =>
  `Remove the authored \`${propertyName}\` mapping. The registered Binding derives child delivery; use \`delivery.when\`, \`delivery.toUpdateContext\`, and keyed \`keySchema\` for parent policy.`

const isNode = (value: unknown): value is ESTree.Node =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  typeof value.type === 'string'

const isFunction = (
  value: unknown,
): value is ESTree.ArrowFunctionExpression | ESTree.Function =>
  isNode(value) &&
  (value.type === 'ArrowFunctionExpression' ||
    value.type === 'FunctionExpression' ||
    value.type === 'FunctionDeclaration')

const walk = (root: ESTree.Node, visit: (node: ESTree.Node) => void): void => {
  const visited = new WeakSet<object>()
  const visitNode = (node: ESTree.Node): void => {
    if (visited.has(node)) {
      return
    }
    visited.add(node)
    visit(node)

    for (const [key, value] of Object.entries(node)) {
      if (key === 'parent') {
        continue
      }
      if (isNode(value)) {
        visitNode(value)
      } else if (globalThis.Array.isArray(value)) {
        for (const entry of value) {
          if (isNode(entry)) {
            visitNode(entry)
          }
        }
      }
    }
  }

  visitNode(root)
}

const resolvedFunction = (
  value: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ESTree.ArrowFunctionExpression | ESTree.Function | undefined => {
  if (isFunction(value)) {
    return value
  }
  if (!isIdentifierReference(value) || references === undefined) {
    return undefined
  }

  return Option.getOrUndefined(
    Option.flatMap(resolvedVariable(references, value), variable =>
      Option.fromNullishOr(
        variable.defs.flatMap(definition => {
          if (definition.node.type === 'VariableDeclarator') {
            return isFunction(definition.node.init)
              ? [definition.node.init]
              : []
          }
          return isFunction(definition.node) ? [definition.node] : []
        })[0],
      ),
    ),
  )
}

const resolvedObject = (
  value: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ESTree.ObjectExpression | undefined => {
  if (isObjectExpression(value)) {
    return value
  }
  if (!isIdentifierReference(value) || references === undefined) {
    return undefined
  }

  return Option.getOrUndefined(
    Option.flatMap(resolvedVariable(references, value), variable =>
      Option.fromNullishOr(
        variable.defs.flatMap(definition =>
          definition.node.type === 'VariableDeclarator' &&
          isObjectExpression(definition.node.init)
            ? [definition.node.init]
            : [],
        )[0],
      ),
    ),
  )
}

type AuthoredUpdateKind = 'Direct' | 'WithContext'

const ownedMakeUpdateKind = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): AuthoredUpdateKind | undefined => {
  if (isOwnedDefinitionCall(node, 'makeUpdate', references)) {
    return 'Direct'
  }

  if (!isMemberExpression(node.callee)) {
    return undefined
  }
  const maybePath = staticMemberPath(node.callee)
  if (
    Option.isNone(maybePath) ||
    maybePath.value.members.slice(-2).join('.') !== 'makeUpdate.withContext' ||
    !isOwnedDefinitionCallee(node.callee.object, 'makeUpdate', references)
  ) {
    return undefined
  }

  return 'WithContext'
}

const returnedExpressions = (
  callback: ESTree.ArrowFunctionExpression | ESTree.Function,
): ReadonlyArray<unknown> => {
  if (callback.body === null) {
    return []
  }
  if (callback.body.type !== 'BlockStatement') {
    return [callback.body]
  }

  return callback.body.body.flatMap(statement =>
    statement.type === 'ReturnStatement' && statement.argument !== null
      ? [statement.argument]
      : [],
  )
}

const authoredHandlerObjects = (
  node: ESTree.CallExpression,
  kind: AuthoredUpdateKind,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ReadonlyArray<ESTree.ObjectExpression> => {
  const [authored] = node.arguments
  if (kind === 'Direct') {
    const handlers = resolvedObject(authored, references)
    return handlers === undefined ? [] : [handlers]
  }

  const createCases = resolvedFunction(authored, references)
  if (createCases === undefined) {
    return []
  }

  return returnedExpressions(createCases).flatMap(value => {
    const handlers = resolvedObject(value, references)
    return handlers === undefined ? [] : [handlers]
  })
}

const objectHandlerFunctions = (
  handlers: ESTree.ObjectExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ReadonlyArray<ESTree.ArrowFunctionExpression | ESTree.Function> =>
  handlers.properties.flatMap(property => {
    if (property.type !== 'Property') {
      return []
    }
    const handler = resolvedFunction(property.value, references)
    return handler === undefined ? [] : [handler]
  })

const matchesHandlerObject = (
  node: ESTree.CallExpression,
): ReadonlyArray<unknown> => {
  const maybePath = staticMemberPath(node.callee)
  if (Option.isNone(maybePath)) {
    return []
  }
  const method = maybePath.value.members.at(-1)
  return method === 'match' ||
    method === 'matchOrElse' ||
    method === 'tags' ||
    method === 'tagsExhaustive'
    ? node.arguments
    : []
}

const gotWrapperName = (value: unknown): string | undefined =>
  Option.getOrUndefined(
    Option.filter(staticStringValue(value), name => /^Got.+/.test(name)),
  )

const isParentMessageTagRead = (
  value: unknown,
  callback: ESTree.ArrowFunctionExpression | ESTree.Function,
  messageParameterName: string | undefined,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (
    messageParameterName === undefined ||
    !isNode(value) ||
    value.type !== 'MemberExpression'
  ) {
    return false
  }

  return Option.exists(staticMemberPath(value), path => {
    if (
      path.root.name !== messageParameterName ||
      path.members.length !== 1 ||
      path.members[0] !== '_tag'
    ) {
      return false
    }
    if (references === undefined) {
      return true
    }
    return Option.exists(resolvedVariable(references, path.root), variable =>
      variable.defs.some(
        definition =>
          definition.type === 'Parameter' && definition.node === callback,
      ),
    )
  })
}

const isGotWrapperTagComparison = (
  node: ESTree.Node,
  callback: ESTree.ArrowFunctionExpression | ESTree.Function,
  messageParameterName: string | undefined,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (
    node.type !== 'BinaryExpression' ||
    !['===', '!==', '==', '!='].includes(node.operator)
  ) {
    return false
  }

  return (
    (isParentMessageTagRead(
      node.left,
      callback,
      messageParameterName,
      references,
    ) &&
      gotWrapperName(node.right) !== undefined) ||
    (isParentMessageTagRead(
      node.right,
      callback,
      messageParameterName,
      references,
    ) &&
      gotWrapperName(node.left) !== undefined)
  )
}

const isNestedChildTagRead = (
  node: ESTree.Node,
  callback: ESTree.ArrowFunctionExpression | ESTree.Function,
  messageParameterName: string | undefined,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (messageParameterName === undefined || node.type !== 'MemberExpression') {
    return false
  }
  return Option.exists(staticMemberPath(node), path => {
    if (
      path.root.name !== messageParameterName ||
      path.members.length !== 2 ||
      path.members[0] !== 'message' ||
      path.members[1] !== '_tag'
    ) {
      return false
    }
    if (references === undefined) {
      return true
    }
    return Option.exists(resolvedVariable(references, path.root), variable =>
      variable.defs.some(
        definition =>
          definition.type === 'Parameter' && definition.node === callback,
      ),
    )
  })
}

/** Keeps child delivery routing out of authored Composition updates. */
export const noManualCompositionRouting = Rule.define({
  name: 'no-manual-composition-routing',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep authored Composition updates local and let registered Bindings route generated child delivery.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)

    return {
      'Program:exit': (program: ESTree.Node) => {
        const effects: Array<Effect.Effect<void>> = []
        walk(program, node => {
          if (
            isCallExpression(node) &&
            isBlockBindingCall(node, references, ctx.filename)
          ) {
            const config = resolvedObject(
              blockBindingConfiguration(node, references, ctx.filename),
              references,
            )
            for (const property of config?.properties ?? []) {
              if (property.type !== 'Property') {
                continue
              }

              const propertyName = Option.getOrUndefined(
                staticPropertyName(property),
              )
              if (
                propertyName !== 'parentMessage' &&
                propertyName !== 'toParentMessage' &&
                propertyName !== 'fromParentMessage'
              ) {
                continue
              }

              effects.push(
                ctx.report(
                  Diagnostic.make({
                    node: property,
                    message: authoredMappingMessage(propertyName),
                  }),
                ),
              )
            }
          }

          if (!isCallExpression(node)) {
            return
          }

          const updateKind = ownedMakeUpdateKind(node, references)
          if (updateKind === undefined) {
            return
          }

          const handlerObjects = authoredHandlerObjects(
            node,
            updateKind,
            references,
          )
          for (const handlers of handlerObjects) {
            for (const property of handlers.properties) {
              if (
                property.type === 'Property' &&
                Option.exists(staticPropertyName(property), name =>
                  /^Got.+/.test(name),
                )
              ) {
                effects.push(
                  ctx.report(
                    Diagnostic.make({
                      node: property,
                      message: manualRoutingMessage,
                    }),
                  ),
                )
              }
            }
          }

          const callbacks = handlerObjects.flatMap(handlers =>
            objectHandlerFunctions(handlers, references),
          )

          for (const callback of callbacks) {
            if (callback.body === null) {
              continue
            }
            const messageParameter = callback.params[1]
            const messageParameterName = isIdentifier(messageParameter)
              ? messageParameter.name
              : undefined

            walk(callback.body, callbackNode => {
              if (
                isGotWrapperTagComparison(
                  callbackNode,
                  callback,
                  messageParameterName,
                  references,
                )
              ) {
                effects.push(
                  ctx.report(
                    Diagnostic.make({
                      node: callbackNode,
                      message: manualRoutingMessage,
                    }),
                  ),
                )
              }

              if (
                isNestedChildTagRead(
                  callbackNode,
                  callback,
                  messageParameterName,
                  references,
                )
              ) {
                effects.push(
                  ctx.report(
                    Diagnostic.make({
                      node: callbackNode,
                      message: hiddenChildInspectionMessage,
                    }),
                  ),
                )
              }

              if (!isCallExpression(callbackNode)) {
                return
              }

              for (const argument of matchesHandlerObject(callbackNode)) {
                const handlers = resolvedObject(argument, references)
                if (handlers === undefined) {
                  continue
                }
                for (const property of handlers.properties) {
                  if (
                    property.type === 'Property' &&
                    Option.exists(staticPropertyName(property), name =>
                      /^Got.+/.test(name),
                    )
                  ) {
                    effects.push(
                      ctx.report(
                        Diagnostic.make({
                          node: property,
                          message: manualRoutingMessage,
                        }),
                      ),
                    )
                  }
                }
              }

              const maybePath = staticMemberPath(callbackNode.callee)
              if (
                Option.isSome(maybePath) &&
                (maybePath.value.members.at(-1) === 'tag' ||
                  maybePath.value.members.at(-1) === 'tags') &&
                callbackNode.arguments.some(
                  argument => gotWrapperName(argument) !== undefined,
                )
              ) {
                effects.push(
                  ctx.report(
                    Diagnostic.make({
                      node: callbackNode,
                      message: manualRoutingMessage,
                    }),
                  ),
                )
              }
            })
          }
        })

        return Effect.all(effects, { discard: true })
      },
    }
  },
})
