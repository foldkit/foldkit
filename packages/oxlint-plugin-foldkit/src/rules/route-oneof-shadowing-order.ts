import { Array, Effect, Match, Option, Record, Ref, pipe } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Ranged,
  Rule,
  RuleContext,
} from 'effect-oxlint'

// GUARDS

const isIdentifier = (
  node: unknown,
): node is { readonly type: 'Identifier'; readonly name: string } =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Identifier' &&
  'name' in node &&
  typeof node.name === 'string'

const isStringLiteral = (node: unknown): node is ESTree.StringLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Literal' &&
  'value' in node &&
  typeof node.value === 'string'

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression' &&
  'arguments' in node &&
  Array.isArray(node.arguments)

const isStaticMemberExpression = (
  node: unknown,
): node is Readonly<{
  type: 'MemberExpression'
  object: unknown
  property: Readonly<{ type: 'Identifier'; name: string }>
}> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'MemberExpression' &&
  'computed' in node &&
  node.computed === false &&
  'object' in node &&
  'property' in node &&
  isIdentifier(node.property)

const isVariableDeclarator = (
  node: ESTree.Node,
): node is ESTree.VariableDeclarator => node.type === 'VariableDeclarator'

const calleePath = (node: unknown): Option.Option<string> => {
  if (isIdentifier(node)) {
    return Option.some(node.name)
  }
  if (isStaticMemberExpression(node)) {
    return pipe(
      calleePath(node.object),
      Option.map(objectPath => `${objectPath}.${node.property.name}`),
    )
  }
  return Option.none()
}

const isRouteCombinatorPath = (path: string, combinatorName: string): boolean =>
  path === combinatorName || path === `Route.${combinatorName}`

// SHAPE

type Segment =
  | Readonly<{ _tag: 'Literal'; value: string }>
  | Readonly<{ _tag: 'StringParameter' }>
  | Readonly<{ _tag: 'IntParameter' }>

type PathPiece = Segment | Readonly<{ _tag: 'RestTail' }>

type RouterShape = Readonly<{
  segments: ReadonlyArray<Segment>
  hasRestTail: boolean
  isQueryGuarded: boolean
}>

const emptyRouterShape: RouterShape = {
  segments: [],
  hasRestTail: false,
  isQueryGuarded: false,
}

const parsePathPiece = (node: unknown): Option.Option<PathPiece> => {
  if (!isCallExpression(node)) {
    return Option.none()
  }
  const maybePath = calleePath(node.callee)
  if (Option.isNone(maybePath)) {
    return Option.none()
  }
  const path = maybePath.value
  if (isRouteCombinatorPath(path, 'literal')) {
    const [firstArgument] = node.arguments
    return isStringLiteral(firstArgument)
      ? Option.some({ _tag: 'Literal', value: firstArgument.value })
      : Option.none()
  }
  if (isRouteCombinatorPath(path, 'string')) {
    return Option.some({ _tag: 'StringParameter' })
  }
  if (isRouteCombinatorPath(path, 'int')) {
    return Option.some({ _tag: 'IntParameter' })
  }
  if (isRouteCombinatorPath(path, 'rest')) {
    return Option.some({ _tag: 'RestTail' })
  }
  return Option.none()
}

const appendPathPiece = (
  shape: RouterShape,
  piece: PathPiece,
): Option.Option<RouterShape> => {
  if (shape.hasRestTail) {
    return Option.none()
  }
  if (piece._tag === 'RestTail') {
    return Option.some({ ...shape, hasRestTail: true })
  }
  return Option.some({ ...shape, segments: [...shape.segments, piece] })
}

const isRootSeed = (node: unknown): boolean =>
  pipe(
    calleePath(node),
    Option.exists(path => path === 'root' || path === 'Route.root'),
  )

