import { Array, Effect, Option, pipe } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  calleeMatchesHelperName,
  isArrayExpression,
  isCallExpression,
  isSpreadElement,
  isStringLiteral,
  staticStringValue,
} from '../guards.ts'

const protectiveRelSubstrings = ['noopener', 'noreferrer']

// GUARDS

const isTargetBlankElement = (
  element: unknown,
): element is ESTree.CallExpression => {
  if (
    !isCallExpression(element) ||
    !calleeMatchesHelperName(element.callee, 'Target')
  ) {
    return false
  }
  const [firstArgument] = element.arguments
  return isStringLiteral(firstArgument) && firstArgument.value === '_blank'
}

const isRelElement = (element: unknown): element is ESTree.CallExpression =>
  isCallExpression(element) && calleeMatchesHelperName(element.callee, 'Rel')

const relStaticValue = (
  relElement: ESTree.CallExpression,
): Option.Option<string> => {
  const [firstArgument] = relElement.arguments
  return staticStringValue(firstArgument)
}

const isProtectiveRelValue = (relValue: string): boolean =>
  protectiveRelSubstrings.some(substring => relValue.includes(substring))

const missingRelMessage =
  "`Target('_blank')` opens a new browsing context that can reach back through `window.opener` and receives the referrer. Add `Rel('noopener noreferrer')` to the same attribute array."

const insufficientRelMessage = (relValue: string): string =>
  `\`Rel('${relValue}')\` does not protect this \`Target('_blank')\` link. The rel value must include \`noopener\` or \`noreferrer\`; use \`Rel('noopener noreferrer')\`.`

// RULE

/**
 * Requires attribute arrays containing Target('_blank') to also carry a Rel
 * attribute whose value includes noopener or noreferrer, protecting the
 * opener window from tabnabbing and referrer leaks.
 */
export const requireRelForExternalLink = Rule.define({
  name: 'require-rel-for-external-link',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      "Require a protective Rel value alongside Target('_blank') attributes.",
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      ArrayExpression: (node: ESTree.Node) => {
        if (!isArrayExpression(node)) {
          return Effect.void
        }
        if (Array.some(node.elements, isSpreadElement)) {
          return Effect.void
        }
        const maybeTargetBlank = Array.findFirst(
          node.elements,
          isTargetBlankElement,
        )
        if (Option.isNone(maybeTargetBlank)) {
          return Effect.void
        }
        const relElements = Array.filter(node.elements, isRelElement)
        if (Array.isArrayEmpty(relElements)) {
          return ctx.report(
            Diagnostic.make({
              node: maybeTargetBlank.value,
              message: missingRelMessage,
            }),
          )
        }
        const relInspections = Array.map(relElements, relElement => ({
          relElement,
          maybeValue: relStaticValue(relElement),
        }))
        const isEveryRelValueStatic = relInspections.every(({ maybeValue }) =>
          Option.isSome(maybeValue),
        )
        const hasProtectiveRelValue = relInspections.some(({ maybeValue }) =>
          Option.exists(maybeValue, isProtectiveRelValue),
        )
        if (!isEveryRelValueStatic || hasProtectiveRelValue) {
          return Effect.void
        }
        return pipe(
          relInspections,
          Array.head,
          Option.flatMap(({ maybeValue, relElement }) =>
            Option.map(maybeValue, relValue => ({ relElement, relValue })),
          ),
          Option.match({
            onNone: () => Effect.void,
            onSome: ({ relElement, relValue }) =>
              ctx.report(
                Diagnostic.make({
                  node: relElement,
                  message: insufficientRelMessage(relValue),
                }),
              ),
          }),
        )
      },
    }
  },
})
