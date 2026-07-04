import { Array, Effect, Option, String, pipe } from 'effect'
import {
  Diagnostic,
  type ESTree,
  Rule,
  RuleContext,
  Visitor,
} from 'effect-oxlint'

const matcherWrapperTypes: ReadonlyArray<string> = [
  'ChainExpression',
  'ParenthesizedExpression',
  'TSNonNullExpression',
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
  'TSInstantiationExpression',
]

const matcherNames: ReadonlyArray<string> = ['toMatchObject', 'toBe']

const commandMatcherKeys: ReadonlyArray<string> = ['args', 'name']

const pascalCommandNamePattern = /^[A-Z][A-Za-z0-9]*$/

const commandCollectionNamePattern = /commands?$/i

const testFileBasenamePattern = /\.test\.tsx?$/

const storyMatcherMessage =
  'Assert pending Commands with Story.Command.expectExact or Story.Command.expectHas instead of hand-rolled name assertions. The Story matchers compare Command identity, and expectExact fails when unexpected Commands are still pending.'

const isTestFile = (filename: string): boolean =>
  testFileBasenamePattern.test(
    pipe(
      filename,
      String.replaceAll('\\', '/'),
      String.split('/'),
      Array.lastNonEmpty,
    ),
  )

const isWrapperExpression = (
  node: unknown,
): node is Readonly<{ expression: unknown }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  typeof node.type === 'string' &&
  matcherWrapperTypes.includes(node.type) &&
  'expression' in node

const unwrapExpression = (node: unknown): unknown =>
  isWrapperExpression(node) ? unwrapExpression(node.expression) : node

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

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression'

const isMemberExpression = (node: unknown): node is ESTree.MemberExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'MemberExpression'

const isObjectExpression = (node: unknown): node is ESTree.ObjectExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ObjectExpression'

const isSpreadElement = (node: unknown): node is ESTree.SpreadElement =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'SpreadElement'

type MatcherReceiver = Readonly<{
  matcherName: string
  expectArgument: unknown
}>

const matcherReceiver = (
  node: ESTree.CallExpression,
): Option.Option<MatcherReceiver> => {
  const callee = unwrapExpression(node.callee)
  if (
    !isMemberExpression(callee) ||
    callee.computed ||
    !isIdentifier(callee.property)
  ) {
    return Option.none()
  }
  const matcherName = callee.property.name
  if (!matcherNames.includes(matcherName)) {
    return Option.none()
  }
  const expectCall = unwrapExpression(callee.object)
  if (!isCallExpression(expectCall)) {
    return Option.none()
  }
  if (!isIdentifier(unwrapExpression(expectCall.callee), 'expect')) {
    return Option.none()
  }
  const [expectArgument] = expectCall.arguments
  if (expectArgument === undefined || isSpreadElement(expectArgument)) {
    return Option.none()
  }
  return Option.some({ matcherName, expectArgument })
}

const firstExpressionArgument = (
  node: ESTree.CallExpression,
): Option.Option<unknown> => {
  const [firstArgument] = node.arguments
  return firstArgument !== undefined && !isSpreadElement(firstArgument)
    ? Option.some(firstArgument)
    : Option.none()
}

const isCommandElementAccess = (node: unknown): boolean => {
  const element = unwrapExpression(node)
  if (!isMemberExpression(element) || !element.computed) {
    return false
  }
  const collection = unwrapExpression(element.object)
  return (
    isIdentifier(collection) &&
    commandCollectionNamePattern.test(collection.name)
  )
}

const isCommandElementNameAccess = (node: unknown): boolean => {
  const access = unwrapExpression(node)
  if (!isMemberExpression(access) || access.computed) {
    return false
  }
  return (
    isIdentifier(access.property, 'name') &&
    isCommandElementAccess(access.object)
  )
}

const staticPropertyKey = (
  property: ESTree.ObjectPropertyKind,
): Option.Option<string> => {
  if (property.type !== 'Property' || property.computed) {
    return Option.none()
  }
  if (isIdentifier(property.key)) {
    return Option.some(property.key.name)
  }
  if (isStringLiteral(property.key)) {
    return Option.some(property.key.value)
  }
  return Option.none()
}

const isPascalCommandNameLiteral = (node: unknown): boolean =>
  isStringLiteral(node) && pascalCommandNamePattern.test(node.value)

const isCommandMatcherObject = (node: unknown): boolean => {
  if (!isObjectExpression(node)) {
    return false
  }
  const properties = node.properties
  const hasQualifyingKeys = pipe(
    Option.all(properties.map(staticPropertyKey)),
    Option.exists(
      keys =>
        Array.isReadonlyArrayNonEmpty(keys) &&
        keys.every(key => commandMatcherKeys.includes(key)),
    ),
  )
  if (!hasQualifyingKeys) {
    return false
  }
  return pipe(
    properties,
    Array.findFirst(property =>
      pipe(
        staticPropertyKey(property),
        Option.exists(key => key === 'name'),
      )
        ? Option.some(property)
        : Option.none(),
    ),
    Option.exists(
      property =>
        property.type === 'Property' &&
        isPascalCommandNameLiteral(property.value),
    ),
  )
}

/**
 * Suggests Story.Command.expectExact and Story.Command.expectHas over
 * hand-rolled toMatchObject and toBe assertions on Command collections in
 * test files.
 */
export const preferStoryCommandMatchers = Rule.define({
  name: 'prefer-story-command-matchers',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Assert pending Commands with the Story matchers instead of hand-rolled name assertions.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return yield* Visitor.filter(isTestFile, {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        return pipe(
          Option.all({
            receiver: matcherReceiver(node),
            firstArgument: firstExpressionArgument(node),
          }),
          Option.match({
            onNone: () => Effect.void,
            onSome: ({ receiver, firstArgument }) => {
              const isMatchObjectOffense =
                receiver.matcherName === 'toMatchObject' &&
                isCommandMatcherObject(firstArgument) &&
                isCommandElementAccess(receiver.expectArgument)
              const isNameEqualityOffense =
                receiver.matcherName === 'toBe' &&
                isPascalCommandNameLiteral(firstArgument) &&
                isCommandElementNameAccess(receiver.expectArgument)
              return isMatchObjectOffense || isNameEqualityOffense
                ? ctx.report(
                    Diagnostic.make({ node, message: storyMatcherMessage }),
                  )
                : Effect.void
            },
          }),
        )
      },
    })
  },
})
