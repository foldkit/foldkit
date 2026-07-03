import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashSet from 'effect/HashSet'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Ref from 'effect/Ref'
import * as Result from 'effect/Result'

type IdentifierLike = {
  readonly type: string
  readonly name: string
  readonly parent?: unknown
}

type MemberExpressionLike = {
  readonly type: string
  readonly computed?: unknown
  readonly object?: unknown
  readonly property?: unknown
}

type CallExpressionLike = {
  readonly type: string
  readonly callee?: unknown
  readonly arguments?: ReadonlyArray<unknown>
  readonly parent?: unknown
}

type VariableDeclaratorLike = {
  readonly type: string
  readonly id?: unknown
  readonly init?: unknown
}

type ObjectPropertyLike = {
  readonly type: string
  readonly computed?: unknown
  readonly shorthand?: unknown
  readonly key?: unknown
  readonly value?: unknown
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

const isCallExpressionLike = (value: unknown): value is CallExpressionLike =>
  P.isObject(value) && 'type' in value && value.type === 'CallExpression'

const isVariableDeclaratorLike = (
  value: unknown,
): value is VariableDeclaratorLike =>
  P.isObject(value) && 'type' in value && value.type === 'VariableDeclarator'

const isObjectPropertyLike = (value: unknown): value is ObjectPropertyLike =>
  P.isObject(value) && 'type' in value && value.type === 'Property'

const memberPath = (
  value: unknown,
): Option.Option<Arr.NonEmptyReadonlyArray<string>> => {
  if (isIdentifierLike(value)) return Option.some([value.name])
  if (!isMemberExpressionLike(value) || value.computed === true) {
    return Option.none()
  }
  const property = value.property
  if (!isIdentifierLike(property)) return Option.none()
  return pipe(
    memberPath(value.object),
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
  call: CallExpressionLike,
): Option.Option<Arr.NonEmptyReadonlyArray<string>> => memberPath(call.callee)

const isArrMapCall = (call: CallExpressionLike): boolean =>
  pipe(
    callPath(call),
    Option.match({
      onNone: () => false,
      onSome: path => pathEquals(path, ['Arr', 'map']),
    }),
  )

const isMapMethodCall = (call: CallExpressionLike): boolean =>
  pipe(
    callPath(call),
    Option.match({
      onNone: () => false,
      onSome: path => Arr.lastNonEmpty(path) === 'map',
    }),
  ) && !isArrMapCall(call)

const isMapCallback = (fn: ESTree.ArrowFunctionExpression): boolean => {
  const parent = fn.parent
  if (!isCallExpressionLike(parent)) return false
  const args = parent.arguments ?? []
  return isMapMethodCall(parent)
    ? args[0] === fn
    : isArrMapCall(parent) && (args[0] === fn || args[1] === fn)
}

const secondParamName = (
  fn: ESTree.ArrowFunctionExpression,
): Option.Option<string> => {
  const param = fn.params[1]
  return param !== undefined && isIdentifierLike(param)
    ? Option.some(param.name)
    : Option.none()
}

const isCreateKeyedLazyCall = (value: unknown): boolean =>
  isCallExpressionLike(value) &&
  pipe(
    callPath(value),
    Option.match({
      onNone: () => false,
      onSome: path => Arr.lastNonEmpty(path) === 'createKeyedLazy',
    }),
  )

const keyedLazyDeclaratorName = (
  node: ESTree.VariableDeclarator,
): Option.Option<string> =>
  isVariableDeclaratorLike(node) &&
  isIdentifierLike(node.id) &&
  isCreateKeyedLazyCall(node.init)
    ? Option.some(node.id.name)
    : Option.none()

const objectValue = (
  object: ESTree.ObjectExpression,
  key: string,
): Option.Option<ESTree.Node> =>
  pipe(
    object.properties,
    Arr.findFirst((property): property is ESTree.ObjectProperty => {
      if (property.type !== 'Property' || property.computed) return false
      if (property.key.type === 'Identifier') {
        return property.key.name === key
      }
      return property.key.type === 'Literal' && property.key.value === key
    }),
    Option.map(property => property.value),
  )

const isKeyedFactoryCall = (value: unknown): boolean =>
  isCallExpressionLike(value) &&
  pipe(
    callPath(value),
    Option.match({
      onNone: () => false,
      onSome: path =>
        pathEquals(path, ['h', 'keyed']) || pathEquals(path, ['keyed']),
    }),
  )

const firstNodeArgument = (
  call: ESTree.CallExpression,
): Option.Option<ESTree.Node> => {
  const arg = call.arguments[0]
  return arg !== undefined && arg.type !== 'SpreadElement'
    ? Option.some(arg)
    : Option.none()
}

const keyedCallKeyArgument = (
  call: ESTree.CallExpression,
): Option.Option<ESTree.Node> =>
  isCallExpressionLike(call.callee) && isKeyedFactoryCall(call.callee)
    ? firstNodeArgument(call)
    : Option.none()

const hKeyArgument = (
  call: ESTree.CallExpression,
): Option.Option<ESTree.Node> =>
  pipe(
    callPath(call),
    Option.filter(
      path => pathEquals(path, ['h', 'Key']) || pathEquals(path, ['Key']),
    ),
    Option.flatMap(() => firstNodeArgument(call)),
  )

const submodelSlotIdArgument = (
  call: ESTree.CallExpression,
): Option.Option<ESTree.Node> =>
  pipe(
    callPath(call),
    Option.filter(
      path =>
        pathEquals(path, ['h', 'submodel']) || pathEquals(path, ['submodel']),
    ),
    Option.flatMap(() => {
      const arg = call.arguments[0]
      return arg !== undefined && arg.type === 'ObjectExpression'
        ? objectValue(arg, 'slotId')
        : Option.none()
    }),
  )

const keyedLazySlotArgument = (
  call: ESTree.CallExpression,
  keyedLazySlots: HashSet.HashSet<string>,
): Option.Option<ESTree.Node> =>
  pipe(
    callPath(call),
    Option.filter(
      path =>
        path.length === 1 &&
        HashSet.has(keyedLazySlots, Arr.headNonEmpty(path)),
    ),
    Option.flatMap(() => firstNodeArgument(call)),
  )

const keySinkArgument = (
  call: ESTree.CallExpression,
  keyedLazySlots: HashSet.HashSet<string>,
): Option.Option<ESTree.Node> =>
  pipe(
    keyedCallKeyArgument(call),
    Option.orElse(() => hKeyArgument(call)),
    Option.orElse(() => submodelSlotIdArgument(call)),
    Option.orElse(() => keyedLazySlotArgument(call, keyedLazySlots)),
  )

const paramNames = (value: unknown): ReadonlyArray<string> => {
  if (
    !P.isObject(value) ||
    !('params' in value) ||
    !Array.isArray(value.params)
  ) {
    return []
  }
  return pipe(
    value.params,
    Arr.filterMap(param =>
      isIdentifierLike(param) ? Result.succeed(param.name) : Result.failVoid,
    ),
  )
}

const containsIndexIdentifier = (
  root: unknown,
  activeNames: ReadonlyArray<string>,
): boolean => {
  if (Arr.isReadonlyArrayEmpty(activeNames)) return false
  if (isIdentifierLike(root)) return Arr.contains(activeNames, root.name)
  if (isObjectPropertyLike(root)) {
    return (
      (root.computed === true &&
        containsIndexIdentifier(root.key, activeNames)) ||
      containsIndexIdentifier(root.value, activeNames)
    )
  }
  if (!P.isObject(root)) return false
  const nextNames =
    'type' in root && root.type === 'ArrowFunctionExpression'
      ? pipe(
          activeNames,
          Arr.filter(name => !Arr.contains(paramNames(root), name)),
        )
      : activeNames
  return pipe(
    Object.entries(root),
    Arr.some(([key, child]) =>
      key === 'parent'
        ? false
        : Array.isArray(child)
          ? pipe(
              child,
              Arr.some(item => containsIndexIdentifier(item, nextNames)),
            )
          : containsIndexIdentifier(child, nextNames),
    ),
  )
}

const reportIndexKey = (
  ctx: RuleContext['Service'],
  node: ESTree.Node,
  indexName: string,
): Effect.Effect<void, never, RuleContext> =>
  ctx.report(
    Diagnostic.make({
      node,
      message: `Do not use array index parameter \`${indexName}\` as a Foldkit view key. Key rows and submodels from stable model ids instead. (FK view keys)`,
    }),
  )

const rule: CreateRule = Rule.define({
  name: 'no-array-index-view-keys',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Disallow array index parameters in Foldkit keyed view sinks; use stable model ids instead',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const indexStack = yield* Ref.make<ReadonlyArray<string>>([])
    const keyedLazySlots = yield* Ref.make<HashSet.HashSet<string>>(
      HashSet.empty(),
    )

    const enterFunction = (node: ESTree.ArrowFunctionExpression) =>
      pipe(
        secondParamName(node),
        Option.filter(() => isMapCallback(node)),
        Option.match({
          onNone: () => Effect.void,
          onSome: name => Ref.update(indexStack, stack => [...stack, name]),
        }),
      )

    const exitFunction = (node: ESTree.ArrowFunctionExpression) =>
      pipe(
        secondParamName(node),
        Option.filter(() => isMapCallback(node)),
        Option.match({
          onNone: () => Effect.void,
          onSome: () => Ref.update(indexStack, Arr.dropRight(1)),
        }),
      )

    return Visitor.merge(
      Visitor.on('VariableDeclarator', node =>
        pipe(
          keyedLazyDeclaratorName(node),
          Option.match({
            onNone: () => Effect.void,
            onSome: name => Ref.update(keyedLazySlots, HashSet.add(name)),
          }),
        ),
      ),
      Visitor.on('ArrowFunctionExpression', enterFunction),
      Visitor.onExit('ArrowFunctionExpression', exitFunction),
      Visitor.on('CallExpression', node =>
        Effect.gen(function* () {
          const stack = yield* Ref.get(indexStack)
          if (Arr.isReadonlyArrayEmpty(stack)) return
          const slots = yield* Ref.get(keyedLazySlots)
          const sink = keySinkArgument(node, slots)
          if (Option.isNone(sink)) return
          const offender = pipe(
            stack,
            Arr.findFirst(name => containsIndexIdentifier(sink.value, [name])),
          )
          if (Option.isSome(offender)) {
            yield* reportIndexKey(ctx, sink.value, offender.value)
          }
        }),
      ),
    )
  },
})

export default rule
