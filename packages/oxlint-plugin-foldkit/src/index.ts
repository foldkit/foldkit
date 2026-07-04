import { Effect } from 'effect'
import {
  Diagnostic,
  type ESTree,
  Plugin,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import { commandDefinePascalConst } from './rules/command-define-pascal-const.ts'
import { gotWrapperCarriesOnlyRouting } from './rules/got-wrapper-carries-only-routing.ts'
import { keyedRequiredForMappedRows } from './rules/keyed-required-for-mapped-rows.ts'
import { labelRequiresFor } from './rules/label-requires-for.ts'
import { lazyViewStableReferences } from './rules/lazy-view-stable-references.ts'
import { managedResourceForStatefulHandles } from './rules/managed-resource-for-stateful-handles.ts'
import { mountFactoryMustUseElement } from './rules/mount-factory-must-use-element.ts'
import { noArrayIndexViewKeys } from './rules/no-array-index-view-keys.ts'
import { noChangedMessagePrefix } from './rules/no-changed-message-prefix.ts'
import { noChildMessageConstructionInRoot } from './rules/no-child-message-construction-in-root.ts'
import { noDisablingDevGuardrails } from './rules/no-disabling-dev-guardrails.ts'
import { noDuplicateOnmountPerElement } from './rules/no-duplicate-onmount-per-element.ts'
import { noExplicitCommandTypeAnnotation } from './rules/no-explicit-command-type-annotation.ts'
import { noHandRolledCommandStruct } from './rules/no-hand-rolled-command-struct.ts'
import { noHardcodedRouteStrings } from './rules/no-hardcoded-route-strings.ts'
import { noImpureCallsInPureLayer } from './rules/no-impure-calls-in-pure-layer.ts'
import { noRawDomEventAttributes } from './rules/no-raw-dom-event-attributes.ts'
import { noSpreadInEvo } from './rules/no-spread-in-evo.ts'
import { preferDomHelpersForElementOps } from './rules/prefer-dom-helpers-for-element-ops.ts'
import { preferEmptyOverEmptyElement } from './rules/prefer-empty-over-empty-element.ts'
import { preferEvoOverModelSpread } from './rules/prefer-evo-over-model-spread.ts'
import { preferStoryCommandMatchers } from './rules/prefer-story-command-matchers.ts'
import { requireCompletedMirrorsCommand } from './rules/require-completed-mirrors-command.ts'
import { requirePastTenseMessageNames } from './rules/require-past-tense-message-names.ts'
import { requireRelForExternalLink } from './rules/require-rel-for-external-link.ts'
import { requireSucceededFailedPair } from './rules/require-succeeded-failed-pair.ts'
import { routeOneOfShadowingOrder } from './rules/route-oneof-shadowing-order.ts'
import { routeUnionParserRegistration } from './rules/route-union-parser-registration.ts'
import { selectionSubmodelFactoryAtModuleScope } from './rules/selection-submodel-factory-at-module-scope.ts'
import { subscriptionFileCanonicalShape } from './rules/subscription-file-canonical-shape.ts'
import { uiToviewMustSpreadAttributeBundles } from './rules/ui-toview-must-spread-attribute-bundles.ts'
import { wrapChildOutputInGotMessage } from './rules/wrap-child-output-in-got-message.ts'

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

const isVariableDeclaration = (
  node: unknown,
): node is ESTree.VariableDeclaration =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'VariableDeclaration'

const isProgram = (node: ESTree.Node): node is ESTree.Program =>
  node.type === 'Program'

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

const isMutableDeclaration = (node: ESTree.VariableDeclaration): boolean =>
  (node.kind === 'let' || node.kind === 'var') && node.declare !== true

const topLevelMutableDeclarations = (
  program: ESTree.Program,
): ReadonlyArray<ESTree.VariableDeclaration> =>
  program.body.flatMap(statement => {
    const declaration =
      statement.type === 'ExportNamedDeclaration'
        ? statement.declaration
        : statement
    return isVariableDeclaration(declaration) &&
      isMutableDeclaration(declaration)
      ? [declaration]
      : []
  })

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

export const noModuleLevelMutableState = Rule.define({
  name: 'no-module-level-mutable-state',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep state in the Model instead of module-level let/var bindings.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      Program: (node: ESTree.Node) => {
        if (!isProgram(node)) return Effect.void
        return Effect.forEach(
          topLevelMutableDeclarations(node),
          declaration =>
            ctx.report(
              Diagnostic.make({
                node: declaration,
                message:
                  'Module-level let/var holds state outside the Model. Move the data into the Model, or scope a live handle to a lifecycle primitive like Mount or ManagedResource.',
              }),
            ),
          { discard: true },
        )
      },
    }
  },
})