const parseSeedShape = (node: unknown): Option.Option<RouterShape> =>
  isRootSeed(node)
    ? Option.some(emptyRouterShape)
    : pipe(
        parsePathPiece(node),
        Option.flatMap(piece => appendPathPiece(emptyRouterShape, piece)),
      )

const applyPipeStep = (
  shape: RouterShape,
  step: unknown,
): Option.Option<RouterShape> => {
  if (!isCallExpression(step)) {
    return Option.none()
  }
  const maybePath = calleePath(step.callee)
  if (Option.isNone(maybePath)) {
    return Option.none()
  }
  const path = maybePath.value
  if (isRouteCombinatorPath(path, 'mapTo')) {
    return Option.some(shape)
  }
  if (isRouteCombinatorPath(path, 'query')) {
    return Option.some({ ...shape, isQueryGuarded: true })
  }
  if (isRouteCombinatorPath(path, 'slash')) {
    const [firstArgument] = step.arguments
    return pipe(
      parsePathPiece(firstArgument),
      Option.flatMap(piece => appendPathPiece(shape, piece)),
    )
  }
  return pipe(
    parsePathPiece(step),
    Option.flatMap(piece => appendPathPiece(shape, piece)),
  )
}

const extractRouterShape = (init: unknown): Option.Option<RouterShape> => {
  if (!isCallExpression(init)) {
    return Option.none()
  }
  const isPipeCall = pipe(
    calleePath(init.callee),
    Option.exists(path => path === 'pipe'),
  )
  if (!isPipeCall) {
    return Option.none()
  }
  const [seedArgument, ...stepArguments] = init.arguments
  if (seedArgument === undefined) {
    return Option.none()
  }
  return stepArguments.reduce(
    (maybeShape, step) =>
      Option.flatMap(maybeShape, shape => applyPipeStep(shape, step)),
    parseSeedShape(seedArgument),
  )
}

// COVERAGE

const INTEGER_PATTERN = /^-?\d+$/

const isCanonicalIntegerLiteral = (value: string): boolean =>
  INTEGER_PATTERN.test(value) && parseInt(value, 10).toString() === value

const segmentCovers = (earlier: Segment, later: Segment): boolean =>
  pipe(
    Match.value(earlier),
    Match.tagsExhaustive({
      Literal: literalSegment =>
        later._tag === 'Literal' && later.value === literalSegment.value,
      StringParameter: () => true,
      IntParameter: () =>
        later._tag === 'IntParameter' ||
        (later._tag === 'Literal' && isCanonicalIntegerLiteral(later.value)),
    }),
  )

const segmentsCoverPrefix = (
  earlierSegments: ReadonlyArray<Segment>,
  laterSegments: ReadonlyArray<Segment>,
): boolean =>
  earlierSegments.length <= laterSegments.length &&
  pipe(
    Array.zip(earlierSegments, laterSegments),
    Array.every(([earlierSegment, laterSegment]) =>
      segmentCovers(earlierSegment, laterSegment),
    ),
  )

const covers = (earlier: RouterShape, later: RouterShape): boolean => {
  if (earlier.hasRestTail) {
    const restPrefixLength = earlier.segments.length
    const laterEffectiveLength =
      later.segments.length + (later.hasRestTail ? 1 : 0)
    return (
      laterEffectiveLength > restPrefixLength &&
      segmentsCoverPrefix(earlier.segments, later.segments)
    )
  }
  if (later.hasRestTail) {
    return false
  }
  return (
    earlier.segments.length === later.segments.length &&
    segmentsCoverPrefix(earlier.segments, later.segments)
  )
}

// ANALYSIS

type OneOfEntry = Readonly<{
  name: string
  node: Ranged
}>

type ResolvedEntry = Readonly<{
  entry: OneOfEntry
  shape: RouterShape
}>

type ShadowedReport = Readonly<{
  covering: ResolvedEntry
  shadowed: ResolvedEntry
}>

