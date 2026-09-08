import { Array, Effect, Option } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import {
  indexReferences,
  isIdentifierReference,
  isObjectExpression,
  isObjectProperty,
  isUnshadowedReference,
  staticPropertyName,
} from '../guards.ts'

const TO_PARENT_OUT_MESSAGE_PROPERTY = 'toParentOutMessage'

const isArrowFunctionExpression = (
  node: unknown,
): node is ESTree.ArrowFunctionExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrowFunctionExpression'

const isFunctionExpression = (node: unknown): node is ESTree.Function =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'FunctionExpression'

const isMapperFunction = (
  node: unknown,
): node is ESTree.ArrowFunctionExpression | ESTree.Function =>
  (isArrowFunctionExpression(node) && !node.async) ||
  (isFunctionExpression(node) && !node.async && !node.generator)

const isUnshadowedUndefined = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  node: unknown,
): boolean => {
  if (!isIdentifierReference(node) || node.name !== 'undefined') {
    return false
  }
  return isUnshadowedReference(references, node)
}

const directlyReturnsUndefined = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  mapper: ESTree.ArrowFunctionExpression | ESTree.Function,
): boolean => {
  if (mapper.body === null) {
    return false
  }
  if (mapper.body.type !== 'BlockStatement') {
    return isUnshadowedUndefined(references, mapper.body)
  }

  const [firstStatement, secondStatement] = mapper.body.body
  return (
    firstStatement?.type === 'ReturnStatement' &&
    secondStatement === undefined &&
    isUnshadowedUndefined(references, firstStatement.argument)
  )
}

const isEmptyMapperProperty = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  property: ESTree.ObjectProperty,
): boolean =>
  property.kind === 'init' &&
  Option.contains(
    staticPropertyName(property),
    TO_PARENT_OUT_MESSAGE_PROPERTY,
  ) &&
  isMapperFunction(property.value) &&
  directlyReturnsUndefined(references, property.value)

const removalRange = (
  sourceText: string,
  object: ESTree.ObjectExpression,
  property: ESTree.ObjectProperty,
  index: number,
): [number, number] => {
  const maybePrevious = Array.get(object.properties, index - 1)
  if (Option.isSome(maybePrevious)) {
    return [maybePrevious.value.end, property.end]
  }

  const maybeNext = Array.get(object.properties, index + 1)
  if (Option.isSome(maybeNext)) {
    return [property.start, maybeNext.value.start]
  }

  const trailingComma = /^\s*,/.exec(sourceText.slice(property.end, object.end))
  if (trailingComma === null) {
    return property.range
  }
  const maybeMatchedText = Array.head(trailingComma)
  if (Option.isNone(maybeMatchedText)) {
    return property.range
  }

  return [property.start, property.end + maybeMatchedText.value.length]
}

const emptyMapperMessage =
  'Omit toParentOutMessage. This mapper directly returns undefined, so it forwards nothing to the parent.'

/**
 * Flags an inline `toParentOutMessage` mapper that directly returns
 * `undefined`. That mapper forwards nothing to the parent, so the property
 * should be omitted. This syntax-only rule does not inspect async functions,
 * generators, getters, setters, or mappers referenced by name.
 */
export const noEmptyToParentOutMessage = Rule.define({
  name: 'no-empty-to-parent-out-message',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Omit an inline toParentOutMessage mapper that directly returns undefined.',
    fixable: 'code',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)

    return {
      ObjectExpression: (node: ESTree.Node) => {
        if (!isObjectExpression(node)) {
          return Effect.void
        }

        const hasSpread = Array.some(
          node.properties,
          property => property.type === 'SpreadElement',
        )
        const hasDynamicComputedProperty = Array.some(
          node.properties,
          property =>
            isObjectProperty(property) &&
            property.computed &&
            Option.isNone(staticPropertyName(property)),
        )
        const mapperProperties = Array.filter(
          node.properties,
          property =>
            isObjectProperty(property) &&
            Option.contains(
              staticPropertyName(property),
              TO_PARENT_OUT_MESSAGE_PROPERTY,
            ),
        )
        const hasComments = Array.isReadonlyArrayNonEmpty(
          ctx.sourceCode.getCommentsInside(node),
        )

        return Effect.forEach(
          node.properties.entries(),
          ([index, property]) => {
            if (
              !isObjectProperty(property) ||
              !isEmptyMapperProperty(references, property)
            ) {
              return Effect.void
            }

            const diagnostic = Diagnostic.make({
              node: property,
              message: emptyMapperMessage,
            })
            if (
              hasSpread ||
              hasDynamicComputedProperty ||
              hasComments ||
              Array.isReadonlyArrayNonEmpty(Array.drop(mapperProperties, 1))
            ) {
              return ctx.report(diagnostic)
            }

            return ctx.report(
              Diagnostic.withFix(diagnostic, fixer =>
                fixer.removeRange(
                  removalRange(ctx.sourceCode.text, node, property, index),
                ),
              ),
            )
          },
          { discard: true },
        )
      },
    }
  },
})
