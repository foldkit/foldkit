import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Result from 'effect/Result'

const gotMessageNamePattern = /^Got\w*Message$/
const delegatePageNames = [
  'delegatePage',
  'delegatePageWithOutMessage',
] as const
const wrapperExpressionTypes = [
  'ChainExpression',
  'ParenthesizedExpression',
  'TSAsExpression',
  'TSInstantiationExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TypeCastExpression',
] as const

type IdentifierLike = {
  readonly type: string
  readonly name: string
}

type MemberExpressionLike = {
  readonly type: string
  readonly computed?: unknown
  readonly object?: unknown
  readonly property?: unknown
}

type ExpressionWrapper = {
  readonly type: string
  readonly expression: unknown
}

const isIdentifierLike = (value: unknown): value is IdentifierLike =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'Identifier' &&
  'name' in value &&
  P.isString(value.name)

const isMemberExpressionLike = (
  value: unknown,
): value is MemberExpressionLike =>
  P.isObject(value) && 'type' in value && value.type === 'MemberExpression'

const isExpressionWrapper = (value: unknown): value is ExpressionWrapper =>
  P.isObject(value) &&
  'type' in value &&
  P.isString(value.type) &&
  'expression' in value

const isCallExpression = (value: unknown): value is ESTree.CallExpression =>
  P.isObject(value) && 'type' in value && value.type === 'CallExpression'

const isArrowFunction = (
  value: unknown,
): value is ESTree.ArrowFunctionExpression =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'ArrowFunctionExpression'

const isObjectExpression = (value: unknown): value is ESTree.ObjectExpression =>
  P.isObject(value) && 'type' in value && value.type === 'ObjectExpression'

const isObjectProperty = (value: unknown): value is ESTree.ObjectProperty =>
  P.isObject(value) && 'type' in value && value.type === 'Property'

const isBlockStatement = (value: unknown): value is ESTree.BlockStatement =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'BlockStatement' &&
  'body' in value &&
  Array.isArray(value.body)

const unwrapExpression = (value: unknown): unknown =>
  isExpressionWrapper(value) && Arr.contains(wrapperExpressionTypes, value.type)
    ? unwrapExpression(value.expression)
    : value

const memberPath = (
  value: unknown,
): Option.Option<Arr.NonEmptyReadonlyArray<string>> => {
  const expression = unwrapExpression(value)
  if (isIdentifierLike(expression)) return Option.some([expression.name])
  if (!isMemberExpressionLike(expression) || expression.computed === true) {
    return Option.none()
  }
  const property = unwrapExpression(expression.property)
  if (!isIdentifierLike(property)) return Option.none()
  return pipe(
    memberPath(expression.object),
    Option.map(path => [...path, property.name]),
  )
}

const pathEquals = (
  path: ReadonlyArray<string>,
  expected: ReadonlyArray<string>,
): boolean =>
  path.length === expected.length &&
  pipe(
    Arr.zip(path, expected),
    Arr.every(([left, right]) => left === right),
  )

const callPath = (
  call: ESTree.CallExpression,
): Option.Option<Arr.NonEmptyReadonlyArray<string>> => memberPath(call.callee)

const isCommandMapCall = (call: ESTree.CallExpression): boolean =>
  pipe(
    callPath(call),
    Option.match({
      onNone: () => false,
      onSome: path =>
        pathEquals(path, ['Command', 'mapMessages']) ||
        pathEquals(path, ['Command', 'mapMessage']),
    }),
  )

const isDelegatePageCall = (call: ESTree.CallExpression): boolean =>
  pipe(
    callPath(call),
    Option.match({
      onNone: () => false,
      onSome: path =>
        path.length === 1 && Arr.contains(delegatePageNames, path[0]),
    }),
  )

const isSubscriptionLiftCall = (call: ESTree.CallExpression): boolean =>
  pipe(
    callPath(call),
    Option.match({
      onNone: () => false,
      onSome: path => pathEquals(path, ['Subscription', 'lift']),
    }),
  )

const argumentAt = (
  call: ESTree.CallExpression,
  index: number,
): Option.Option<ESTree.Node> =>
  pipe(
    Arr.get(call.arguments, index),
    Option.filter(arg => arg.type !== 'SpreadElement'),
  )

const arrowArgumentAt = (
  call: ESTree.CallExpression,
  index: number,
): Option.Option<ESTree.ArrowFunctionExpression> =>
  pipe(argumentAt(call, index), Option.filter(isArrowFunction))

const propertyKeyName = (
  property: ESTree.ObjectProperty,
): Option.Option<string> => {
  if (property.computed) return Option.none()
  const key = unwrapExpression(property.key)
  if (isIdentifierLike(key)) return Option.some(key.name)
  return P.isObject(key) &&
    'type' in key &&
    key.type === 'Literal' &&
    'value' in key &&
    P.isString(key.value)
    ? Option.some(key.value)
    : Option.none()
}

