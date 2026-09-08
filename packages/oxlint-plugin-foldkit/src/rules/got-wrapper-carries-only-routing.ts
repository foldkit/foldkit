import { Effect, Option, pipe } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Ranged,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import {
  indexReferences,
  isCallExpression,
  isIdentifier,
  isStringLiteral,
} from '../guards.ts'
import { messageCases, recordFoldkitMessageUnionBindings } from '../message.ts'

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
  if (property.type !== 'Property') {
    return Option.none()
  }
  if (!property.computed && isIdentifier(property.key)) {
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
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    const messageUnionBindings = new Set<string>()
    return {
      Program: (node: ESTree.Node) => {
        recordFoldkitMessageUnionBindings(messageUnionBindings, node)
        return Effect.void
      },
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }

        return Effect.forEach(
          messageCases(node, messageUnionBindings, references),
          messageCase =>
            gotWrapperTagPattern.test(messageCase.name)
              ? Effect.forEach(
                  messageCase.fields.properties,
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
                                  message: extraFieldMessage(
                                    messageCase.name,
                                    keyName,
                                  ),
                                }),
                              ),
                      }),
                    ),
                  { discard: true },
                )
              : Effect.void,
          { discard: true },
        )
      },
    }
  },
})
