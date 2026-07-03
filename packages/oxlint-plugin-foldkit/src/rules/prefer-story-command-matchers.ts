import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashSet from 'effect/HashSet'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Result from 'effect/Result'
import * as Schema from 'effect/Schema'
import * as Str from 'effect/String'

const PascalCommandName = Schema.String.check(
  Schema.isPattern(/^[A-Z][A-Za-z0-9]*$/, {
    identifier: 'PascalCommandName',
    title: 'Pascal Command Name',
    description: 'A PascalCase Foldkit command name.',
  }),
)
const isPascalCommandName = Schema.is(PascalCommandName)

const CommandCollectionName = Schema.String.check(
  Schema.isPattern(/commands?$/i, {
    identifier: 'CommandCollectionName',
    title: 'Command Collection Name',
    description: 'An identifier ending in command or commands.',
  }),
)
const isCommandCollectionName = Schema.is(CommandCollectionName)

const COMMAND_MATCH_KEYS = HashSet.make('args', 'name')

const normalizedPath = (filename: string): string =>
  Str.replaceAll('\\', '/')(filename)

const isTestFile = (filename: string): boolean => {
  const normalized = normalizedPath(filename)
  return (
    Str.includes('/apps/ui/test/')(normalized) && /\.tsx?$/.test(normalized)
  )
}

const isIdentifier = (
  value: unknown,
): value is ESTree.IdentifierName | ESTree.IdentifierReference =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'Identifier' &&
  'name' in value &&
  P.isString(value.name)

const isMemberExpression = (value: unknown): value is ESTree.MemberExpression =>
  P.isObject(value) && 'type' in value && value.type === 'MemberExpression'

const isCallExpression = (value: unknown): value is ESTree.CallExpression =>
  P.isObject(value) && 'type' in value && value.type === 'CallExpression'

const isObjectExpression = (value: unknown): value is ESTree.ObjectExpression =>
  P.isObject(value) && 'type' in value && value.type === 'ObjectExpression'

const isObjectProperty = (value: unknown): value is ESTree.ObjectProperty =>
  P.isObject(value) && 'type' in value && value.type === 'Property'

const unwrapExpression = (value: unknown): unknown => {
  if (!P.isObject(value) || !('type' in value)) return value
  if (
    (value.type === 'ChainExpression' ||
      value.type === 'ParenthesizedExpression' ||
      value.type === 'TSNonNullExpression' ||
      value.type === 'TSAsExpression' ||
      value.type === 'TSSatisfiesExpression' ||
      value.type === 'TSTypeAssertion' ||
      value.type === 'TSInstantiationExpression') &&
    'expression' in value
  ) {
    return unwrapExpression(value.expression)
  }
  return value
}

const staticPropertyName = (
  member: ESTree.MemberExpression,
): Option.Option<string> =>
  member.computed
    ? Option.none()
    : isIdentifier(member.property)
      ? Option.some(member.property.name)
      : Option.none()

const staticKeyName = (
  property: ESTree.ObjectProperty,
): Option.Option<string> => {
  if (property.computed) return Option.none()
  if (isIdentifier(property.key)) return Option.some(property.key.name)
  return property.key.type === 'Literal' && P.isString(property.key.value)
    ? Option.some(property.key.value)
    : Option.none()
}

const stringLiteralValue = (value: unknown): Option.Option<string> =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'Literal' &&
  'value' in value &&
  P.isString(value.value)
    ? Option.some(value.value)
    : Option.none()

const firstExpressionArg = (
  call: ESTree.CallExpression,
): Option.Option<ESTree.Node> => {
  const arg = call.arguments[0]
  return arg !== undefined && arg.type !== 'SpreadElement'
    ? Option.some(arg)
    : Option.none()
}

const expectArgument = (value: unknown): Option.Option<ESTree.Node> => {
  const unwrapped = unwrapExpression(value)
  if (!isCallExpression(unwrapped)) return Option.none()
  const callee = unwrapExpression(unwrapped.callee)
  return isIdentifier(callee) && callee.name === 'expect'
    ? firstExpressionArg(unwrapped)
    : Option.none()
}

const matcherExpectArgument = (
  call: ESTree.CallExpression,
  matcher: string,
): Option.Option<ESTree.Node> => {
  const callee = unwrapExpression(call.callee)
  if (!isMemberExpression(callee)) return Option.none()
  return pipe(
    staticPropertyName(callee),
    Option.filter(name => name === matcher),
    Option.flatMap(() => expectArgument(callee.object)),
  )
}

