import { Array, Effect, Option, Ref } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
  type ScopeManager,
  type Variable,
} from 'effect-oxlint'

import {
  calleeMatchesHelperName,
  indexReferences,
  isCallExpression,
  isFoldkitHtmlBuilderMember,
  isIdentifier,
  isIdentifierReference,
  isMemberExpression,
  isObjectExpression,
  isStringLiteral,
  resolveFoldkitApiPath,
  resolvedVariable,
} from '../guards.ts'

// GUARDS

const isProperty = (
  node: unknown,
): node is Readonly<{
  type: 'Property'
  key: unknown
  value: unknown
  computed?: boolean
}> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Property'

const isArrowFunctionExpression = (
  node: unknown,
): node is Readonly<{
  type: 'ArrowFunctionExpression'
  params: ReadonlyArray<unknown>
  parent?: unknown
}> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrowFunctionExpression'

const isVariableDeclarator = (
  node: ESTree.Node,
): node is ESTree.VariableDeclarator => node.type === 'VariableDeclarator'

type MapIndexBinding = Readonly<{
  name: string
  variable: Variable | undefined
}>

const isCreateKeyedLazyCall = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references === undefined) {
    return calleeMatchesHelperName(node.callee, 'createKeyedLazy')
  }

  return Option.exists(resolveFoldkitApiPath(references, node.callee), path => {
    const [namespace, factoryName, extraMember] = path

    return (
      namespace === 'Html' &&
      factoryName === 'createKeyedLazy' &&
      extraMember === undefined
    )
  })
}

const mapCallbackIndexParameter = (
  node: ESTree.Node,
  scopeManager: ScopeManager | undefined,
): Option.Option<MapIndexBinding> => {
  if (!isArrowFunctionExpression(node)) {
    return Option.none()
  }
  const enclosingCall = node.parent
  if (
    !isCallExpression(enclosingCall) ||
    !calleeMatchesHelperName(enclosingCall.callee, 'map')
  ) {
    return Option.none()
  }
  const [firstArgument, secondArgument] = enclosingCall.arguments
  const callbackPositions: ReadonlyArray<unknown> = [
    firstArgument,
    secondArgument,
  ]
  if (!callbackPositions.includes(node)) {
    return Option.none()
  }
  const [, secondParameter] = node.params
  if (!isIdentifier(secondParameter)) {
    return Option.none()
  }
  const name = secondParameter.name
  const variable = scopeManager
    ?.getDeclaredVariables(node)
    .find(candidate => candidate.name === name)

  return Option.some({ name, variable })
}

const firstNonSpreadArgument = (
  node: ESTree.CallExpression,
): Option.Option<ESTree.Expression> => {
  const [firstArgument] = node.arguments
  if (firstArgument === undefined || firstArgument.type === 'SpreadElement') {
    return Option.none()
  }
  return Option.some(firstArgument)
}

const isSlotIdKey = (key: unknown): boolean =>
  isIdentifier(key, 'slotId') ||
  (isStringLiteral(key) && key.value === 'slotId')

const isSlotIdProperty = (
  property: ESTree.ObjectProperty | ESTree.SpreadElement,
): property is ESTree.ObjectProperty =>
  property.type === 'Property' &&
  !property.computed &&
  isSlotIdKey(property.key)

const slotIdValue = (
  configObject: ESTree.ObjectExpression,
): Option.Option<ESTree.Expression> =>
  Option.map(
    Array.findFirst(configObject.properties, isSlotIdProperty),
    property => property.value,
  )

type KeyedLazySlot = Readonly<{
  name: string
  variable: Variable | undefined
}>

