import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Result from 'effect/Result'

const guardedKeys = ['slowView', 'freezeModel'] as const

const propertyKeyName = (
  property: ESTree.ObjectProperty,
): Option.Option<string> => {
  if (property.computed) return Option.none()
  const key = property.key
  if (key.type === 'Identifier') return Option.some(key.name)
  return key.type === 'Literal' && P.isString(key.value)
    ? Option.some(key.value)
    : Option.none()
}

const isGuardrailKey = (key: string): key is (typeof guardedKeys)[number] =>
  Arr.contains(guardedKeys, key)

const isFalseLiteral = (node: ESTree.Node): boolean =>
  node.type === 'Literal' && node.value === false

interface GuardrailDisabled {
  readonly key: (typeof guardedKeys)[number]
  readonly node: ESTree.ObjectProperty
}

const disabledGuardrails = (
  object: ESTree.ObjectExpression,
): ReadonlyArray<GuardrailDisabled> =>
  pipe(
    object.properties,
    Arr.filterMap(property => {
      if (property.type !== 'Property') return Result.failVoid
      if (!isFalseLiteral(property.value)) return Result.failVoid
      return pipe(
        propertyKeyName(property),
        Option.filter(isGuardrailKey),
        Option.map(key => ({ key, node: property })),
        Result.fromOption(() => undefined),
      )
    }),
  )

const reportDisabledGuardrail = (
  ctx: RuleContext['Service'],
  finding: GuardrailDisabled,
): Effect.Effect<void, never, RuleContext> =>
  ctx.report(
    Diagnostic.make({
      node: finding.node,
      message: `Do not set Foldkit dev guardrail \`${finding.key}\` to false. Fix the slow view or model mutation instead of disabling runtime feedback. (FK dev guardrails)`,
    }),
  )

const rule: CreateRule = Rule.define({
  name: 'no-disabling-dev-guardrails',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Disallow setting Foldkit dev guardrails `slowView` or `freezeModel` to false',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('ObjectExpression', node =>
      Effect.forEach(
        disabledGuardrails(node),
        finding => reportDisabledGuardrail(ctx, finding),
        { concurrency: 1, discard: true },
      ),
    )
  },
})

export default rule
