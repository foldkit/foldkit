import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Effect from 'effect/Effect'
import * as HashSet from 'effect/HashSet'
import * as Option from 'effect/Option'

/** Hyperscript element helpers most often left empty. */
const EMPTY_ABLE_ELEMENTS = HashSet.make(
  'span',
  'div',
  'p',
  'section',
  'article',
)

interface CalleeInfo {
  readonly element: string
  readonly viaHelper: boolean
}

const isEmptyArrayLiteral = (n: ESTree.Node): boolean =>
  n.type === 'ArrayExpression' && n.elements.length === 0

const calleeInfo = (call: ESTree.CallExpression): Option.Option<CalleeInfo> => {
  if (
    call.callee.type === 'MemberExpression' &&
    !call.callee.computed &&
    call.callee.object.type === 'Identifier' &&
    call.callee.property.type === 'Identifier' &&
    HashSet.has(EMPTY_ABLE_ELEMENTS, call.callee.property.name)
  ) {
    return Option.some({
      element: call.callee.property.name,
      viaHelper: true,
    })
  }
  if (
    call.callee.type === 'Identifier' &&
    HashSet.has(EMPTY_ABLE_ELEMENTS, call.callee.name)
  ) {
    return Option.some({ element: call.callee.name, viaHelper: false })
  }
  return Option.none()
}

const hasTwoEmptyArrayArgs = (call: ESTree.CallExpression): boolean => {
  if (call.arguments.length !== 2) return false
  const [attrs, children] = call.arguments
  return (
    !!attrs &&
    !!children &&
    isEmptyArrayLiteral(attrs) &&
    isEmptyArrayLiteral(children)
  )
}

const rule: CreateRule = Rule.define({
  name: 'prefer-empty-over-empty-element',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Use `empty` / `h.empty` instead of empty hyperscript elements like `span([], [])` (FK-5)',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('CallExpression', node =>
      pipe(
        calleeInfo(node),
        Option.filter(() => hasTwoEmptyArrayArgs(node)),
        Option.match({
          onNone: () => Effect.void,
          onSome: ({ element, viaHelper }) => {
            const suggested = viaHelper ? 'h.empty' : 'empty'
            const prefix = viaHelper ? 'h.' : ''
            return ctx.report(
              Diagnostic.make({
                node,
                message: `Empty element \`${prefix}${element}([], [])\` is non-idiomatic. Use \`${suggested}\` instead. (FK-5)`,
              }),
            )
          },
        }),
      ),
    )
  },
})

export default rule
