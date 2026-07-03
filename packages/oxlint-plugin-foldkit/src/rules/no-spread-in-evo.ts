import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Result from 'effect/Result'

const objectExprHasSpread = (obj: ESTree.ObjectExpression): boolean =>
  pipe(
    obj.properties,
    Arr.some(p => p.type === 'SpreadElement'),
  )

/**
 * A computed property (`{ [key]: v }`) can't be expressed by a static
 * nested-`evo` rewrite, so `{ ...x, [key]: v }` is a legitimate dynamic
 * record update rather than the plain static-key merge this rule replaces.
 */
const objectExprHasComputedKey = (obj: ESTree.ObjectExpression): boolean =>
  pipe(
    obj.properties,
    Arr.some(p => p.type === 'Property' && p.computed === true),
  )

const arrowBodyObject = (
  arrow: ESTree.ArrowFunctionExpression,
): Option.Option<ESTree.ObjectExpression> => {
  if (arrow.body.type === 'ObjectExpression') {
    return Option.some(arrow.body)
  }
  if (arrow.body.type === 'BlockStatement') {
    return pipe(
      arrow.body.body,
      Arr.findFirst(stmt =>
        stmt.type === 'ReturnStatement' ? Option.some(stmt) : Option.none(),
      ),
      Option.flatMap(ret =>
        ret.argument !== null && ret.argument.type === 'ObjectExpression'
          ? Option.some(ret.argument)
          : Option.none(),
      ),
    )
  }
  return Option.none()
}

interface SpreadFinding {
  readonly fieldName: string
  readonly node: ESTree.ObjectExpression
}

const propertyKeyName = (prop: ESTree.ObjectProperty): string =>
  prop.key.type === 'Identifier' ? prop.key.name : '<key>'

const extractFindings = (
  updates: ESTree.ObjectExpression,
): ReadonlyArray<SpreadFinding> =>
  pipe(
    updates.properties,
    Arr.filterMap(prop => {
      if (prop.type !== 'Property') return Result.failVoid
      if (prop.value.type !== 'ArrowFunctionExpression') return Result.failVoid
      return pipe(
        arrowBodyObject(prop.value),
        Option.filter(
          obj => objectExprHasSpread(obj) && !objectExprHasComputedKey(obj),
        ),
        Option.match({
          onNone: () => Result.failVoid,
          onSome: obj =>
            Result.succeed<SpreadFinding>({
              fieldName: propertyKeyName(prop),
              node: obj,
            }),
        }),
      )
    }),
  )

const evoUpdatesArg = (
  call: ESTree.CallExpression,
): Option.Option<ESTree.ObjectExpression> => {
  if (call.callee.type !== 'Identifier' || call.callee.name !== 'evo') {
    return Option.none()
  }
  const arg1 = call.arguments[1]
  return arg1 !== undefined && arg1.type === 'ObjectExpression'
    ? Option.some(arg1)
    : Option.none()
}

const rule: CreateRule = Rule.define({
  name: 'no-spread-in-evo',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Disallow `{ ...x, ... }` inside `evo()` updater arrows — use a nested `evo()` instead (FK-2)',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('CallExpression', node =>
      pipe(
        evoUpdatesArg(node),
        Option.map(extractFindings),
        Option.match({
          onNone: () => Effect.void,
          onSome: findings =>
            Effect.forEach(
              findings,
              ({ fieldName, node: innerObj }) =>
                ctx.report(
                  Diagnostic.make({
                    node: innerObj,
                    message: `Spread (\`...\`) inside an \`evo\` updater for field \`${fieldName}\` bypasses the canonical update path. Use a nested \`evo\`: \`${fieldName}: () => evo(model.${fieldName}, { ... })\`. (FK-2)`,
                  }),
                ),
              { concurrency: 1, discard: true },
            ),
        }),
      ),
    )
  },
})

export default rule
