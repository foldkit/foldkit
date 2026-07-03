import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

const PascalIdentifier = Schema.String.check(
  Schema.isPattern(/^[A-Z][A-Za-z0-9]*$/, {
    identifier: 'PascalIdentifier',
    title: 'Pascal Identifier',
    description: 'A PascalCase identifier segment.',
  }),
)

const isPascalIdentifier = Schema.is(PascalIdentifier)

interface ChildMessageConstruction {
  readonly namespace: string
  readonly constructor: string
  readonly node: ESTree.CallExpression
}

const childMessageConstruction = (
  call: ESTree.CallExpression,
): Option.Option<ChildMessageConstruction> => {
  if (call.callee.type !== 'MemberExpression') return Option.none()
  return pipe(
    AST.memberPath(call.callee),
    Option.filter(path => path.length === 3),
    Option.flatMap(path =>
      Option.all({
        namespace: Arr.get(path, 0),
        messageSegment: Arr.get(path, 1),
        constructor: Arr.get(path, 2),
      }),
    ),
    Option.filter(
      ({ namespace, messageSegment, constructor }) =>
        isPascalIdentifier(namespace) &&
        messageSegment === 'Message' &&
        isPascalIdentifier(constructor) &&
        constructor !== 'Message',
    ),
    Option.map(({ namespace, constructor }) => ({
      namespace,
      constructor,
      node: call,
    })),
  )
}

const rule: CreateRule = Rule.define({
  name: 'no-child-message-construction-in-root',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Disallow constructing child Message variants through `Child.Message.Variant(...)`; use child helper verbs and Got* wrappers instead',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('CallExpression', node =>
      pipe(
        childMessageConstruction(node),
        Option.match({
          onNone: () => Effect.void,
          onSome: ({ namespace, constructor, node: call }) =>
            ctx.report(
              Diagnostic.make({
                node: call,
                message: `Do not construct child Message \`${namespace}.Message.${constructor}(...)\` directly. Parents should call child-exported helper functions and route child output through Got*Message wrappers. (FK submodel)`,
              }),
            ),
        }),
      ),
    )
  },
})

export default rule