export default Plugin.define({
  name: 'foldkit',
  rules: {
    'command-binding-matches-name': commandBindingMatchesName,
    'command-define-pascal-const': commandDefinePascalConst,
    'got-prefix-requires-submodel-payload': gotPrefixRequiresSubmodelPayload,
    'got-submodel-message-name': gotSubmodelMessageName,
    'got-wrapper-carries-only-routing': gotWrapperCarriesOnlyRouting,
    'keyed-required-for-mapped-rows': keyedRequiredForMappedRows,
    'label-requires-for': labelRequiresFor,
    'lazy-view-stable-references': lazyViewStableReferences,
    'managed-resource-for-stateful-handles': managedResourceForStatefulHandles,
    'message-binding-matches-tag': messageBindingMatchesTag,
    'mount-factory-must-use-element': mountFactoryMustUseElement,
    'no-array-index-view-keys': noArrayIndexViewKeys,
    'no-changed-message-prefix': noChangedMessagePrefix,
    'no-child-message-construction-in-root': noChildMessageConstructionInRoot,
    'no-disabling-dev-guardrails': noDisablingDevGuardrails,
    'no-duplicate-onmount-per-element': noDuplicateOnmountPerElement,
    'no-empty-object-tagged-call': noEmptyObjectTaggedCall,
    'no-explicit-command-type-annotation': noExplicitCommandTypeAnnotation,
    'no-hand-rolled-command-struct': noHandRolledCommandStruct,
    'no-hardcoded-route-strings': noHardcodedRouteStrings,
    'no-impure-calls-in-pure-layer': noImpureCallsInPureLayer,
    'no-module-level-mutable-state': noModuleLevelMutableState,
    'no-noop-message': noNoopMessage,
    'no-raw-dom-event-attributes': noRawDomEventAttributes,
    'no-spread-in-evo': noSpreadInEvo,
    'prefer-callable-message-constructor': preferCallableMessageConstructor,
    'prefer-dom-helpers-for-element-ops': preferDomHelpersForElementOps,
    'prefer-empty-over-empty-element': preferEmptyOverEmptyElement,
    'prefer-evo-over-model-spread': preferEvoOverModelSpread,
    'prefer-story-command-matchers': preferStoryCommandMatchers,
    'require-completed-mirrors-command': requireCompletedMirrorsCommand,
    'require-past-tense-message-names': requirePastTenseMessageNames,
    'require-rel-for-external-link': requireRelForExternalLink,
    'require-succeeded-failed-pair': requireSucceededFailedPair,
    'route-oneof-shadowing-order': routeOneOfShadowingOrder,
    'route-union-parser-registration': routeUnionParserRegistration,
    'selection-submodel-factory-at-module-scope':
      selectionSubmodelFactoryAtModuleScope,
    'subscription-file-canonical-shape': subscriptionFileCanonicalShape,
    'ui-toview-must-spread-attribute-bundles':
      uiToviewMustSpreadAttributeBundles,
    'wrap-child-output-in-got-message': wrapChildOutputInGotMessage,
  },
})
