import { Effect } from 'effect'
import {
  Diagnostic,
  type ESTree,
  Plugin,
  Rule,
  RuleContext,
} from 'effect-oxlint'

// TYPE GUARDS

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

const isMessageSchemaExpression = (node: unknown): boolean => {
  if (isIdentifier(node)) return node.name.endsWith('Message')
  if (
    typeof node !== 'object' ||
    node === null ||
    !('type' in node) ||
    node.type !== 'MemberExpression'
  ) {
    return false
  }
  if (!('computed' in node) || !('property' in node)) return false
  return !node.computed && isIdentifier(node.property, 'Message')
}

const hasSubmodelMessagePayloadProperty = (
  node: ESTree.CallExpression,
): boolean => {
  const [, second] = node.arguments
  if (!isObjectExpression(second)) return false
  return second.properties.some(property => {
    if (property.type !== 'Property') return false
    const hasMessageKey =
      isIdentifier(property.key, 'message') ||
      (isStringLiteral(property.key) && property.key.value === 'message')
    return hasMessageKey && isMessageSchemaExpression(property.value)
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

const noNoopMessage = Rule.define({
  name: 'no-noop-message',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Use meaningful Foldkit messages instead of generic NoOp messages.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) return Effect.void
        if (!isMCall(node)) return Effect.void
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
              'Every Foldkit message should describe what happened; avoid generic NoOp messages.',
          }),
        )
      },
    }
  },
})

const gotSubmodelMessageName = Rule.define({
  name: 'got-submodel-message-name',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Name Foldkit submodel wrapper messages with the Got*Message convention.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) return Effect.void
        if (!isMCall(node) || !hasSubmodelMessagePayloadProperty(node)) {
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
              'Submodel wrapper messages should be named Got*Message so Foldkit DevTools can filter them.',
          }),
        )
      },
    }
  },
})

const messageBindingMatchesTag = Rule.define({
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
        if (init === null || init === undefined) return Effect.void
        if (!isCallExpression(init)) return Effect.void
        if (!isMCall(init)) return Effect.void
        const messageName = firstStringArgument(init)
        if (messageName === undefined) return Effect.void
        if (!isIdentifier(node.id)) return Effect.void
        if (node.id.name === messageName.value) return Effect.void
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

const gotPrefixRequiresSubmodelPayload = Rule.define({
  name: 'got-prefix-requires-submodel-payload',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'A Got* Message must carry a submodel { message: Child.Message } payload.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) return Effect.void
        if (!isMCall(node)) return Effect.void
        const messageName = firstStringArgument(node)
        if (messageName === undefined) return Effect.void
        if (!/^Got[A-Z]/.test(messageName.value)) return Effect.void
        if (hasSubmodelMessagePayloadProperty(node)) return Effect.void
        return ctx.report(
          Diagnostic.make({
            node: messageName,
            message:
              "Got-prefixed Messages should wrap a submodel's Message via { message: Child.Message }.",
          }),
        )
      },
    }
  },
})

const preferCallableMessageConstructor = Rule.define({
  name: 'prefer-callable-message-constructor',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Construct Messages via their callable Schema constructor instead of casting an object literal.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      TSAsExpression: (node: ESTree.Node) => {
        if (!isTSAsExpression(node)) return Effect.void
        if (!isObjectExpression(node.expression)) return Effect.void
        if (!hasTagPropertyWithStringLiteral(node.expression)) {
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

const commandBindingMatchesName = Rule.define({
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
        if (nameArgument === undefined) return Effect.void
        if (!isIdentifier(node.id)) return Effect.void
        if (node.id.name === nameArgument.value) return Effect.void
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
    'no-noop-message': noNoopMessage,
    'prefer-callable-message-constructor': preferCallableMessageConstructor,
  },
})
