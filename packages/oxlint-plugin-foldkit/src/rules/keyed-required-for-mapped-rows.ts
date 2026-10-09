import { Array, Effect, Option, pipe } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
  type Variable,
} from 'effect-oxlint'

import {
  type ImportedPath,
  calleeMatchesHelperName,
  helperCalleeName,
  indexReferences,
  isArrayExpression,
  isCallExpression,
  isFoldkitHtmlBuilderMember,
  isIdentifier,
  isMemberExpression,
  resolveFoldkitApiPath,
  resolveImportedPath,
  resolvedVariable,
} from '../guards.ts'

const rowElementTagNames = ['li', 'div', 'tr', 'article', 'section']

const effectSingleValueMapNamespaces = [
  'Arbitrary',
  'Argument',
  'AsyncResult',
  'Atom',
  'Cause',
  'Channel',
  'Config',
  'Effect',
  'Either',
  'Exit',
  'Fiber',
  'Flag',
  'Logger',
  'Match',
  'Option',
  'Param',
  'Prompt',
  'Result',
  'STM',
  'Schedule',
  'SchemaGetter',
  'Sink',
  'Stream',
  'UndefinedOr',
]

const foldkitSingleValueMapNamespaces = ['AsyncData']

const singleValueMapNamespaces = [
  ...effectSingleValueMapNamespaces,
  ...foldkitSingleValueMapNamespaces,
]

// GUARDS

type ArrowCallback = Readonly<{
  type: 'ArrowFunctionExpression'
  params: ReadonlyArray<unknown>
  body: unknown
}>

const isArrowFunctionExpression = (node: unknown): node is ArrowCallback =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrowFunctionExpression'

const isBlockStatement = (
  node: unknown,
): node is Readonly<{ type: 'BlockStatement'; body: ReadonlyArray<unknown> }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'BlockStatement'

const isReturnStatement = (
  node: unknown,
): node is Readonly<{ type: 'ReturnStatement'; argument: unknown }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ReturnStatement'

const isObjectPattern = (
  node: unknown,
): node is Readonly<{
  type: 'ObjectPattern'
  properties: ReadonlyArray<unknown>
}> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ObjectPattern'

const effectModulePath = (
  path: ImportedPath,
): Option.Option<ReadonlyArray<string>> => {
  if (path.source === 'effect') {
    return Option.some(path.members)
  }
  if (path.source.startsWith('effect/')) {
    return Option.some([
      ...path.source.slice('effect/'.length).split('/'),
      ...path.members,
    ])
  }
  return Option.none()
}

const isEffectSingleValueMapCallee = (
  callee: unknown,
  references: WeakMap<ESTree.Node, Reference>,
): boolean =>
  pipe(
    resolveImportedPath(references, callee),
    Option.flatMap(effectModulePath),
    Option.exists(modulePath => {
      const [namespace, methodName] = Array.takeRight(modulePath, 2)

      return (
        namespace !== undefined &&
        effectSingleValueMapNamespaces.includes(namespace) &&
        methodName === 'map'
      )
    }),
  )

const isFoldkitSingleValueMapCallee = (
  callee: unknown,
  references: WeakMap<ESTree.Node, Reference>,
): boolean =>
  Option.exists(resolveFoldkitApiPath(references, callee), path => {
    const [namespace, methodName, extraMember] = path

    return (
      namespace !== undefined &&
      foldkitSingleValueMapNamespaces.includes(namespace) &&
      methodName === 'map' &&
      extraMember === undefined
    )
  })

const isSingleValueMapCallee = (
  callee: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references === undefined) {
    return (
      isMemberExpression(callee) &&
      !callee.computed &&
      isIdentifier(callee.property, 'map') &&
      isIdentifier(callee.object) &&
      singleValueMapNamespaces.includes(callee.object.name)
    )
  }

  return (
    isEffectSingleValueMapCallee(callee, references) ||
    isFoldkitSingleValueMapCallee(callee, references)
  )
}

const isMapCallee = (
  callee: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (calleeMatchesHelperName(callee, 'map')) {
    return true
  }
  if (references === undefined) {
    return false
  }

  return pipe(
    resolveImportedPath(references, callee),
    Option.flatMap(effectModulePath),
    Option.exists(modulePath => {
      const [namespace, methodName, extraMember] = modulePath

      return (
        namespace === 'Array' &&
        methodName === 'map' &&
        extraMember === undefined
      )
    }),
  )
}

const arrowCallback = (
  node: ESTree.CallExpression,
): Option.Option<ArrowCallback> => {
  const [firstArgument, secondArgument] = node.arguments
  if (isArrowFunctionExpression(firstArgument)) {
    return Option.some(firstArgument)
  }
  if (isArrowFunctionExpression(secondArgument)) {
    return Option.some(secondArgument)
  }
  return Option.none()
}

