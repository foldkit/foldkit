import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashSet from 'effect/HashSet'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Result from 'effect/Result'
import * as Str from 'effect/String'

type SubscriptionMethod = 'make' | 'lift' | 'aggregate'

type IdentifierLike = {
  readonly type: string
  readonly name: string
}

type MemberExpressionLike = {
  readonly type: string
  readonly computed?: unknown
  readonly object?: unknown
  readonly property?: unknown
}

type CallExpressionLike = {
  readonly type: string
  readonly callee?: unknown
  readonly arguments?: ReadonlyArray<unknown>
}

type ExpressionWrapperLike = {
  readonly type: string
  readonly expression?: unknown
}

type ObjectExpressionLike = {
  readonly type: string
  readonly properties?: ReadonlyArray<unknown>
}

type SpreadElementLike = {
  readonly type: string
  readonly argument?: unknown
}

interface ModuleConst {
  readonly name: string
  readonly id: ESTree.Node
  readonly init: Option.Option<ESTree.Node>
  readonly exported: boolean
}

interface SpreadCandidate {
  readonly node: ESTree.Node
  readonly argument: unknown
}

const normalizedPath = (filename: string): string =>
  Str.replaceAll('\\', '/')(filename)

const basename = (filename: string): string =>
  pipe(
    Str.split('/')(normalizedPath(filename)),
    Arr.last,
    Option.getOrElse(() => filename),
  )

const isSubscriptionFile = (filename: string): boolean =>
  basename(filename) === 'subscription.ts'

const isIdentifierLike = (value: unknown): value is IdentifierLike =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'Identifier' &&
  'name' in value &&
  P.isString(value.name)

const isMemberExpressionLike = (
  value: unknown,
): value is MemberExpressionLike =>
  P.isObject(value) && 'type' in value && value.type === 'MemberExpression'

const isCallExpressionLike = (value: unknown): value is CallExpressionLike =>
  P.isObject(value) && 'type' in value && value.type === 'CallExpression'

const isEstreeNode = (value: unknown): value is ESTree.Node =>
  P.isObject(value) && 'type' in value && P.isString(value.type)

const isObjectExpressionLike = (
  value: unknown,
): value is ObjectExpressionLike =>
  P.isObject(value) && 'type' in value && value.type === 'ObjectExpression'

const isSpreadElementLike = (value: unknown): value is SpreadElementLike =>
  P.isObject(value) && 'type' in value && value.type === 'SpreadElement'

const isExpressionWrapperLike = (
  value: unknown,
): value is ExpressionWrapperLike =>
  P.isObject(value) &&
  'type' in value &&
  P.isString(value.type) &&
  'expression' in value &&
  (value.type === 'ParenthesizedExpression' ||
    value.type === 'TSAsExpression' ||
    value.type === 'TSSatisfiesExpression' ||
    value.type === 'TSTypeAssertion' ||
    value.type === 'TSNonNullExpression' ||
    value.type === 'TSInstantiationExpression' ||
    value.type === 'ChainExpression')

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

const subscriptionMemberMethod = (
  value: unknown,
): Option.Option<SubscriptionMethod> =>
  pipe(
    memberPath(value),
    Option.flatMap(path => {
      if (pathEquals(path, ['Subscription', 'make'])) {
        return Option.some('make')
      }
      if (pathEquals(path, ['Subscription', 'lift'])) {
        return Option.some('lift')
      }
      if (pathEquals(path, ['Subscription', 'aggregate'])) {
        return Option.some('aggregate')
      }
      return Option.none()
    }),
  )

const rootedSubscriptionMethod = (
  value: unknown,
): Option.Option<SubscriptionMethod> => {
  if (isExpressionWrapperLike(value)) {
    return rootedSubscriptionMethod(value.expression)
  }
  if (isCallExpressionLike(value)) {
    return rootedSubscriptionMethod(value.callee)
  }
  return subscriptionMemberMethod(value)
}

const exportedVariableDeclaration = (
  statement: ESTree.Program['body'][number],
): Option.Option<{
  readonly declaration: ESTree.VariableDeclaration
  readonly exported: boolean
}> => {
  if (statement.type === 'VariableDeclaration') {
    return Option.some({ declaration: statement, exported: false })
  }
  if (
    statement.type === 'ExportNamedDeclaration' &&
    statement.declaration?.type === 'VariableDeclaration'
  ) {
    return Option.some({
      declaration: statement.declaration,
      exported: true,
    })
  }
  return Option.none()
}

