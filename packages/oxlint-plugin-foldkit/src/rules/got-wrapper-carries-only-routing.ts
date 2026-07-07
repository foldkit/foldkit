import { Effect, Option, pipe } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Ranged,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import {
  isCallExpression,
  isIdentifier,
  isObjectExpression,
  isStringLiteral,
} from '../guards.ts'

const gotWrapperTagPattern = /^Got[A-Z]/

const routingKeySuffixPattern = /Id$/

const isRoutingKey = (keyName: string): boolean =>
  keyName === 'message' ||
  keyName === 'id' ||
  routingKeySuffixPattern.test(keyName)

type StaticPropertyKey = Readonly<{
  keyNode: Ranged
  keyName: string
}>

const staticPropertyKey = (
  property: ESTree.ObjectPropertyKind,
): Option.Option<StaticPropertyKey> => {
  if (property.type !== 'Property' || property.computed) {
    return Option.none()
  }
  if (isIdentifier(property.key)) {
    return Option.some({ keyNode: property.key, keyName: property.key.name })
  }
  if (isStringLiteral(property.key)) {
    return Option.some({ keyNode: property.key, keyName: property.key.value })
  }
  return Option.none()
}

const extraFieldMessage = (wrapperTag: string, keyName: string): string =>
  `Got wrapper \`${wrapperTag}\` declares an extra field \`${keyName}\`. A Got wrapper carries the child Message plus routing context only: \`message\`, \`id\`, or keys ending in \`Id\`. Move other data onto the child Message or a dedicated parent Message.`

/**
 * Flags extra payload fields on a Got wrapper Message definition so wrappers
 * carry only the child Message and routing context.
 */
export const gotWrapperCarriesOnlyRouting = Rule.define({
  name: 'got-wrapper-carries-only-routing',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep Got wrapper Message fields to the child Message plus routing context.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !isIdentifier(node.callee, 'm')) {
          return Effect.void
        }
        const [tagArgument, fieldsArgument] = node.arguments
        if (
          !isStringLiteral(tagArgument) ||
          !gotWrapperTagPattern.test(tagArgument.value) ||
          !isObjectExpression(fieldsArgument)
        ) {
          return Effect.void
        }
        const wrapperTag = tagArgument.value
        return Effect.forEach(
          fieldsArgument.properties,
          property =>
            pipe(
              staticPropertyKey(property),
              Option.match({
                onNone: () => Effect.void,
                onSome: ({ keyNode, keyName }) =>
                  isRoutingKey(keyName)
                    ? Effect.void
                    : ctx.report(
                        Diagnostic.make({
                          node: keyNode,
                          message: extraFieldMessage(wrapperTag, keyName),
                        }),
                      ),
              }),
            ),
          { discard: true },
        )
      },
    }
  },
})
