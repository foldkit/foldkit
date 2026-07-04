import { Array, Effect, Option, pipe } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

const protectiveRelSubstrings = ['noopener', 'noreferrer']

// GUARDS

const isIdentifier = (
  node: unknown,
  name?: string,
): node is Readonly<{ type: 'Identifier'; name: string }> =>
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

const isTemplateLiteral = (node: unknown): node is ESTree.TemplateLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'TemplateLiteral'

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression'

const isArrayExpression = (node: ESTree.Node): node is ESTree.ArrayExpression =>
  node.type === 'ArrayExpression'

const isMemberExpression = (
  node: unknown,
): node is Readonly<{
  type: 'MemberExpression'
  object: unknown
  property: unknown
  computed?: boolean
}> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'MemberExpression'

const calleeMatchesHelperName = (
  callee: unknown,
  helperName: string,
): boolean =>
  isIdentifier(callee, helperName) ||
  (isMemberExpression(callee) &&
    !callee.computed &&
    isIdentifier(callee.property, helperName))

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

const staticStringValue = (node: unknown): Option.Option<string> => {
  if (isStringLiteral(node)) {
    return Option.some(node.value)
  }
  if (isTemplateLiteral(node) && Array.isArrayEmpty(node.expressions)) {
    return Option.flatMap(Array.head(node.quasis), quasi =>
      Option.fromNullishOr(quasi.value.cooked),
    )
  }
  return Option.none()
}

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
