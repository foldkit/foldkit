import { Array, Effect, Option, pipe } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

const rawEventNamePattern = /^on[a-zA-Z]+$/i

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

const isCallExpression = (node: ESTree.Node): node is ESTree.CallExpression =>
  node.type === 'CallExpression'

const isObjectExpression = (node: unknown): node is ESTree.ObjectExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ObjectExpression'

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

const isRawEventName = (attributeName: string): boolean =>
  rawEventNamePattern.test(attributeName)

const isKeyPropertyKey = (key: unknown): boolean =>
  isIdentifier(key, 'key') || (isStringLiteral(key) && key.value === 'key')

const isKeyProperty = (
  property: ESTree.ObjectProperty | ESTree.SpreadElement,
): property is ESTree.ObjectProperty =>
  property.type === 'Property' &&
  !property.computed &&
  isKeyPropertyKey(property.key)

const keyPropertyValue = (
  configObject: ESTree.ObjectExpression,
): Option.Option<ESTree.Expression> =>
  Option.map(
    Array.findFirst(configObject.properties, isKeyProperty),
    property => property.value,
  )

const attributeEventName = (
  node: ESTree.CallExpression,
): Option.Option<string> => {
  if (!calleeMatchesHelperName(node.callee, 'Attribute')) {
    return Option.none()
  }
  const [firstArgument] = node.arguments
  return Option.filter(staticStringValue(firstArgument), isRawEventName)
}

const propEventName = (node: ESTree.CallExpression): Option.Option<string> => {
  if (!calleeMatchesHelperName(node.callee, 'Prop')) {
    return Option.none()
  }
  const [configArgument] = node.arguments
  if (!isObjectExpression(configArgument)) {
    return Option.none()
  }
  return pipe(
    keyPropertyValue(configArgument),
    Option.flatMap(staticStringValue),
    Option.filter(isRawEventName),
  )
}

// RULE

/**
 * Disallows constructing raw DOM event attributes (onclick, oninput, and the
 * rest) through the Attribute and Prop escape hatches. Events must flow
 * through the typed On* attribute constructors so every interaction
 * dispatches a Message through update.
 */
export const noRawDomEventAttributes = Rule.define({
  name: 'no-raw-dom-event-attributes',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Dispatch events through typed On* attribute constructors instead of raw on* DOM attributes.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        return pipe(
          attributeEventName(node),
          Option.orElse(() => propEventName(node)),
          Option.match({
            onNone: () => Effect.void,
            onSome: attributeName =>
              ctx.report(
                Diagnostic.make({
                  node,
                  message: `Raw DOM event attribute \`${attributeName}\` bypasses the Foldkit runtime: nothing it does flows through update as a Message. Use the typed \`On*\` attribute constructors instead, for example \`OnClick(SomeMessage())\`. If this is a crash view rendered outside the dispatch loop, suppress this rule with a disable comment.`,
                }),
              ),
          }),
        )
      },
    }
  },
})