const moduleConsts = (program: ESTree.Program): ReadonlyArray<ModuleConst> =>
  pipe(
    program.body,
    Arr.filterMap(statement =>
      pipe(
        exportedVariableDeclaration(statement),
        Option.filter(({ declaration }) => declaration.kind === 'const'),
        Option.map(({ declaration, exported }) =>
          pipe(
            declaration.declarations,
            Arr.filterMap(declarator =>
              declarator.id.type === 'Identifier'
                ? Result.succeed({
                    name: declarator.id.name,
                    id: declarator.id,
                    init: Option.fromNullishOr(declarator.init),
                    exported,
                  })
                : Result.failVoid,
            ),
          ),
        ),
        Result.fromOption(() => undefined),
      ),
    ),
    Arr.flatten,
  )

const walkChildren = <A>(
  value: object,
  visit: (child: unknown) => ReadonlyArray<A>,
): ReadonlyArray<A> =>
  pipe(
    Object.entries(value),
    Arr.flatMap(([key, child]) =>
      key === 'parent'
        ? []
        : Array.isArray(child)
          ? pipe(child, Arr.flatMap(visit))
          : visit(child),
    ),
  )

const subscriptionCallsIn = (root: unknown): ReadonlyArray<ESTree.Node> => {
  const self =
    isEstreeNode(root) &&
    isCallExpressionLike(root) &&
    Option.isSome(rootedSubscriptionMethod(root))
      ? [root]
      : []
  return P.isObject(root)
    ? [...self, ...walkChildren(root, subscriptionCallsIn)]
    : self
}

const objectSpreadCandidates = (
  object: ObjectExpressionLike,
): ReadonlyArray<SpreadCandidate> =>
  pipe(
    object.properties ?? [],
    Arr.filterMap(property => {
      if (!isEstreeNode(property) || !isSpreadElementLike(property)) {
        return Result.failVoid
      }
      return pipe(
        Option.fromNullishOr(property.argument),
        Option.map(argument => ({ node: property, argument })),
        Result.fromOption(() => undefined),
      )
    }),
  )

const spreadCandidatesIn = (root: unknown): ReadonlyArray<SpreadCandidate> => {
  const self = isObjectExpressionLike(root) ? objectSpreadCandidates(root) : []
  return P.isObject(root)
    ? [...self, ...walkChildren(root, spreadCandidatesIn)]
    : self
}

const isSubscriptionsMember = (value: unknown): boolean =>
  pipe(
    memberPath(value),
    Option.match({
      onNone: () => false,
      onSome: path => Arr.lastNonEmpty(path) === 'subscriptions',
    }),
  )

const subscriptionBindingNames = (
  consts: ReadonlyArray<ModuleConst>,
): HashSet.HashSet<string> =>
  pipe(
    consts,
    Arr.filterMap(item =>
      pipe(
        item.init,
        Option.flatMap(rootedSubscriptionMethod),
        Option.map(() => item.name),
        Result.fromOption(() => undefined),
      ),
    ),
    HashSet.fromIterable,
  )

const isSubscriptionSpread = (
  candidate: SpreadCandidate,
  bindings: HashSet.HashSet<string>,
): boolean => {
  const argument = candidate.argument
  return (
    (isIdentifierLike(argument) && HashSet.has(bindings, argument.name)) ||
    isSubscriptionsMember(argument)
  )
}

const reportMissingSubscriptions = (
  ctx: RuleContext['Service'],
  node: ESTree.Node,
): Effect.Effect<void, never, RuleContext> =>
  ctx.report(
    Diagnostic.make({
      node,
      message:
        'Files named `subscription.ts` that use Foldkit subscriptions must export one canonical `subscriptions` const built with `Subscription.make(...)` or `Subscription.aggregate(...)`. (FK subscriptions)',
    }),
  )

