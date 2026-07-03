import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'

const isTargetBlankCall = (node: ESTree.Node): boolean => {
  if (node.type !== 'CallExpression') return false
  if (node.callee.type !== 'Identifier' || node.callee.name !== 'Target')
    return false
  const arg0 = node.arguments[0]
  return (
    arg0 !== undefined &&
    arg0.type === 'Literal' &&
    P.isString(arg0.value) &&
    arg0.value === '_blank'
  )
}

const isRelCall = (node: ESTree.Node): boolean =>
  node.type === 'CallExpression' &&
  node.callee.type === 'Identifier' &&
  node.callee.name === 'Rel'

const findTargetBlank = (
  arr: ESTree.ArrayExpression,
): Option.Option<ESTree.Node> =>
  pipe(
    arr.elements,
    Arr.filter(P.isNotNull),
    Arr.findFirst(el =>
      isTargetBlankCall(el) ? Option.some(el) : Option.none(),
    ),
  )

const hasRel = (arr: ESTree.ArrayExpression): boolean =>
  pipe(
    arr.elements,
    Arr.some(el => el !== null && isRelCall(el)),
  )

const rule: CreateRule = Rule.define({
  name: 'require-rel-for-external-link',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Attribute arrays containing `Target("_blank")` must also contain `Rel("noopener noreferrer")` (FK-5)',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('ArrayExpression', node =>
      pipe(
        findTargetBlank(node),
        Option.filter(() => !hasRel(node)),
        Option.match({
          onNone: () => Effect.void,
          onSome: targetNode =>
            ctx.report(
              Diagnostic.make({
                node: targetNode,
                message:
                  "`Target('_blank')` opens an external context. Pair it with `Rel('noopener noreferrer')` in the same attribute array to prevent tabnabbing and referrer leakage. (FK-5)",
              }),
            ),
        }),
      ),
    )
  },
})

export default rule
