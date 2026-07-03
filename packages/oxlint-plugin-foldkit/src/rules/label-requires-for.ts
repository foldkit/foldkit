import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'

/**
 * `label([attrs], children)` calls that omit a `For(id)` attribute do not
 * associate with any input, breaking assistive tech and keyboard navigation.
 *
 * @since 0.4.0
 */

const isLabelCall = (node: ESTree.Node): boolean =>
  node.type === 'CallExpression' &&
  node.callee.type === 'Identifier' &&
  node.callee.name === 'label'

const isForCall = (node: ESTree.Node): boolean =>
  node.type === 'CallExpression' &&
  node.callee.type === 'Identifier' &&
  node.callee.name === 'For'

const attributeArray = (
  call: ESTree.CallExpression,
): Option.Option<ESTree.ArrayExpression> => {
  const arg0 = call.arguments[0]
  return arg0 !== undefined && arg0.type === 'ArrayExpression'
    ? Option.some(arg0)
    : Option.none()
}

const hasFor = (arr: ESTree.ArrayExpression): boolean =>
  pipe(
    arr.elements,
    Arr.some(el => P.isNotNull(el) && isForCall(el)),
  )

const rule: CreateRule = Rule.define({
  name: 'label-requires-for',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      '`label([attrs], children)` must include a `For(id)` attribute to associate with its input (FK-5)',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('CallExpression', node => {
      if (!isLabelCall(node)) return Effect.void
      return pipe(
        attributeArray(node),
        Option.filter(arr => !hasFor(arr)),
        Option.match({
          onNone: () => Effect.void,
          onSome: () =>
            ctx.report(
              Diagnostic.make({
                node,
                message:
                  '`label([...])` is missing a `For(id)` attribute. Pair it with `Id(id)` on the matching input, or use `Ui.Input.view` which wires the association for you. (FK-5)',
              }),
            ),
        }),
      )
    })
  },
})

export default rule