const keySinkExpression = (
  node: ESTree.CallExpression,
  slots: ReadonlyArray<KeyedLazySlot>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.Expression> => {
  if (
    isCallExpression(node.callee) &&
    isFoldkitHtmlBuilderMember(node.callee.callee, 'keyed', references)
  ) {
    return firstNonSpreadArgument(node)
  }
  if (isFoldkitHtmlBuilderMember(node.callee, 'Key', references)) {
    return firstNonSpreadArgument(node)
  }
  if (isFoldkitHtmlBuilderMember(node.callee, 'submodel', references)) {
    const [configArgument] = node.arguments
    if (isObjectExpression(configArgument)) {
      return slotIdValue(configArgument)
    }
  }
  if (isIdentifierReference(node.callee)) {
    const slotCallee = node.callee
    const isRegisteredSlot = slots.some(
      slot =>
        slot.name === slotCallee.name &&
        (references === undefined ||
          (slot.variable !== undefined &&
            Option.exists(
              resolvedVariable(references, slotCallee),
              variable => variable === slot.variable,
            ))),
    )
    if (isRegisteredSlot) {
      return firstNonSpreadArgument(node)
    }
  }
  return Option.none()
}

const referencesIndexBinding = (
  value: unknown,
  indexBinding: MapIndexBinding,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (Array.isArray(value)) {
    return value.some(element =>
      referencesIndexBinding(element, indexBinding, references),
    )
  }
  if (typeof value !== 'object' || value === null) {
    return false
  }
  if (isIdentifierReference(value) && value.name === indexBinding.name) {
    return (
      references === undefined ||
      (indexBinding.variable !== undefined &&
        Option.exists(
          resolvedVariable(references, value),
          variable => variable === indexBinding.variable,
        ))
    )
  }
  if (isMemberExpression(value)) {
    if (referencesIndexBinding(value.object, indexBinding, references)) {
      return true
    }
    return (
      value.computed === true &&
      referencesIndexBinding(value.property, indexBinding, references)
    )
  }
  if (isProperty(value)) {
    if (
      value.computed === true &&
      referencesIndexBinding(value.key, indexBinding, references)
    ) {
      return true
    }
    return referencesIndexBinding(value.value, indexBinding, references)
  }
  if (references === undefined && isArrowFunctionExpression(value)) {
    const parameters = value.params
    const isShadowed = parameters.some(parameter =>
      isIdentifier(parameter, indexBinding.name),
    )
    if (isShadowed) {
      return false
    }
  }
  return referencesIndexBindingAcrossFields(value, indexBinding, references)
}

const referencesIndexBindingAcrossFields = (
  value: object,
  indexBinding: MapIndexBinding,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  const fieldEntries = Object.entries(value)
  return fieldEntries.some(
    ([fieldName, fieldValue]) =>
      fieldName !== 'parent' &&
      referencesIndexBinding(fieldValue, indexBinding, references),
  )
}

// RULE

/**
 * Disallows using a map callback's array index parameter as the key fed into
 * a keyed element, a Key attribute, a Submodel slotId, or a createKeyedLazy
 * slot call. Array positions shift when a list mutates, so view keys must
 * come from stable Model identifiers.
 */
export const noArrayIndexViewKeys = Rule.define({
  name: 'no-array-index-view-keys',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Key rows and Submodels by stable Model identifiers instead of map callback array indexes.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const scopeManager = ctx.sourceCode.scopeManager
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    const indexBindingStack = yield* Ref.make<ReadonlyArray<MapIndexBinding>>(
      [],
    )
    const slots = yield* Ref.make<ReadonlyArray<KeyedLazySlot>>([])
    return {
      VariableDeclarator: (node: ESTree.Node) => {
        if (
          !isVariableDeclarator(node) ||
          node.id.type !== 'Identifier' ||
          !isCallExpression(node.init) ||
          !isCreateKeyedLazyCall(node.init, references)
        ) {
          return Effect.void
        }
        const slotName = node.id.name
        const variable = scopeManager
          ?.getDeclaredVariables(node)
          .find(candidate => candidate.name === slotName)
        return Ref.update(slots, Array.append({ name: slotName, variable }))
      },
      ArrowFunctionExpression: (node: ESTree.Node) =>
        Option.match(mapCallbackIndexParameter(node, scopeManager), {
          onNone: () => Effect.void,
          onSome: indexBinding =>
            Ref.update(indexBindingStack, Array.append(indexBinding)),
        }),
      'ArrowFunctionExpression:exit': (node: ESTree.Node) =>
        Option.match(mapCallbackIndexParameter(node, scopeManager), {
          onNone: () => Effect.void,
          onSome: () =>
            Ref.update(indexBindingStack, activeIndexBindings =>
              Array.dropRight(activeIndexBindings, 1),
            ),
        }),
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        return Effect.gen(function* () {
          const activeIndexBindings = yield* Ref.get(indexBindingStack)
          if (Array.isReadonlyArrayEmpty(activeIndexBindings)) {
            return
          }
          const registeredSlots = yield* Ref.get(slots)
          const maybeKeyExpression = keySinkExpression(
            node,
            registeredSlots,
            references,
          )
          if (Option.isNone(maybeKeyExpression)) {
            return
          }
          const { value: keyExpression } = maybeKeyExpression
          const maybeIndexBinding = Array.findFirst(
            activeIndexBindings,
            indexBinding =>
              referencesIndexBinding(keyExpression, indexBinding, references),
          )
          if (Option.isNone(maybeIndexBinding)) {
            return
          }
          yield* ctx.report(
            Diagnostic.make({
              node: keyExpression,
              message: `The array index parameter \`${maybeIndexBinding.value.name}\` is used as a view key. Positions shift when the list reorders or loses an item, so the runtime patches the wrong rows. Key this row or Submodel by a stable Model identifier such as \`item.id\` instead.`,
            }),
          )
        })
      },
    }
  },
})
