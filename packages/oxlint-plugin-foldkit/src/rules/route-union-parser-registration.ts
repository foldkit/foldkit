import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Ref from 'effect/Ref'
import * as Result from 'effect/Result'
import * as Tuple from 'effect/Tuple'

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

const isCallExpression = (value: unknown): value is ESTree.CallExpression =>
  isCallExpressionLike(value)

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

const firstIdentifierArg = (
  call: ESTree.CallExpression,
): Option.Option<ESTree.IdentifierName> => {
  const arg = call.arguments[0]
  return arg !== undefined && isIdentifierLike(arg)
    ? Option.some(arg)
    : Option.none()
}

const isRouteDeclarationInit = (value: unknown): boolean =>
  isCallExpressionLike(value) &&
  pipe(
    callPath(value),
    Option.match({
      onNone: () => false,
      onSome: path => pathEquals(path, ['r']),
    }),
  )

const routeDeclaration = (
  node: ESTree.VariableDeclarator,
): Option.Option<{ readonly name: string; readonly node: ESTree.Node }> =>
  node.id.type === 'Identifier' && isRouteDeclarationInit(node.init)
    ? Option.some({ name: node.id.name, node: node.id })
    : Option.none()

const isRouteMapToCall = (call: ESTree.CallExpression): boolean =>
  pipe(
    callPath(call),
    Option.match({
      onNone: () => false,
      onSome: path => pathEquals(path, ['Route', 'mapTo']),
    }),
  )

const routeMapToTarget = (
  call: ESTree.CallExpression,
): Option.Option<{ readonly routeName: string; readonly node: ESTree.Node }> =>
  isRouteMapToCall(call)
    ? pipe(
        firstIdentifierArg(call),
        Option.map(arg => ({ routeName: arg.name, node: arg })),
      )
    : Option.none()

const mapToTargetsIn = (
  root: unknown,
): ReadonlyArray<{
  readonly routeName: string
  readonly node: ESTree.Node
}> => {
  if (!P.isObject(root)) return []
  const self = isCallExpression(root)
    ? pipe(
        routeMapToTarget(root),
        Option.match({
          onNone: () => [],
          onSome: target => [target],
        }),
      )
    : []
  return [
    ...self,
    ...pipe(
      Object.entries(root),
      Arr.flatMap(([key, child]) =>
        key === 'parent'
          ? []
          : Array.isArray(child)
            ? pipe(child, Arr.flatMap(mapToTargetsIn))
            : mapToTargetsIn(child),
      ),
    ),
  ]
}

interface RouterMapping {
  readonly routeName: string
  readonly routerName: string
  readonly routeNode: ESTree.Node
  readonly routerNode: ESTree.Node
}

const routerMappings = (
  node: ESTree.VariableDeclarator,
): ReadonlyArray<RouterMapping> => {
  if (node.id.type !== 'Identifier') return []
  const routerId = node.id
  return pipe(
    mapToTargetsIn(node.init),
    Arr.map(target => ({
      routeName: target.routeName,
      routerName: routerId.name,
      routeNode: target.node,
      routerNode: routerId,
    })),
  )
}

interface UnionMember {
  readonly name: string
  readonly node: ESTree.Node
}

const identifierElements = (
  array: ESTree.ArrayExpression,
): ReadonlyArray<UnionMember> =>
  pipe(
    array.elements,
    Arr.filterMap(element =>
      element !== null && isIdentifierLike(element)
        ? Result.succeed({ name: element.name, node: element })
        : Result.failVoid,
    ),
  )

const unionMembers = (
  call: ESTree.CallExpression,
): Option.Option<ReadonlyArray<UnionMember>> =>
  pipe(
    callPath(call),
    Option.filter(path => pathEquals(path, ['S', 'Union'])),
    Option.flatMap(() => {
      const arg = call.arguments[0]
      return arg !== undefined && arg.type === 'ArrayExpression'
        ? Option.some(identifierElements(arg))
        : Option.none()
    }),
  )

const oneOfRouters = (
  call: ESTree.CallExpression,
): Option.Option<ReadonlyArray<string>> =>
  pipe(
    callPath(call),
    Option.filter(path => pathEquals(path, ['Route', 'oneOf'])),
    Option.map(() =>
      pipe(
        call.arguments,
        Arr.filterMap(arg =>
          isIdentifierLike(arg) ? Result.succeed(arg.name) : Result.failVoid,
        ),
      ),
    ),
  )

const fallbackRoute = (call: ESTree.CallExpression): Option.Option<string> =>
  pipe(
    callPath(call),
    Option.filter(path => pathEquals(path, ['Route', 'parseUrlWithFallback'])),
    Option.flatMap(() => {
      const arg = call.arguments[1]
      return isIdentifierLike(arg) ? Option.some(arg.name) : Option.none()
    }),
  )

const selectRouteUnion = (
  unions: ReadonlyArray<ReadonlyArray<UnionMember>>,
  routes: HashSet.HashSet<string>,
): Option.Option<ReadonlyArray<UnionMember>> =>
  pipe(
    unions,
    Arr.filter(
      members =>
        Arr.isReadonlyArrayNonEmpty(members) &&
        pipe(
          members,
          Arr.every(member => HashSet.has(routes, member.name)),
        ),
    ),
    Arr.reduce(Option.none<ReadonlyArray<UnionMember>>(), (best, members) =>
      pipe(
        best,
        Option.match({
          onNone: () => Option.some(members),
          onSome: current =>
            members.length > current.length ? Option.some(members) : best,
        }),
      ),
    ),
  )