const isCommandElementAccess = (value: unknown): boolean => {
  const unwrapped = unwrapExpression(value)
  return (
    isMemberExpression(unwrapped) &&
    unwrapped.computed === true &&
    pipe(
      Option.fromNullishOr(unwrapExpression(unwrapped.object)),
      Option.filter(isIdentifier),
      Option.match({
        onNone: () => false,
        onSome: identifier => isCommandCollectionName(identifier.name),
      }),
    )
  )
}

const isCommandElementNameAccess = (value: unknown): boolean => {
  const unwrapped = unwrapExpression(value)
  return (
    isMemberExpression(unwrapped) &&
    pipe(
      staticPropertyName(unwrapped),
      Option.match({
        onNone: () => false,
        onSome: name =>
          name === 'name' && isCommandElementAccess(unwrapped.object),
      }),
    )
  )
}

interface CommandMatcherProperty {
  readonly key: string
  readonly value: ESTree.Node
}

const commandMatcherProperties = (
  object: ESTree.ObjectExpression,
): Option.Option<ReadonlyArray<CommandMatcherProperty>> => {
  const properties = pipe(
    object.properties,
    Arr.filterMap(property => {
      if (!isObjectProperty(property)) return Result.failVoid
      return pipe(
        staticKeyName(property),
        Option.map(key => ({ key, value: property.value })),
        Result.fromOption(() => undefined),
      )
    }),
  )
  return Arr.length(properties) === Arr.length(object.properties)
    ? Option.some(properties)
    : Option.none()
}

const isCommandMatcherObject = (object: ESTree.ObjectExpression): boolean =>
  pipe(
    commandMatcherProperties(object),
    Option.match({
      onNone: () => false,
      onSome: properties => {
        const keys = pipe(
          properties,
          Arr.map(property => property.key),
        )
        return (
          Arr.isReadonlyArrayNonEmpty(keys) &&
          pipe(
            keys,
            Arr.every(key => HashSet.has(COMMAND_MATCH_KEYS, key)),
          ) &&
          pipe(
            properties,
            Arr.findFirst(property => property.key === 'name'),
            Option.flatMap(property => stringLiteralValue(property.value)),
            Option.match({
              onNone: () => false,
              onSome: isPascalCommandName,
            }),
          )
        )
      },
    }),
  )

const toMatchObjectOffense = (call: ESTree.CallExpression): boolean => {
  const objectArg = pipe(
    firstExpressionArg(call),
    Option.filter(isObjectExpression),
  )
  return (
    Option.isSome(objectArg) &&
    isCommandMatcherObject(objectArg.value) &&
    pipe(
      matcherExpectArgument(call, 'toMatchObject'),
      Option.match({
        onNone: () => false,
        onSome: isCommandElementAccess,
      }),
    )
  )
}

const toBeNameOffense = (call: ESTree.CallExpression): boolean =>
  pipe(
    firstExpressionArg(call),
    Option.flatMap(stringLiteralValue),
    Option.filter(isPascalCommandName),
    Option.match({
      onNone: () => false,
      onSome: () =>
        pipe(
          matcherExpectArgument(call, 'toBe'),
          Option.match({
            onNone: () => false,
            onSome: isCommandElementNameAccess,
          }),
        ),
    }),
  )

const report = (
  ctx: RuleContext['Service'],
  node: ESTree.CallExpression,
): Effect.Effect<void> =>
  ctx.report(
    Diagnostic.make({
      node,
      message:
        'Use `Story.Command.expectExact` or `Story.Command.expectHas` instead of hand-rolled command-name assertions. Story command matchers account for Foldkit command identity and unresolved command coverage. (FK Story)',
    }),
  )

const rule: CreateRule = Rule.define({
  name: 'prefer-story-command-matchers',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Prefer Story.Command.expectExact / expectHas over hand-rolled Foldkit command assertions in tests',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return yield* Visitor.filter(
      isTestFile,
      Visitor.on('CallExpression', node =>
        toMatchObjectOffense(node) || toBeNameOffense(node)
          ? report(ctx, node)
          : Effect.void,
      ),
    )
  },
})

export default rule
