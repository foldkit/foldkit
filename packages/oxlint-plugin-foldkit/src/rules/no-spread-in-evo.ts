import { Array, Effect, Option, pipe } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { isCallExpression, isObjectExpression } from '../guards.ts'

const nestedEvoMessage = (fieldName: string): string =>
  `The updater for field \`${fieldName}\` rebuilds the record with a spread, stepping outside the strict Model update path. Use a nested \`evo\` instead: \`${fieldName}: () => evo(model.${fieldName}, { ... })\`.`

const isEvoCall = (node: ESTree.CallExpression): boolean => {
  const callee = node.callee
  if (callee.type === 'Identifier') {
    return callee.name === 'evo'
  }
  return (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'evo'
  )
}

const isReturnStatement = (
  statement: ESTree.Directive | ESTree.Statement,
): statement is ESTree.ReturnStatement => statement.type === 'ReturnStatement'

const updaterBodyObject = (
  updater: ESTree.ArrowFunctionExpression,
): Option.Option<ESTree.ObjectExpression> => {
  const body = updater.body
  if (body.type === 'ObjectExpression') return Option.some(body)
  if (body.type === 'BlockStatement') {
    return pipe(
      body.body,
      Array.findFirst(isReturnStatement),
      Option.flatMap(returnStatement =>
        Option.fromNullishOr(returnStatement.argument),
      ),
      Option.filter(isObjectExpression),
    )
  }
  return Option.none()
}

const hasSpreadProperty = (
  objectExpression: ESTree.ObjectExpression,
): boolean =>
  objectExpression.properties.some(
    property => property.type === 'SpreadElement',
  )

const hasComputedKey = (objectExpression: ESTree.ObjectExpression): boolean =>
  objectExpression.properties.some(
    property => property.type === 'Property' && property.computed,
  )

const updaterFieldName = (property: ESTree.ObjectProperty): string =>
  !property.computed && property.key.type === 'Identifier'
    ? property.key.name
    : '<key>'

const spreadRebuiltFields = (
  node: ESTree.CallExpression,
): ReadonlyArray<
  Readonly<{ fieldName: string; bodyObject: ESTree.ObjectExpression }>
> => {
  if (!isEvoCall(node)) return []
  const [, updates] = node.arguments
  if (updates === undefined || updates.type !== 'ObjectExpression') return []
  return updates.properties.flatMap(property => {
    if (property.type !== 'Property') return []
    if (property.value.type !== 'ArrowFunctionExpression') return []
    return pipe(
      updaterBodyObject(property.value),
      Option.filter(hasSpreadProperty),
      Option.filter(bodyObject => !hasComputedKey(bodyObject)),
      Option.match({
        onNone: () => [],
        onSome: bodyObject => [
          { fieldName: updaterFieldName(property), bodyObject },
        ],
      }),
    )
  })
}

/** Flags evo field updaters that rebuild a record with an object spread. Nested record updates go through a nested evo so every level of Model evolution stays on the strict update path. */
export const noSpreadInEvo = Rule.define({
  name: 'no-spread-in-evo',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Use a nested evo instead of spreading a record inside an evo field updater.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) return Effect.void
        return Effect.forEach(
          spreadRebuiltFields(node),
          ({ fieldName, bodyObject }) =>
            ctx.report(
              Diagnostic.make({
                node: bodyObject,
                message: nestedEvoMessage(fieldName),
              }),
            ),
          { discard: true },
        )
      },
    }
  },
})
