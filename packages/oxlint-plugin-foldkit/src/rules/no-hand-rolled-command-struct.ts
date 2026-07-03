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

const commandShapeKeys = HashSet.make('name', 'effect')
const commandShapeWithArgsKeys = HashSet.make('name', 'args', 'effect')

const propertyKeyName = (
  property: ESTree.ObjectProperty,
): Option.Option<string> => {
  if (property.computed) return Option.none()
  if (property.key.type === 'Identifier') return Option.some(property.key.name)
  return property.key.type === 'Literal' && P.isString(property.key.value)
    ? Option.some(property.key.value)
    : Option.none()
}

const staticKeys = (node: ESTree.ObjectExpression): HashSet.HashSet<string> =>
  pipe(
    node.properties,
    Arr.filterMap(property =>
      property.type === 'Property'
        ? Result.fromOption(propertyKeyName(property), () => undefined)
        : Result.failVoid,
    ),
    HashSet.fromIterable,
  )

const sameKeySet = (
  left: HashSet.HashSet<string>,
  right: HashSet.HashSet<string>,
): boolean =>
  HashSet.size(left) === HashSet.size(right) &&
  pipe(
    left,
    HashSet.every(key => HashSet.has(right, key)),
  )

const hasSpread = (node: ESTree.ObjectExpression): boolean =>
  pipe(
    node.properties,
    Arr.some(property => property.type === 'SpreadElement'),
  )

const hasEffectProperty = (node: ESTree.ObjectExpression): boolean =>
  pipe(staticKeys(node), HashSet.has('effect'))

const hasHandRolledCommandShape = (node: ESTree.ObjectExpression): boolean => {
  const keys = staticKeys(node)
  return (
    sameKeySet(keys, commandShapeKeys) ||
    sameKeySet(keys, commandShapeWithArgsKeys)
  )
}

const messageFor = (node: ESTree.ObjectExpression): string =>
  hasSpread(node)
    ? 'Do not rebuild Foldkit Command structs with object spread plus an `effect` property. Use `Command.mapEffect`, `Command.mapMessage`, or `Command.mapMessages` so command identity and args are preserved. (FK commands)'
    : 'Do not hand-roll Foldkit Command structs with `{ name, effect }` or `{ name, args, effect }`. Create Commands with `Command.define(...)` so identity, args, and tracing metadata stay canonical. (FK commands)'

const shouldReport = (node: ESTree.ObjectExpression): boolean =>
  hasSpread(node) && hasEffectProperty(node)
    ? true
    : hasHandRolledCommandShape(node)

const rule: CreateRule = Rule.define({
  name: 'no-hand-rolled-command-struct',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Disallow hand-rolled Foldkit Command structs; use Command.define or Command.map* helpers',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('ObjectExpression', node =>
      shouldReport(node)
        ? ctx.report(
            Diagnostic.make({
              node,
              message: messageFor(node),
            }),
          )
        : Effect.void,
    )
  },
})

export default rule