const referencesIdOfParameter = (
  value: unknown,
  parameterName: string,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  parameterVariable: Variable | undefined,
): boolean => {
  if (Array.isArray(value)) {
    return value.some(element =>
      referencesIdOfParameter(
        element,
        parameterName,
        references,
        parameterVariable,
      ),
    )
  }
  if (typeof value !== 'object' || value === null) {
    return false
  }
  if (
    isMemberExpression(value) &&
    isIdentifier(value.object, parameterName) &&
    isIdentifier(value.property, 'id') &&
    (references === undefined ||
      (parameterVariable !== undefined &&
        Option.exists(
          resolvedVariable(references, value.object),
          variable => variable === parameterVariable,
        )))
  ) {
    return true
  }
  const fieldEntries = Object.entries(value)
  return fieldEntries.some(
    ([fieldName, fieldValue]) =>
      fieldName !== 'parent' &&
      referencesIdOfParameter(
        fieldValue,
        parameterName,
        references,
        parameterVariable,
      ),
  )
}

const destructuresId = (
  pattern: Readonly<{ properties: ReadonlyArray<unknown> }>,
): boolean =>
  pattern.properties.some(
    property =>
      typeof property === 'object' &&
      property !== null &&
      'key' in property &&
      isIdentifier(property.key, 'id'),
  )

const isIdentityBearing = (
  callback: ArrowCallback,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  declaredVariables: ReadonlyArray<Variable>,
): boolean => {
  const [firstParameter] = callback.params
  if (isIdentifier(firstParameter)) {
    const parameterVariable = declaredVariables.find(variable =>
      variable.identifiers.some(identifier => identifier === firstParameter),
    )

    return referencesIdOfParameter(
      callback.body,
      firstParameter.name,
      references,
      parameterVariable,
    )
  }
  if (isObjectPattern(firstParameter)) {
    return destructuresId(firstParameter)
  }
  return false
}

const callbackReturnExpression = (
  callback: ArrowCallback,
): Option.Option<unknown> => {
  if (!isBlockStatement(callback.body)) {
    return Option.some(callback.body)
  }
  return pipe(
    callback.body.body,
    Array.findLast(isReturnStatement),
    Option.flatMap(returnStatement =>
      Option.fromNullishOr(returnStatement.argument),
    ),
  )
}

const isKeyedWrapped = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean =>
  isCallExpression(node.callee) &&
  isFoldkitHtmlBuilderMember(node.callee.callee, 'keyed', references)

const hasKeyAttribute = (
  rowElementCall: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  const [attributesArgument] = rowElementCall.arguments
  if (!isArrayExpression(attributesArgument)) {
    return false
  }
  return attributesArgument.elements.some(
    element =>
      isCallExpression(element) &&
      isFoldkitHtmlBuilderMember(element.callee, 'Key', references),
  )
}

type UnkeyedRow = Readonly<{
  rowElementCall: ESTree.CallExpression
  tagName: string
}>

const unkeyedRowElement = (
  returnExpression: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<UnkeyedRow> => {
  if (!isCallExpression(returnExpression)) {
    return Option.none()
  }
  if (
    isKeyedWrapped(returnExpression, references) ||
    hasKeyAttribute(returnExpression, references)
  ) {
    return Option.none()
  }
  return pipe(
    helperCalleeName(returnExpression.callee),
    Option.filter(tagName => rowElementTagNames.includes(tagName)),
    Option.filter(tagName =>
      isFoldkitHtmlBuilderMember(returnExpression.callee, tagName, references),
    ),
    Option.map(tagName => ({ rowElementCall: returnExpression, tagName })),
  )
}

// RULE

/**
 * Requires a map callback that returns an identity-bearing row element (one
 * whose callback references the item's id) to wrap that element in keyed, so
 * the runtime patches the right rows when the list reorders or shrinks.
 */
export const keyedRequiredForMappedRows = Rule.define({
  name: 'keyed-required-for-mapped-rows',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Wrap identity-bearing mapped row elements in keyed so the runtime patches the right rows.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopeManager = ctx.sourceCode.scopeManager
    const references =
      scopeManager === undefined
        ? undefined
        : indexReferences(scopeManager.scopes)
    return {
      CallExpression: (node: ESTree.Node) => {
        if (
          !isCallExpression(node) ||
          !isMapCallee(node.callee, references) ||
          isSingleValueMapCallee(node.callee, references)
        ) {
          return Effect.void
        }
        return pipe(
          arrowCallback(node),
          Option.filter(callback =>
            isIdentityBearing(
              callback,
              references,
              scopeManager?.getDeclaredVariables(callback as ESTree.Node) ?? [],
            ),
          ),
          Option.flatMap(callbackReturnExpression),
          Option.flatMap(returnExpression =>
            unkeyedRowElement(returnExpression, references),
          ),
          Option.match({
            onNone: () => Effect.void,
            onSome: ({ rowElementCall, tagName }) =>
              ctx.report(
                Diagnostic.make({
                  node: rowElementCall,
                  message: `This map callback returns \`${tagName}(...)\` without a \`keyed\` wrapper. When the list reorders or loses a row, the runtime patches surviving rows in place and event handlers can end up on the wrong row. Wrap it as \`keyed('${tagName}')(item.id, attributes, children)\` using a stable Model identifier, or suppress a genuinely identity-free row with \`// oxlint-disable-next-line foldkit/keyed-required-for-mapped-rows\`.`,
                }),
              ),
          }),
        )
      },
    }
  },
})