const objectPropertyValue = (
  object: ESTree.ObjectExpression,
  key: string,
): Option.Option<ESTree.Node> =>
  pipe(
    object.properties,
    Arr.findFirst(
      (property): property is ESTree.ObjectProperty =>
        isObjectProperty(property) &&
        pipe(
          propertyKeyName(property),
          Option.match({
            onNone: () => false,
            onSome: name => name === key,
          }),
        ),
    ),
    Option.map(property => property.value),
  )

const subscriptionLiftConfig = (
  call: ESTree.CallExpression,
): Option.Option<ESTree.ObjectExpression> => {
  const applied = unwrapExpression(call.callee)
  return isCallExpression(applied) && isSubscriptionLiftCall(applied)
    ? pipe(argumentAt(call, 0), Option.filter(isObjectExpression))
    : Option.none()
}

interface MapperArrow {
  readonly arrow: ESTree.ArrowFunctionExpression
  readonly source: 'command' | 'subscription' | 'delegate'
}

const commandMapper = (
  call: ESTree.CallExpression,
): Option.Option<MapperArrow> =>
  isCommandMapCall(call)
    ? pipe(
        arrowArgumentAt(call, 1),
        Option.map(arrow => ({ arrow, source: 'command' as const })),
      )
    : Option.none()

const delegateMapper = (
  call: ESTree.CallExpression,
): Option.Option<MapperArrow> =>
  isDelegatePageCall(call)
    ? pipe(
        arrowArgumentAt(call, 3),
        Option.map(arrow => ({ arrow, source: 'delegate' as const })),
      )
    : Option.none()

const subscriptionMapper = (
  call: ESTree.CallExpression,
): Option.Option<MapperArrow> =>
  pipe(
    subscriptionLiftConfig(call),
    Option.flatMap(config => objectPropertyValue(config, 'toParentMessage')),
    Option.filter(isArrowFunction),
    Option.map(arrow => ({ arrow, source: 'subscription' as const })),
  )

const mappersForCall = (
  call: ESTree.CallExpression,
): ReadonlyArray<MapperArrow> =>
  pipe(
    [commandMapper(call), delegateMapper(call), subscriptionMapper(call)],
    Arr.filterMap(Result.fromOption(() => undefined)),
  )

const soleReturnedCall = (
  body: ESTree.BlockStatement,
): Option.Option<ESTree.CallExpression> =>
  body.body.length === 1 && body.body[0]?.type === 'ReturnStatement'
    ? pipe(
        Option.fromNullishOr(body.body[0].argument),
        Option.map(unwrapExpression),
        Option.filter(isCallExpression),
      )
    : Option.none()

const arrowBodyCall = (
  arrow: ESTree.ArrowFunctionExpression,
): Option.Option<ESTree.CallExpression> => {
  const body = unwrapExpression(arrow.body)
  if (isCallExpression(body)) return Option.some(body)
  return isBlockStatement(body) ? soleReturnedCall(body) : Option.none()
}

const calleePathLabel = (call: ESTree.CallExpression): string =>
  pipe(
    memberPath(call.callee),
    Option.map(path => pipe(path, Arr.join('.'))),
    Option.getOrElse(() => '<dynamic call>'),
  )

const calleeConstructorName = (
  call: ESTree.CallExpression,
): Option.Option<string> =>
  pipe(memberPath(call.callee), Option.map(Arr.lastNonEmpty))

const isGotMessageCall = (call: ESTree.CallExpression): boolean =>
  pipe(
    calleeConstructorName(call),
    Option.match({
      onNone: () => false,
      onSome: name => gotMessageNamePattern.test(name),
    }),
  )

const sourceLabel = (source: MapperArrow['source']): string =>
  source === 'command'
    ? 'Command mapper'
    : source === 'subscription'
      ? 'Subscription lift `toParentMessage`'
      : '`delegatePage` wrapper'

const analyzeMapper = (
  ctx: RuleContext['Service'],
  mapper: MapperArrow,
): Effect.Effect<void, never, RuleContext> =>
  pipe(
    arrowBodyCall(mapper.arrow),
    Option.match({
      onNone: () => Effect.void,
      onSome: call =>
        isGotMessageCall(call)
          ? Effect.void
          : ctx.report(
              Diagnostic.make({
                node: call,
                message: `${sourceLabel(mapper.source)} must wrap child output with a \`Got*Message\` constructor. \`${calleePathLabel(call)}(...)\` does not preserve Foldkit's one-wrap-per-level submodel convention. (FK submodel)`,
              }),
            ),
    }),
  )

const rule: CreateRule = Rule.define({
  name: 'wrap-child-output-in-got-message',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Require child Command, Subscription, and delegatePage output mappers to wrap through Got*Message constructors',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('CallExpression', node =>
      Effect.forEach(
        mappersForCall(node),
        mapper => analyzeMapper(ctx, mapper),
        { concurrency: 1, discard: true },
      ),
    )
  },
})

export default rule
