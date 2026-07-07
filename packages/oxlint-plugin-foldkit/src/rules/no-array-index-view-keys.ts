import { Array, Effect, Option, Ref } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  calleeMatchesHelperName,
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isObjectExpression,
  isStringLiteral,
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

const mapCallbackIndexParameterName = (
  node: ESTree.Node,
): Option.Option<string> => {
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
  return Option.some(secondParameter.name)
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

const keySinkExpression = (
  node: ESTree.CallExpression,
  slotNames: ReadonlyArray<string>,
): Option.Option<ESTree.Expression> => {
  if (
    isCallExpression(node.callee) &&
    calleeMatchesHelperName(node.callee.callee, 'keyed')
  ) {
    return firstNonSpreadArgument(node)
  }
  if (calleeMatchesHelperName(node.callee, 'Key')) {
    return firstNonSpreadArgument(node)
  }
  if (calleeMatchesHelperName(node.callee, 'submodel')) {
    const [configArgument] = node.arguments
    if (isObjectExpression(configArgument)) {
      return slotIdValue(configArgument)
    }
  }
  if (isIdentifier(node.callee) && slotNames.includes(node.callee.name)) {
    return firstNonSpreadArgument(node)
  }
  return Option.none()
}

const referencesIndexName = (value: unknown, indexName: string): boolean => {
  if (Array.isArray(value)) {
    return value.some(element => referencesIndexName(element, indexName))
  }
  if (typeof value !== 'object' || value === null) {
    return false
  }
  if (isIdentifier(value, indexName)) {
    return true
  }
  if (isMemberExpression(value)) {
    if (referencesIndexName(value.object, indexName)) {
      return true
    }
    return (
      value.computed === true && referencesIndexName(value.property, indexName)
    )
  }
  if (isProperty(value)) {
    if (value.computed === true && referencesIndexName(value.key, indexName)) {
      return true
    }
    return referencesIndexName(value.value, indexName)
  }
  if (isArrowFunctionExpression(value)) {
    const parameters = value.params
    const isShadowed = parameters.some(parameter =>
      isIdentifier(parameter, indexName),
    )
    if (isShadowed) {
      return false
    }
  }
  return referencesIndexNameAcrossFields(value, indexName)
}

const referencesIndexNameAcrossFields = (
  value: object,
  indexName: string,
): boolean => {
  const fieldEntries = Object.entries(value)
  return fieldEntries.some(
    ([fieldName, fieldValue]) =>
      fieldName !== 'parent' && referencesIndexName(fieldValue, indexName),
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
    const indexNameStack = yield* Ref.make<ReadonlyArray<string>>([])
    const slotNames = yield* Ref.make<ReadonlyArray<string>>([])
    return {
      VariableDeclarator: (node: ESTree.Node) => {
        if (
          !isVariableDeclarator(node) ||
          !isIdentifier(node.id) ||
          !isCallExpression(node.init) ||
          !calleeMatchesHelperName(node.init.callee, 'createKeyedLazy')
        ) {
          return Effect.void
        }
        return Ref.update(slotNames, Array.append(node.id.name))
      },
      ArrowFunctionExpression: (node: ESTree.Node) =>
        Option.match(mapCallbackIndexParameterName(node), {
          onNone: () => Effect.void,
          onSome: indexName =>
            Ref.update(indexNameStack, Array.append(indexName)),
        }),
      'ArrowFunctionExpression:exit': (node: ESTree.Node) =>
        Option.match(mapCallbackIndexParameterName(node), {
          onNone: () => Effect.void,
          onSome: () =>
            Ref.update(indexNameStack, activeIndexNames =>
              Array.dropRight(activeIndexNames, 1),
            ),
        }),
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        return Effect.gen(function* () {
          const activeIndexNames = yield* Ref.get(indexNameStack)
          if (Array.isReadonlyArrayEmpty(activeIndexNames)) {
            return
          }
          const registeredSlotNames = yield* Ref.get(slotNames)
          const maybeKeyExpression = keySinkExpression(
            node,
            registeredSlotNames,
          )
          if (Option.isNone(maybeKeyExpression)) {
            return
          }
          const keyExpression = maybeKeyExpression.value
          const maybeIndexName = Array.findFirst(activeIndexNames, indexName =>
            referencesIndexName(keyExpression, indexName),
          )
          if (Option.isNone(maybeIndexName)) {
            return
          }
          yield* ctx.report(
            Diagnostic.make({
              node: keyExpression,
              message: `The array index parameter \`${maybeIndexName.value}\` is used as a view key. Positions shift when the list reorders or loses an item, so the runtime patches the wrong rows. Key this row or Submodel by a stable Model identifier such as \`item.id\` instead.`,
            }),
          )
        })
      },
    }
  },
})
