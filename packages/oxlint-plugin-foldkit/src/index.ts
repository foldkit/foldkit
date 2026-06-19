import { Effect } from 'effect'
import {
  Diagnostic,
  type ESTree,
  Plugin,
  Rule,
  RuleContext,
} from 'effect-oxlint'

// GUARDS

const isIdentifier = (
  node: unknown,
  name?: string,
): node is { readonly type: 'Identifier'; readonly name: string } =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Identifier' &&
  'name' in node &&
  typeof node.name === 'string' &&
  (name === undefined || node.name === name)

const isStringLiteral = (node: unknown): node is ESTree.StringLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Literal' &&
  'value' in node &&
  typeof node.value === 'string'

const isCallExpression = (node: ESTree.Node): node is ESTree.CallExpression =>
  node.type === 'CallExpression'

const isObjectExpression = (node: unknown): node is ESTree.ObjectExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ObjectExpression'

const isVariableDeclarator = (
  node: ESTree.Node,
): node is ESTree.VariableDeclarator => node.type === 'VariableDeclarator'

const isTSAsExpression = (
  node: ESTree.Node,
): node is ESTree.Node & { readonly expression: ESTree.Node } =>
  node.type === 'TSAsExpression' &&
  'expression' in node &&
  typeof node.expression === 'object' &&
  node.expression !== null

const isMCall = (node: ESTree.CallExpression): boolean =>
  isIdentifier(node.callee, 'm')

const firstStringArgument = (
  node: ESTree.CallExpression,
): ESTree.StringLiteral | undefined => {
  const [first] = node.arguments
  return isStringLiteral(first) ? first : undefined
}

const hasMessagePayloadProperty = (node: ESTree.CallExpression): boolean => {
  const [, second] = node.arguments
  if (!isObjectExpression(second)) return false
  return second.properties.some(property => {
    if (property.type !== 'Property') return false
    const hasMessageKey =
      isIdentifier(property.key, 'message') ||
      (isStringLiteral(property.key) && property.key.value === 'message')
    return hasMessageKey
  })
}

const isStaticMember = (
  node: ESTree.MemberExpression,
  objectName: string,
  propertyNames: ReadonlyArray<string>,
): boolean =>
  !node.computed &&
  isIdentifier(node.object, objectName) &&
  isIdentifier(node.property) &&
  propertyNames.includes(node.property.name)

const isMemberCall = (
  node: ESTree.CallExpression,
  objectName: string,
  propertyNames: ReadonlyArray<string>,
): boolean =>
  node.callee.type === 'MemberExpression' &&
  isStaticMember(node.callee, objectName, propertyNames)

const hasTagPropertyWithStringLiteral = (
  node: ESTree.ObjectExpression,
): boolean =>
  node.properties.some(property => {
    if (property.type !== 'Property') return false
    const isTagKey =
      isIdentifier(property.key, '_tag') ||
      (isStringLiteral(property.key) && property.key.value === '_tag')
    return isTagKey && isStringLiteral(property.value)
  })

const typeNameEndsWithMessage = (node: unknown): boolean => {
  if (isIdentifier(node)) return node.name === 'Message'
  if (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    node.type === 'TSQualifiedName' &&
    'right' in node
  ) {
    return typeNameEndsWithMessage(node.right)
  }
  return false
}

const hasMessageTypeAnnotation = (node: ESTree.VariableDeclarator): boolean => {
  const id = node.id as unknown
  if (
    typeof id !== 'object' ||
    id === null ||
    !('typeAnnotation' in id) ||
    typeof id.typeAnnotation !== 'object' ||
    id.typeAnnotation === null ||
    !('typeAnnotation' in id.typeAnnotation)
  ) {
    return false
  }

  const typeAnnotation = id.typeAnnotation.typeAnnotation
  if (
    typeof typeAnnotation !== 'object' ||
    typeAnnotation === null ||
    !('type' in typeAnnotation) ||
    typeAnnotation.type !== 'TSTypeReference' ||
    !('typeName' in typeAnnotation)
  ) {
    return false
  }

  return typeNameEndsWithMessage(typeAnnotation.typeName)
}

const innerCommandDefineCall = (
  node: ESTree.Node,
): ESTree.CallExpression | undefined => {
  if (!isCallExpression(node)) return undefined
  const callee = node.callee
  if (callee.type !== 'CallExpression') return undefined
  if (!isMemberCall(callee, 'Command', ['define'])) return undefined
  return callee
}

// RULES

export const noNoopMessage = Rule.define({
  name: 'no-noop-message',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Use meaningful Foldkit Messages instead of generic NoOp Messages.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !isMCall(node)) return Effect.void
        const messageName = firstStringArgument(node)
        if (
          messageName === undefined ||
          !['NoOp', 'Noop', 'NoOperation'].includes(messageName.value)
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node: messageName,
            message:
              'Every Foldkit Message should describe what happened; avoid generic NoOp Messages.',
          }),
        )
      },
    }
  },
})

