import { Match, pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Ref from 'effect/Ref'
import * as Result from 'effect/Result'
import * as Tuple from 'effect/Tuple'

type IdentifierLike = {
  readonly type: string
  readonly name: string
}

type LiteralLike = {
  readonly type: string
  readonly value: unknown
}

type MemberExpressionLike = {
  readonly type: string
  readonly computed: unknown
  readonly object: unknown
  readonly property: unknown
}

type CallExpressionLike = {
  readonly type: string
  readonly callee: unknown
  readonly arguments: ReadonlyArray<unknown>
}

const isIdentifierLike = (value: unknown): value is IdentifierLike =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'Identifier' &&
  'name' in value &&
  P.isString(value.name)

const isLiteralLike = (value: unknown): value is LiteralLike =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'Literal' &&
  'value' in value

const isMemberExpressionLike = (
  value: unknown,
): value is MemberExpressionLike =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'MemberExpression' &&
  'computed' in value &&
  'object' in value &&
  'property' in value

const isCallExpressionLike = (value: unknown): value is CallExpressionLike =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'CallExpression' &&
  'callee' in value &&
  'arguments' in value &&
  Array.isArray(value.arguments)

const memberPath = (
  value: unknown,
): Option.Option<Arr.NonEmptyReadonlyArray<string>> => {
  if (isIdentifierLike(value)) return Option.some([value.name])
  if (!isMemberExpressionLike(value) || value.computed === true) {
    return Option.none()
  }
  const property = value.property
  if (!isIdentifierLike(property)) return Option.none()
  return pipe(
    memberPath(value.object),
    Option.map(path => [...path, property.name]),
  )
}

const pathEquals = (
  path: ReadonlyArray<string>,
  expected: ReadonlyArray<string>,
): boolean =>
  path.length === expected.length &&
  pipe(
    Arr.zip(path, expected),
    Arr.every(([left, right]) => left === right),
  )

const callPath = (
  call: CallExpressionLike,
): Option.Option<Arr.NonEmptyReadonlyArray<string>> => memberPath(call.callee)

const isCallPath = (
  call: CallExpressionLike,
  expected: ReadonlyArray<string>,
): boolean =>
  pipe(
    callPath(call),
    Option.match({
      onNone: () => false,
      onSome: path => pathEquals(path, expected),
    }),
  )

type RouteSegment =
  | { readonly _tag: 'literal'; readonly value: string }
  | { readonly _tag: 'string' }
  | { readonly _tag: 'int' }

interface RouteShape {
  readonly routerName: string
  readonly segments: ReadonlyArray<RouteSegment>
  readonly isQueryGuarded: boolean
}

interface OneOfRouter {
  readonly name: string
  readonly node: ESTree.Node
}

interface AnalysisInput {
  readonly routers: HashMap.HashMap<string, ESTree.Node>
  readonly oneOfCalls: ReadonlyArray<ReadonlyArray<OneOfRouter>>
}

const stringLiteralArg = (call: CallExpressionLike): Option.Option<string> => {
  const args = call.arguments
  const arg = args[0]
  return isLiteralLike(arg) && P.isString(arg.value)
    ? Option.some(arg.value)
    : Option.none()
}

const parseSegment = (value: unknown): Option.Option<RouteSegment> => {
  if (!isCallExpressionLike(value)) return Option.none()
  return pipe(
    callPath(value),
    Option.flatMap(path => {
      if (pathEquals(path, ['literal'])) {
        return pipe(
          stringLiteralArg(value),
          Option.map(literal => ({
            _tag: 'literal' as const,
            value: literal,
          })),
        )
      }
      if (pathEquals(path, ['string'])) {
        return Option.some<RouteSegment>({ _tag: 'string' })
      }
      if (pathEquals(path, ['int'])) {
        return Option.some<RouteSegment>({ _tag: 'int' })
      }
      return Option.none()
    }),
  )
}

const parseInitialStep = (
  value: unknown,
): Option.Option<ReadonlyArray<RouteSegment>> => {
  if (isIdentifierLike(value) && value.name === 'root') {
    return Option.some([])
  }
  if (isMemberExpressionLike(value)) {
    return pipe(
      memberPath(value),
      Option.filter(path => pathEquals(path, ['Route', 'root'])),
      Option.map(() => []),
    )
  }
  return pipe(
    parseSegment(value),
    Option.map(segment => [segment]),
  )
}

type ParseStepResult =
  | { readonly _tag: 'segment'; readonly segment: RouteSegment }
  | { readonly _tag: 'query' }
  | { readonly _tag: 'ignore' }

const parsePipeStep = (value: unknown): Option.Option<ParseStepResult> => {
  if (!isCallExpressionLike(value)) return Option.none()
  if (isCallPath(value, ['Route', 'mapTo'])) {
    return Option.some({ _tag: 'ignore' })
  }
  if (isCallPath(value, ['Route', 'query'])) {
    return Option.some({ _tag: 'query' })
  }
  if (isCallPath(value, ['slash'])) {
    const args = value.arguments
    const arg = args[0]
    return pipe(
      parseSegment(arg),
      Option.map(segment => ({ _tag: 'segment' as const, segment })),
    )
  }
  return pipe(
    parseSegment(value),
    Option.map(segment => ({ _tag: 'segment' as const, segment })),
  )
}

const appendStep = (shape: RouteShape, step: ParseStepResult): RouteShape =>
  Match.value(step).pipe(
    Match.tag('segment', ({ segment }) => ({
      ...shape,
      segments: [...shape.segments, segment],
    })),
    Match.tag('query', () => ({ ...shape, isQueryGuarded: true })),
    Match.tag('ignore', () => shape),
    Match.exhaustive,
  )

const routeShapeFromPipeCall = (
  routerName: string,
  pipeCall: CallExpressionLike,
): Option.Option<RouteShape> => {
  if (!isCallPath(pipeCall, ['pipe'])) return Option.none()
  const args = pipeCall.arguments
  const first = args[0]
  return pipe(
    parseInitialStep(first),
    Option.flatMap(segments => {
      const initial: RouteShape = {
        routerName,
        segments,
        isQueryGuarded: false,
      }
      return pipe(
        Arr.drop(args, 1),
        Arr.reduce(Option.some(initial), (acc, arg) =>
          pipe(
            acc,
            Option.flatMap(shape =>
              pipe(
                parsePipeStep(arg),
                Option.map(step => appendStep(shape, step)),
              ),
            ),
          ),
        ),
      )
    }),
  )
}

const routeShape = (
  routerName: string,
  init: Option.Option<ESTree.Node>,
): Option.Option<RouteShape> =>
  pipe(
    init,
    Option.filter(isCallExpressionLike),
    Option.flatMap(pipeCall => routeShapeFromPipeCall(routerName, pipeCall)),
  )

const routeDeclaration = (
  node: ESTree.VariableDeclarator,
): Option.Option<readonly [string, ESTree.Node]> => {
  const id = node.id
  if (!isIdentifierLike(id)) return Option.none()
  return pipe(
    Option.fromNullishOr(node.init),
    Option.flatMap(init =>
      pipe(
        routeShape(id.name, Option.some(init)),
        Option.map(() => Tuple.make(id.name, init)),
      ),
    ),
  )
}

const oneOfRouters = (
  call: ESTree.CallExpression,
): Option.Option<ReadonlyArray<OneOfRouter>> =>
  isCallPath(call, ['Route', 'oneOf'])
    ? Option.some(
        pipe(
          call.arguments,
          Arr.filterMap(arg =>
            isIdentifierLike(arg)
              ? Result.succeed({ name: arg.name, node: arg })
              : Result.failVoid,
          ),
        ),
      )
    : Option.none()

const literalIntPattern = /^-?\d+$/

const segmentCovers = (left: RouteSegment, right: RouteSegment): boolean =>
  Match.value(left).pipe(
    Match.tag('literal', literal =>
      Match.value(right).pipe(
        Match.tag('literal', candidate => literal.value === candidate.value),
        Match.orElse(() => false),
      ),
    ),
    Match.tag('string', () => true),
    Match.tag('int', () =>
      Match.value(right).pipe(
        Match.tag('int', () => true),
        Match.tag('literal', literal => literalIntPattern.test(literal.value)),
        Match.orElse(() => false),
      ),
    ),
    Match.exhaustive,
  )

const coversPrefix = (
  left: ReadonlyArray<RouteSegment>,
  right: ReadonlyArray<RouteSegment>,
): boolean => {
  if (Arr.isReadonlyArrayEmpty(left)) return Arr.isReadonlyArrayEmpty(right)
  if (left.length > right.length) return false
  return pipe(
    Arr.zip(left, Arr.take(right, left.length)),
    Arr.every(([leftSegment, rightSegment]) =>
      segmentCovers(leftSegment, rightSegment),
    ),
  )
}

const shadowDiagnostic = (opts: {
  readonly shadowingRouter: RouteShape
  readonly shadowedRouter: RouteShape
  readonly node: ESTree.Node
}) =>
  Diagnostic.make({
    node: opts.node,
    message:
      opts.shadowingRouter.segments.length ===
      opts.shadowedRouter.segments.length
        ? `Router \`${opts.shadowedRouter.routerName}\` is unreachable in \`Route.oneOf(...)\`: earlier router \`${opts.shadowingRouter.routerName}\` matches the same path shape. Put the more specific router first or remove the duplicate. (FK routing)`
        : `Router \`${opts.shadowedRouter.routerName}\` is unreachable in \`Route.oneOf(...)\`: earlier router \`${opts.shadowingRouter.routerName}\` matches its path prefix. Put longer or more specific routes before wildcard prefixes. (FK routing)`,
  })

const firstShadowingRouter = (
  previous: ReadonlyArray<RouteShape>,
  current: RouteShape,
): Option.Option<RouteShape> =>
  pipe(
    previous,
    Arr.findFirst(
      candidate =>
        !candidate.isQueryGuarded &&
        coversPrefix(candidate.segments, current.segments),
    ),
  )

const analyzeOneOf = (
  ctx: RuleContext['Service'],
  routers: HashMap.HashMap<string, ESTree.Node>,
  entries: ReadonlyArray<OneOfRouter>,
): Effect.Effect<void, never, RuleContext> => {
  const resolved = pipe(
    entries,
    Arr.filterMap(entry =>
      pipe(
        HashMap.get(routers, entry.name),
        Option.flatMap(init => routeShape(entry.name, Option.some(init))),
        Option.map(shape => ({ ...entry, shape })),
        Result.fromOption(() => undefined),
      ),
    ),
  )
  return Effect.forEach(
    Arr.range(0, resolved.length - 1),
    index => {
      const current = resolved[index]
      if (current === undefined) return Effect.void
      return pipe(
        firstShadowingRouter(
          pipe(
            resolved,
            Arr.take(index),
            Arr.map(entry => entry.shape),
          ),
          current.shape,
        ),
        Option.match({
          onNone: () => Effect.void,
          onSome: shadowingRouter =>
            ctx.report(
              shadowDiagnostic({
                shadowingRouter,
                shadowedRouter: current.shape,
                node: current.node,
              }),
            ),
        }),
      )
    },
    { concurrency: 1, discard: true },
  )
}

const analyze = (
  ctx: RuleContext['Service'],
  input: AnalysisInput,
): Effect.Effect<void, never, RuleContext> =>
  Effect.forEach(
    input.oneOfCalls,
    entries => analyzeOneOf(ctx, input.routers, entries),
    { concurrency: 1, discard: true },
  )

const rule: CreateRule = Rule.define({
  name: 'route-oneof-shadowing-order',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Keep Foldkit Route.oneOf routers ordered from most-specific to least-specific so earlier parsers do not shadow later ones',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const routersRef = yield* Ref.make<HashMap.HashMap<string, ESTree.Node>>(
      HashMap.empty(),
    )
    const oneOfCallsRef = yield* Ref.make<
      ReadonlyArray<ReadonlyArray<OneOfRouter>>
    >([])

    return Visitor.merge(
      Visitor.on('VariableDeclarator', node =>
        pipe(
          routeDeclaration(node),
          Option.match({
            onNone: () => Effect.void,
            onSome: ([name, init]) =>
              Ref.update(routersRef, HashMap.set(name, init)),
          }),
        ),
      ),
      Visitor.on('CallExpression', node =>
        pipe(
          oneOfRouters(node),
          Option.match({
            onNone: () => Effect.void,
            onSome: entries =>
              Ref.update(oneOfCallsRef, calls => [...calls, entries]),
          }),
        ),
      ),
      Visitor.on('Program:exit', () =>
        Effect.gen(function* () {
          const routers = yield* Ref.get(routersRef)
          const oneOfCalls = yield* Ref.get(oneOfCallsRef)
          yield* analyze(ctx, { routers, oneOfCalls })
        }),
      ),
    )
  },
})

export default rule