const analyze = (
  ctx: RuleContext['Service'],
  routeDecls: ReadonlyArray<{
    readonly name: string
    readonly node: ESTree.Node
  }>,
  unions: ReadonlyArray<ReadonlyArray<UnionMember>>,
  mappings: ReadonlyArray<RouterMapping>,
  registeredRouters: HashSet.HashSet<string>,
  fallbacks: HashSet.HashSet<string>,
): Effect.Effect<void, never, RuleContext> => {
  if (
    Arr.isReadonlyArrayEmpty(routeDecls) ||
    HashSet.size(registeredRouters) === 0
  ) {
    return Effect.void
  }
  const routeNames = pipe(
    routeDecls,
    Arr.map(route => route.name),
    HashSet.fromIterable,
  )
  const routeUnion = selectRouteUnion(unions, routeNames)
  if (Option.isNone(routeUnion)) return Effect.void
  const mappedRoutes = pipe(
    mappings,
    Arr.map(mapping => mapping.routeName),
    HashSet.fromIterable,
  )
  const routerNames = pipe(
    mappings,
    Arr.map(mapping => Tuple.make(mapping.routerName, mapping)),
    HashMap.fromIterable,
  )

  const missingRouters = Effect.forEach(
    routeUnion.value,
    member =>
      HashSet.has(fallbacks, member.name) ||
      HashSet.has(mappedRoutes, member.name)
        ? Effect.void
        : ctx.report(
            Diagnostic.make({
              node: member.node,
              message: `Route union member \`${member.name}\` has no \`Route.mapTo(${member.name})\` parser. Add a router and include it in \`Route.oneOf(...)\`, or make it the parse fallback. (FK routing)`,
            }),
          ),
    { concurrency: 1, discard: true },
  )

  const absentFromOneOf = Effect.forEach(
    HashMap.toValues(routerNames),
    mapping =>
      HashSet.has(registeredRouters, mapping.routerName)
        ? Effect.void
        : ctx.report(
            Diagnostic.make({
              node: mapping.routerNode,
              message: `Router \`${mapping.routerName}\` maps \`${mapping.routeName}\` but is not passed to \`Route.oneOf(...)\`. Registered route parsers must stay in sync with the AppRoute union. (FK routing)`,
            }),
          ),
    { concurrency: 1, discard: true },
  )

  return Effect.andThen(missingRouters, absentFromOneOf)
}

const rule: CreateRule = Rule.define({
  name: 'route-union-parser-registration',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Keep Foldkit route union members, Route.mapTo routers, and Route.oneOf registrations in sync',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const routesRef = yield* Ref.make<
      ReadonlyArray<{ readonly name: string; readonly node: ESTree.Node }>
    >([])
    const unionsRef = yield* Ref.make<
      ReadonlyArray<ReadonlyArray<UnionMember>>
    >([])
    const mappingsRef = yield* Ref.make<ReadonlyArray<RouterMapping>>([])
    const registeredRoutersRef = yield* Ref.make<HashSet.HashSet<string>>(
      HashSet.empty(),
    )
    const fallbacksRef = yield* Ref.make<HashSet.HashSet<string>>(
      HashSet.empty(),
    )

    return Visitor.merge(
      Visitor.on('VariableDeclarator', node =>
        Effect.all(
          [
            pipe(
              routeDeclaration(node),
              Option.match({
                onNone: () => Effect.void,
                onSome: route =>
                  Ref.update(routesRef, routes => [...routes, route]),
              }),
            ),
            Ref.update(mappingsRef, items => [
              ...items,
              ...routerMappings(node),
            ]),
          ],
          { concurrency: 1, discard: true },
        ),
      ),
      Visitor.on('CallExpression', node =>
        Effect.all(
          [
            pipe(
              unionMembers(node),
              Option.match({
                onNone: () => Effect.void,
                onSome: members =>
                  Ref.update(unionsRef, items => [...items, members]),
              }),
            ),
            pipe(
              oneOfRouters(node),
              Option.match({
                onNone: () => Effect.void,
                onSome: routers =>
                  Ref.update(registeredRoutersRef, set =>
                    pipe(
                      routers,
                      Arr.reduce(set, (acc, router) =>
                        HashSet.add(acc, router),
                      ),
                    ),
                  ),
              }),
            ),
            pipe(
              fallbackRoute(node),
              Option.match({
                onNone: () => Effect.void,
                onSome: name => Ref.update(fallbacksRef, HashSet.add(name)),
              }),
            ),
          ],
          { concurrency: 1, discard: true },
        ),
      ),
      Visitor.on('Program:exit', () =>
        Effect.gen(function* () {
          const routes = yield* Ref.get(routesRef)
          const unions = yield* Ref.get(unionsRef)
          const mappings = yield* Ref.get(mappingsRef)
          const registeredRouters = yield* Ref.get(registeredRoutersRef)
          const fallbacks = yield* Ref.get(fallbacksRef)
          yield* analyze(
            ctx,
            routes,
            unions,
            mappings,
            registeredRouters,
            fallbacks,
          )
        }),
      ),
    )
  },
})

export default rule
