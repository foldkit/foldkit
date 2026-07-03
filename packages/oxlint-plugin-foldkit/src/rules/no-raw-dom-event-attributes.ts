import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Str from 'effect/String'

const rawDomEventPattern = /^on[a-zA-Z]+$/i

const normalizedPath = (filename: string): string =>
  Str.replaceAll('\\', '/')(filename)

const basename = (filename: string): string =>
  pipe(
    Str.split('/')(normalizedPath(filename)),
    Arr.last,
    Option.getOrElse(() => filename),
  )

const isCrashViewFile = (filename: string): boolean =>
  basename(filename) === 'crash-view.ts'

const calleePath = (
  callee: ESTree.CallExpression['callee'],
): Option.Option<Arr.NonEmptyReadonlyArray<string>> => {
  if (callee.type === 'Identifier') return Option.some([callee.name])
  if (callee.type === 'MemberExpression' && !callee.computed) {
    const property = callee.property
    if (property.type !== 'Identifier') return Option.none()
    return pipe(
      calleePath(callee.object),
      Option.map(path => [...path, property.name]),
    )
  }
  return Option.none()
}

const lastPathSegment = (call: ESTree.CallExpression): Option.Option<string> =>
  pipe(calleePath(call.callee), Option.map(Arr.lastNonEmpty))

const isAttributeOrPropCall = (call: ESTree.CallExpression): boolean =>
  pipe(
    lastPathSegment(call),
    Option.match({
      onNone: () => false,
      onSome: name => name === 'Attribute' || name === 'Prop',
    }),
  )

const staticTemplateString = (
  template: ESTree.TemplateLiteral,
): Option.Option<string> =>
  template.expressions.length === 0
    ? pipe(
        Arr.head(template.quasis),
        Option.flatMap(quasi => Option.fromNullishOr(quasi.value.cooked)),
      )
    : Option.none()

const staticStringArg = (arg: ESTree.Argument): Option.Option<string> => {
  if (arg.type === 'Literal' && P.isString(arg.value)) {
    return Option.some(arg.value)
  }
  return arg.type === 'TemplateLiteral'
    ? staticTemplateString(arg)
    : Option.none()
}

const rawEventAttributeName = (
  call: ESTree.CallExpression,
): Option.Option<string> =>
  isAttributeOrPropCall(call)
    ? pipe(
        Arr.head(call.arguments),
        Option.flatMap(staticStringArg),
        Option.filter(name => rawDomEventPattern.test(name)),
      )
    : Option.none()

const isHtmlCall = (call: ESTree.CallExpression): boolean =>
  pipe(
    calleePath(call.callee),
    Option.match({
      onNone: () => false,
      onSome: path => path.length === 1 && Arr.headNonEmpty(path) === 'html',
    }),
  )

const hasNeverTypeArgument = (call: ESTree.CallExpression): boolean =>
  pipe(
    Option.fromNullishOr(call.typeArguments),
    Option.flatMap(typeArguments =>
      typeArguments.params.length === 1
        ? Arr.get(typeArguments.params, 0)
        : Option.none(),
    ),
    Option.match({
      onNone: () => false,
      onSome: param => param.type === 'TSNeverKeyword',
    }),
  )

const rule: CreateRule = Rule.define({
  name: 'no-raw-dom-event-attributes',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Disallow raw DOM event Attribute/Prop calls outside crash-view.ts; crash views must bind html<never>()',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const crashView = isCrashViewFile(ctx.filename)
    return Visitor.on('CallExpression', node => {
      if (crashView) {
        return isHtmlCall(node) && !hasNeverTypeArgument(node)
          ? ctx.report(
              Diagnostic.make({
                node,
                message:
                  'Crash views that use raw DOM event attributes must bind `html<never>()` so no application Messages can be dispatched from the crash renderer. (FK crash view)',
              }),
            )
          : Effect.void
      }
      return pipe(
        rawEventAttributeName(node),
        Option.match({
          onNone: () => Effect.void,
          onSome: name =>
            ctx.report(
              Diagnostic.make({
                node,
                message: `Do not create raw DOM event attribute \`${name}\`. Foldkit events must go through typed On* constructors that dispatch Messages; raw event attributes are only allowed in crash-view.ts. (FK events)`,
              }),
            ),
        }),
      )
    })
  },
})

export default rule
