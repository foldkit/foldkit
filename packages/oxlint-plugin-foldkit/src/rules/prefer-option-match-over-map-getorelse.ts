import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'

const isOptionMapCall = (node: ESTree.Node): boolean =>
  node.type === 'CallExpression' && AST.isCallOf(node, 'Option', 'map')

const isOptionGetOrElseCall = (node: ESTree.Node): boolean =>
  node.type === 'CallExpression' && AST.isCallOf(node, 'Option', 'getOrElse')

/**
 * `<Option.map(...)>.pipe(..., Option.getOrElse(...), ...)`
 */
const matchesMethodPipeForm = (call: ESTree.CallExpression): boolean =>
  call.callee.type === 'MemberExpression' &&
  call.callee.property.type === 'Identifier' &&
  call.callee.property.name === 'pipe' &&
  isOptionMapCall(call.callee.object) &&
  pipe(
    call.arguments,
    Arr.some(arg => arg.type !== 'SpreadElement' && isOptionGetOrElseCall(arg)),
  )

/**
 * `pipe(value, Option.map(...), Option.getOrElse(...))` —
 * any two consecutive arguments matching the pattern.
 */
const matchesFreestandingPipeForm = (call: ESTree.CallExpression): boolean => {
  if (call.callee.type !== 'Identifier' || call.callee.name !== 'pipe') {
    return false
  }
  const args = call.arguments
  return pipe(
    Arr.range(0, Math.max(args.length - 2, -1)),
    Arr.some(i => {
      const a = args[i]
      const b = args[i + 1]
      if (!a || !b) return false
      if (a.type === 'SpreadElement' || b.type === 'SpreadElement') return false
      return isOptionMapCall(a) && isOptionGetOrElseCall(b)
    }),
  )
}

const rule: CreateRule = Rule.define({
  name: 'prefer-option-match-over-map-getorelse',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Prefer `Option.match` over `Option.map(...).pipe(Option.getOrElse(...))` (FK-3)',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('CallExpression', node => {
      const matches =
        matchesMethodPipeForm(node) || matchesFreestandingPipeForm(node)
      return matches
        ? ctx.report(
            Diagnostic.make({
              node,
              message:
                'Prefer `Option.match(value, { onNone: ..., onSome: ... })` over `Option.map(...).pipe(Option.getOrElse(...))`. The labeled branches are self-documenting. (FK-3)',
            }),
          )
        : Effect.void
    })
  },
})

export default rule