const collectShadowedEntries = (
  routerShapes: Record.ReadonlyRecord<string, RouterShape>,
  entries: ReadonlyArray<OneOfEntry>,
): ReadonlyArray<ShadowedReport> => {
  const resolvedEntries = Array.flatMap(entries, entry =>
    pipe(
      Record.get(routerShapes, entry.name),
      Option.map(shape => ({ entry, shape })),
      Option.toArray,
    ),
  )
  return Array.flatMap(resolvedEntries, (current, index) =>
    pipe(
      Array.take(resolvedEntries, index),
      Array.findFirst(
        earlier =>
          !earlier.shape.isQueryGuarded && covers(earlier.shape, current.shape),
      ),
      Option.map(covering => ({ covering, shadowed: current })),
      Option.toArray,
    ),
  )
}

const shadowedEntryMessage = (report: ShadowedReport): string =>
  report.covering.shape.hasRestTail
    ? `Router \`${report.shadowed.entry.name}\` can never match: earlier Router \`${report.covering.entry.name}\` in \`Route.oneOf(...)\` ends in \`rest\` and matches every URL under its path prefix. Move the more specific Router before the rest Router.`
    : `Router \`${report.shadowed.entry.name}\` can never match: earlier Router \`${report.covering.entry.name}\` in \`Route.oneOf(...)\` accepts the same path shape, so it always wins. Move the more specific Router first or remove the duplicate.`

// RULE

/**
 * Flags Routers in a `Route.oneOf(...)` call that can never match because an
 * earlier Router already accepts every URL they would parse. Routers with
 * shapes the rule cannot resolve are skipped, and a query-guarded Router is
 * treated as never shadowing (an approximation: an all-optional query schema
 * still matches URLs without query parameters).
 */
export const routeOneOfShadowingOrder = Rule.define({
  name: 'route-oneof-shadowing-order',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Order Route.oneOf Routers from most specific to least specific so no Router is shadowed by an earlier one.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const routerShapesRef = yield* Ref.make<
      Record.ReadonlyRecord<string, RouterShape>
    >({})
    const oneOfCallsRef = yield* Ref.make<
      ReadonlyArray<ReadonlyArray<OneOfEntry>>
    >([])

    return {
      VariableDeclarator: (node: ESTree.Node) =>
        Effect.gen(function* () {
          if (!isVariableDeclarator(node)) {
            return
          }
          const declaratorId = node.id
          if (!isIdentifier(declaratorId)) {
            return
          }
          const maybeShape = extractRouterShape(node.init)
          if (Option.isNone(maybeShape)) {
            return
          }
          yield* Ref.update(routerShapesRef, shapes =>
            Record.set(shapes, declaratorId.name, maybeShape.value),
          )
        }),
      CallExpression: (node: ESTree.Node) =>
        Effect.gen(function* () {
          if (!isCallExpression(node)) {
            return
          }
          const isOneOfCall = pipe(
            calleePath(node.callee),
            Option.exists(path => isRouteCombinatorPath(path, 'oneOf')),
          )
          if (!isOneOfCall) {
            return
          }
          const entries = Array.flatMap(node.arguments, argument =>
            isIdentifier(argument)
              ? [{ name: argument.name, node: argument }]
              : [],
          )
          yield* Ref.update(oneOfCallsRef, calls => [...calls, entries])
        }),
      'Program:exit': () =>
        Effect.gen(function* () {
          const routerShapes = yield* Ref.get(routerShapesRef)
          const oneOfCalls = yield* Ref.get(oneOfCallsRef)
          const shadowedReports = Array.flatMap(oneOfCalls, entries =>
            collectShadowedEntries(routerShapes, entries),
          )
          yield* Effect.forEach(
            shadowedReports,
            report =>
              ctx.report(
                Diagnostic.make({
                  node: report.shadowed.entry.node,
                  message: shadowedEntryMessage(report),
                }),
              ),
            { discard: true },
          )
        }),
    }
  },
})