export const gotSubmodelMessageName = Rule.define({
  name: 'got-submodel-message-name',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Name Foldkit Submodel wrapper Messages with the Got*Message convention.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (
          !isCallExpression(node) ||
          !isMCall(node) ||
          !hasMessagePayloadProperty(node)
        ) {
          return Effect.void
        }
        const messageName = firstStringArgument(node)
        if (
          messageName === undefined ||
          /^Got[A-Z].*Message$/.test(messageName.value)
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node: messageName,
            message:
              'Submodel wrapper Messages should be named Got*Message so Foldkit DevTools can filter them.',
          }),
        )
      },
    }
  },
})

export const messageBindingMatchesTag = Rule.define({
  name: 'message-binding-matches-tag',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep a Message binding name in sync with the tag passed to m().',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      VariableDeclarator: (node: ESTree.Node) => {
        if (!isVariableDeclarator(node)) return Effect.void
        const init = node.init
        if (
          init === null ||
          init === undefined ||
          !isCallExpression(init) ||
          !isMCall(init)
        ) {
          return Effect.void
        }
        const messageName = firstStringArgument(init)
        if (
          messageName === undefined ||
          !isIdentifier(node.id) ||
          node.id.name === messageName.value
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node: node.id,
            message: `Message binding "${node.id.name}" does not match its m() tag "${messageName.value}".`,
          }),
        )
      },
    }
  },
})

export const gotPrefixRequiresSubmodelPayload = Rule.define({
  name: 'got-prefix-requires-submodel-payload',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Reserve Got* Messages for Submodel wrappers with a { message: Child.Message } payload.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !isMCall(node)) return Effect.void
        const messageName = firstStringArgument(node)
        if (
          messageName === undefined ||
          !/^Got[A-Z]/.test(messageName.value) ||
          hasMessagePayloadProperty(node)
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node: messageName,
            message:
              'Got* is reserved for Submodel wrappers. Add a { message: Child.Message } payload or choose a Message name that does not start with Got.',
          }),
        )
      },
    }
  },
})

export const noEmptyObjectTaggedCall = Rule.define({
  name: 'no-empty-object-tagged-call',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Call no-field Message constructors with no arguments instead of an empty object.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !isIdentifier(node.callee)) {
          return Effect.void
        }
        if (
          !/^[A-Z][A-Za-z0-9]*$/.test(node.callee.name) ||
          node.arguments.length !== 1
        ) {
          return Effect.void
        }
        const [argument] = node.arguments
        if (!isObjectExpression(argument) || argument.properties.length > 0) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node,
            message: `Call no-field Message constructors as ${node.callee.name}() instead of ${node.callee.name}({}).`,
          }),
        )
      },
    }
  },
})

export const preferCallableMessageConstructor = Rule.define({
  name: 'prefer-callable-message-constructor',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Construct Messages via their callable Schema constructor instead of typing or casting an object literal.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      VariableDeclarator: (node: ESTree.Node) => {
        if (
          !isVariableDeclarator(node) ||
          !hasMessageTypeAnnotation(node) ||
          !isObjectExpression(node.init) ||
          !hasTagPropertyWithStringLiteral(node.init)
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node,
            message:
              'Construct Messages with their callable Schema constructor (e.g. Foo({ ... })) instead of typing an object literal with a _tag.',
          }),
        )
      },
      TSAsExpression: (node: ESTree.Node) => {
        if (
          !isTSAsExpression(node) ||
          !isObjectExpression(node.expression) ||
          !hasTagPropertyWithStringLiteral(node.expression)
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node,
            message:
              'Construct Messages with their callable Schema constructor (e.g. Foo({ ... })) instead of casting an object literal with a _tag.',
          }),
        )
      },
    }
  },
})

export const commandBindingMatchesName = Rule.define({
  name: 'command-binding-matches-name',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep a Command binding name in sync with the name passed to Command.define.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      VariableDeclarator: (node: ESTree.Node) => {
        if (!isVariableDeclarator(node)) return Effect.void
        const init = node.init
        if (init === null || init === undefined) return Effect.void
        const innerCall = innerCommandDefineCall(init)
        if (innerCall === undefined) return Effect.void
        const nameArgument = firstStringArgument(innerCall)
        if (
          nameArgument === undefined ||
          !isIdentifier(node.id) ||
          node.id.name === nameArgument.value
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node: node.id,
            message: `Command binding "${node.id.name}" does not match its Command.define name "${nameArgument.value}".`,
          }),
        )
      },
    }
  },
})

export default Plugin.define({
  name: 'foldkit',
  rules: {
    'command-binding-matches-name': commandBindingMatchesName,
    'got-prefix-requires-submodel-payload': gotPrefixRequiresSubmodelPayload,
    'got-submodel-message-name': gotSubmodelMessageName,
    'message-binding-matches-tag': messageBindingMatchesTag,
    'no-empty-object-tagged-call': noEmptyObjectTaggedCall,
    'no-noop-message': noNoopMessage,
    'prefer-callable-message-constructor': preferCallableMessageConstructor,
  },
})