const reportInvalidSubscriptionsInitializer = (
  ctx: RuleContext['Service'],
  node: ESTree.Node,
): Effect.Effect<void, never, RuleContext> =>
  ctx.report(
    Diagnostic.make({
      node,
      message:
        'The canonical `subscriptions` export must be initialized from `Subscription.make(...)` or `Subscription.aggregate(...)`. Use local helpers for lifted child records, then aggregate them into `subscriptions`. (FK subscriptions)',
    }),
  )

const reportExtraExportedSubscription = (
  ctx: RuleContext['Service'],
  item: ModuleConst,
  method: SubscriptionMethod,
): Effect.Effect<void, never, RuleContext> =>
  ctx.report(
    Diagnostic.make({
      node: item.id,
      message: `Only the canonical \`subscriptions\` const may export subscription records. Keep \`Subscription.${method}(...)\` helpers local and aggregate them into \`subscriptions\`. (FK subscriptions)`,
    }),
  )

const reportSubscriptionSpread = (
  ctx: RuleContext['Service'],
  node: ESTree.Node,
): Effect.Effect<void, never, RuleContext> =>
  ctx.report(
    Diagnostic.make({
      node,
      message:
        'Do not spread subscription records or `.subscriptions` members into object literals. Use `Subscription.aggregate(...)` so duplicate subscription keys fail loudly. (FK subscriptions)',
    }),
  )

const analyze = (
  ctx: RuleContext['Service'],
  program: ESTree.Program,
): Effect.Effect<void, never, RuleContext> => {
  const consts = moduleConsts(program)
  const subscriptionCalls = subscriptionCallsIn(program)
  const spreadCandidates = spreadCandidatesIn(program)
  const bindings = subscriptionBindingNames(consts)
  const offendingSpreads = pipe(
    spreadCandidates,
    Arr.filter(candidate => isSubscriptionSpread(candidate, bindings)),
  )
  const hasSubscriptionUsage =
    !Arr.isReadonlyArrayEmpty(subscriptionCalls) ||
    !Arr.isReadonlyArrayEmpty(offendingSpreads)
  const canonical = pipe(
    consts,
    Arr.findFirst(item => item.exported && item.name === 'subscriptions'),
  )

  const missingExport =
    hasSubscriptionUsage && Option.isNone(canonical)
      ? pipe(
          Arr.head(subscriptionCalls),
          Option.orElse(() =>
            pipe(
              offendingSpreads,
              Arr.head,
              Option.map(candidate => candidate.node),
            ),
          ),
          Option.match({
            onNone: () => Effect.void,
            onSome: node => reportMissingSubscriptions(ctx, node),
          }),
        )
      : Effect.void

  const invalidCanonical = pipe(
    canonical,
    Option.flatMap(item =>
      pipe(
        item.init,
        Option.flatMap(rootedSubscriptionMethod),
        Option.filter(method => method === 'make' || method === 'aggregate'),
        Option.match({
          onSome: () => Option.none<ESTree.Node>(),
          onNone: () =>
            Option.some(
              pipe(
                item.init,
                Option.getOrElse(() => item.id),
              ),
            ),
        }),
      ),
    ),
    Option.match({
      onNone: () => Effect.void,
      onSome: node => reportInvalidSubscriptionsInitializer(ctx, node),
    }),
  )

  const extraExports = Effect.forEach(
    consts,
    item => {
      if (!item.exported || item.name === 'subscriptions') return Effect.void
      return pipe(
        item.init,
        Option.flatMap(rootedSubscriptionMethod),
        Option.match({
          onNone: () => Effect.void,
          onSome: method => reportExtraExportedSubscription(ctx, item, method),
        }),
      )
    },
    { concurrency: 1, discard: true },
  )

  const spreadReports = Effect.forEach(
    offendingSpreads,
    candidate => reportSubscriptionSpread(ctx, candidate.node),
    { concurrency: 1, discard: true },
  )

  return Effect.all(
    [missingExport, invalidCanonical, extraExports, spreadReports],
    { concurrency: 1, discard: true },
  )
}

const rule: CreateRule = Rule.define({
  name: 'subscription-file-canonical-shape',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Require subscription.ts files to expose one canonical subscriptions export and compose records with Subscription.aggregate',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return yield* Visitor.filter(
      isSubscriptionFile,
      Visitor.on('Program:exit', node => analyze(ctx, node)),
    )
  },
})

export default rule
