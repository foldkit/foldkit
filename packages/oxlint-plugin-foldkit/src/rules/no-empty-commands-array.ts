import { Array, Effect, Option } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  isArrayExpression,
  isObjectExpression,
  isObjectProperty,
  staticPropertyName,
} from '../guards.ts'

const COMMANDS_PROPERTY = 'commands'

const isEmptyCommandsProperty = (property: ESTree.ObjectProperty): boolean =>
  Option.contains(staticPropertyName(property), COMMANDS_PROPERTY) &&
  isArrayExpression(property.value) &&
  Array.isReadonlyArrayEmpty(property.value.elements)

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

const emptyCommandsMessage =
  'Return { model } instead of the literal { model, commands: [] }. Return a computed Commands collection directly, even when it may be empty.'

/** Flags only a `commands` property whose value is a literal empty array. A
 *  producer with statically no Commands omits the property; a producer with a
 *  computed Commands collection returns it directly. This syntax-only rule
 *  does not determine whether the enclosing object is an update result. */
export const noEmptyCommandsArray = Rule.define({
  name: 'no-empty-commands-array',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Omit a literal empty commands property from an update result.',
    fixable: 'code',
  }),
  create: function* () {
    const ctx = yield* RuleContext
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
        const commandProperties = Array.filter(
          node.properties,
          property =>
            isObjectProperty(property) &&
            Option.contains(staticPropertyName(property), COMMANDS_PROPERTY),
        )
        const hasComments = Array.isReadonlyArrayNonEmpty(
          ctx.sourceCode.getCommentsInside(node),
        )

        return Effect.forEach(
          node.properties.entries(),
          ([index, property]) => {
            if (
              !isObjectProperty(property) ||
              !isEmptyCommandsProperty(property)
            ) {
              return Effect.void
            }

            const diagnostic = Diagnostic.make({
              node: property,
              message: emptyCommandsMessage,
            })
            if (
              hasSpread ||
              hasDynamicComputedProperty ||
              hasComments ||
              Array.isReadonlyArrayNonEmpty(Array.drop(commandProperties, 1))
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
