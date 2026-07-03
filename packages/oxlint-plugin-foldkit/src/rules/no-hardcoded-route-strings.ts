import { Match, pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashSet from 'effect/HashSet'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Schema from 'effect/Schema'

const ROUTING_FNS = HashSet.make('Href', 'navigateInternal', 'loadExternalUrl')

const RouteLiteral = Schema.String.check(
  Schema.isPattern(/^(\/|https?:\/\/)/, {
    identifier: 'RouteLiteral',
    title: 'Route Literal',
    description:
      'A string that begins with `/`, `http://`, or `https://` — i.e. looks like a route or URL.',
  }),
)
const isRouteLiteral = Schema.is(RouteLiteral)

const routingFnName = (call: ESTree.CallExpression): Option.Option<string> =>
  call.callee.type === 'Identifier' &&
  HashSet.has(ROUTING_FNS, call.callee.name)
    ? Option.some(call.callee.name)
    : Option.none()

interface RouteArg {
  readonly fn: string
  readonly preview: string
  readonly kind: 'literal' | 'template'
}

const firstTemplateQuasi = (
  tpl: ESTree.TemplateLiteral,
): Option.Option<string> =>
  pipe(
    Arr.head(tpl.quasis),
    Option.flatMap(q => Option.fromNullishOr(q.value.cooked)),
  )

const classifyArg = (
  fn: string,
  arg: ESTree.Node | ESTree.SpreadElement,
): Option.Option<RouteArg> => {
  if (
    arg.type === 'Literal' &&
    P.isString(arg.value) &&
    isRouteLiteral(arg.value)
  ) {
    return Option.some<RouteArg>({
      fn,
      preview: arg.value,
      kind: 'literal',
    })
  }
  if (arg.type === 'TemplateLiteral') {
    return pipe(
      firstTemplateQuasi(arg),
      Option.filter(isRouteLiteral),
      Option.map(head => ({
        fn,
        preview: `${head}...`,
        kind: 'template' as const,
      })),
    )
  }
  return Option.none()
}

const messageFor = (arg: RouteArg): string =>
  Match.value(arg.kind).pipe(
    Match.when(
      'literal',
      () =>
        `Avoid hard-coded route literal in \`${arg.fn}('${arg.preview}')\`. Routers are bidirectional — call them as printers: \`${arg.fn}(homeRouter())\`, \`${arg.fn}(tagFilterRouter({ tag }))\`. (FK-4)`,
    ),
    Match.when(
      'template',
      () =>
        `Avoid hard-coded route template in \`${arg.fn}(\\\`${arg.preview}\\\`)\`. Routers are bidirectional — call them as printers with named parameters. (FK-4)`,
    ),
    Match.exhaustive,
  )

const rule: CreateRule = Rule.define({
  name: 'no-hardcoded-route-strings',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Disallow hard-coded route strings in `Href` / `navigateInternal` / `loadExternalUrl` — call the bidirectional route printer instead (FK-4)',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('CallExpression', node =>
      pipe(
        routingFnName(node),
        Option.flatMap(fn =>
          pipe(
            Arr.head(node.arguments),
            Option.flatMap(arg => classifyArg(fn, arg)),
          ),
        ),
        Option.match({
          onNone: () => Effect.void,
          onSome: arg =>
            ctx.report(Diagnostic.make({ node, message: messageFor(arg) })),
        }),
      ),
    )
  },
})

export default rule
