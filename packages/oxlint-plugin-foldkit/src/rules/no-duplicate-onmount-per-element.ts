import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

const memberEndsWithOnMount = (member: ESTree.MemberExpression): boolean =>
  pipe(
    AST.memberPath(member),
    Option.match({
      onNone: () => false,
      onSome: path => Arr.lastNonEmpty(path) === 'OnMount',
    }),
  )

const isOnMountCall = (node: ESTree.Node): boolean => {
  if (node.type !== 'CallExpression') return false
  if (node.callee.type === 'Identifier') return node.callee.name === 'OnMount'
  return node.callee.type === 'MemberExpression'
    ? memberEndsWithOnMount(node.callee)
    : false
}

const isPresentOnMountCall = (
  element: ESTree.ArrayExpression['elements'][number],
): element is ESTree.CallExpression =>
  pipe(
    Option.fromNullishOr(element),
    Option.match({
      onNone: () => false,
      onSome: isOnMountCall,
    }),
  )

const topLevelOnMountCalls = (
  array: ESTree.ArrayExpression,
): ReadonlyArray<ESTree.CallExpression> =>
  pipe(array.elements, Arr.filter(isPresentOnMountCall))

const rule: CreateRule = Rule.define({
  name: 'no-duplicate-onmount-per-element',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Disallow multiple top-level OnMount attributes on a single Foldkit element',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('ArrayExpression', node => {
      const calls = topLevelOnMountCalls(node)
      return calls.length >= 2
        ? ctx.report(
            Diagnostic.make({
              node,
              message:
                'Only one `OnMount` can attach per Foldkit element; Snabbdom keeps a single insert/destroy hook and later mounts overwrite earlier ones. Bundle multiple lifetime-scoped behaviors into one Mount. (FK mount)',
            }),
          )
        : Effect.void
    })
  },
})

export default rule
