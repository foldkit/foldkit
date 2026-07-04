import { Array, Effect, Option, Ref, pipe } from 'effect'
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

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression' &&
  'arguments' in node &&
  Array.isArray(node.arguments)

const isArrayExpression = (node: unknown): node is ESTree.ArrayExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrayExpression' &&
  'elements' in node &&
  Array.isArray(node.elements)

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

const isSchemaUnionPath = (path: string): boolean =>
  path === 'S.Union' || path === 'Schema.Union'

const isRouteDeclarationInit = (init: unknown): boolean =>
  isCallExpression(init) &&
  pipe(
    calleePath(init.callee),
    Option.exists(path => path === 'r'),
  )

const matchMapToRouteName = (node: unknown): Option.Option<string> => {
  if (!isCallExpression(node)) {
    return Option.none()
  }
  return pipe(
    calleePath(node.callee),
    Option.filter(path => isRouteCombinatorPath(path, 'mapTo')),
    Option.flatMap(() => Array.head(node.arguments)),
    Option.flatMap(firstArgument =>
      isIdentifier(firstArgument)
        ? Option.some(firstArgument.name)
        : Option.none(),
    ),
  )
}

const collectMappedRouteNames = (value: unknown): ReadonlyArray<string> => {
  if (Array.isArray(value)) {
    return Array.flatMap(value, collectMappedRouteNames)
  }
  if (typeof value !== 'object' || value === null) {
    return []
  }
  const ownRouteName = matchMapToRouteName(value)
  const childRouteNames = Array.flatMap(
    Object.entries(value),
    ([propertyName, propertyValue]) =>
      propertyName === 'parent' ? [] : collectMappedRouteNames(propertyValue),
  )
  return [...Option.toArray(ownRouteName), ...childRouteNames]
}

type UnionMember = Readonly<{
  name: string
  node: Ranged
}>

type RouterMapping = Readonly<{
  routeName: string
  routerName: string
  routerNode: Ranged
}>

const selectRouteUnion = (
  unionCandidates: ReadonlyArray<ReadonlyArray<UnionMember>>,
  declaredRouteNames: ReadonlyArray<string>,
): Option.Option<ReadonlyArray<UnionMember>> => {
  const qualifyingUnions = unionCandidates.filter(
    members =>
      Array.isReadonlyArrayNonEmpty(members) &&
      members.every(member => Array.contains(declaredRouteNames, member.name)),
  )
  const maybeNoSelection: Option.Option<ReadonlyArray<UnionMember>> =
    Option.none()
  return Array.reduce(
    qualifyingUnions,
    maybeNoSelection,
    (maybeSelection, candidate) =>
      Option.match(maybeSelection, {
        onNone: () => Option.some(candidate),
        onSome: selected =>
          candidate.length > selected.length
            ? Option.some(candidate)
            : maybeSelection,
      }),
  )
}

const unparsedMemberMessage = (memberName: string): string =>
  `Route union member \`${memberName}\` has no \`Route.mapTo(${memberName})\` Router. Define a Router for it and pass that Router to \`Route.oneOf(...)\`, or make \`${memberName}\` the \`Route.parseUrlWithFallback\` fallback.`

const unregisteredRouterMessage = (
  routerName: string,
  routeName: string,
): string =>
  `Router \`${routerName}\` maps \`${routeName}\` but is not passed to \`Route.oneOf(...)\`. Register every Router that parses a route union member so the parser stays in sync with the union.`

// RULE

/**
 * Keeps a routing file's route union, its `Route.mapTo` Routers, and the
 * `Route.oneOf` registration in sync. Flags union members that no Router
 * parses and Routers that parse a route but were never registered.
 */
export const routeUnionParserRegistration = Rule.define({
  name: 'route-union-parser-registration',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Keep the route union, its Route.mapTo Routers, and the Route.oneOf registration in sync.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const declaredRouteNamesRef = yield* Ref.make<ReadonlyArray<string>>([])
    const unionCandidatesRef = yield* Ref.make<
      ReadonlyArray<ReadonlyArray<UnionMember>>
    >([])
    const routerMappingsRef = yield* Ref.make<ReadonlyArray<RouterMapping>>([])
    const registeredRouterNamesRef = yield* Ref.make<ReadonlyArray<string>>([])
    const fallbackRouteNamesRef = yield* Ref.make<ReadonlyArray<string>>([])

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
          const init = node.init
          if (init === null || init === undefined) {
            return
          }
          if (isRouteDeclarationInit(init)) {
            yield* Ref.update(declaredRouteNamesRef, routeNames => [
              ...routeNames,
              declaratorId.name,
            ])
          }
          const mappedRouteNames = collectMappedRouteNames(init)
          yield* Ref.update(routerMappingsRef, mappings => [
            ...mappings,
            ...Array.map(mappedRouteNames, routeName => ({
              routeName,
              routerName: declaratorId.name,
              routerNode: declaratorId,
            })),
          ])
        }),
      CallExpression: (node: ESTree.Node) =>
        Effect.gen(function* () {
          if (!isCallExpression(node)) {
            return
          }
          const maybePath = calleePath(node.callee)
          if (Option.isNone(maybePath)) {
            return
          }
          const path = maybePath.value
          if (isSchemaUnionPath(path)) {
            const [firstArgument] = node.arguments
            if (isArrayExpression(firstArgument)) {
              const members = Array.flatMap(firstArgument.elements, element =>
                isIdentifier(element)
                  ? [{ name: element.name, node: element }]
                  : [],
              )
              yield* Ref.update(unionCandidatesRef, unions => [
                ...unions,
                members,
              ])
            }
            return
          }
          if (isRouteCombinatorPath(path, 'oneOf')) {
            const registeredNames = Array.flatMap(node.arguments, argument =>
              isIdentifier(argument) ? [argument.name] : [],
            )
            yield* Ref.update(registeredRouterNamesRef, names => [
              ...names,
              ...registeredNames,
            ])
            return
          }
          if (isRouteCombinatorPath(path, 'parseUrlWithFallback')) {
            const maybeFallbackName = pipe(
              Array.get(node.arguments, 1),
              Option.flatMap(secondArgument =>
                isIdentifier(secondArgument)
                  ? Option.some(secondArgument.name)
                  : Option.none(),
              ),
            )
            if (Option.isSome(maybeFallbackName)) {
              yield* Ref.update(fallbackRouteNamesRef, names => [
                ...names,
                maybeFallbackName.value,
              ])
            }
          }
        }),
      'Program:exit': () =>
        Effect.gen(function* () {
          const declaredRouteNames = yield* Ref.get(declaredRouteNamesRef)
          const registeredRouterNames = yield* Ref.get(registeredRouterNamesRef)
          if (
            Array.isReadonlyArrayEmpty(declaredRouteNames) ||
            Array.isReadonlyArrayEmpty(registeredRouterNames)
          ) {
            return
          }
          const routerMappings = yield* Ref.get(routerMappingsRef)
          const declaredRouteMappings = routerMappings.filter(mapping =>
            Array.contains(declaredRouteNames, mapping.routeName),
          )
          if (Array.isReadonlyArrayEmpty(declaredRouteMappings)) {
            return
          }
          const unionCandidates = yield* Ref.get(unionCandidatesRef)
          const maybeSelectedUnion = selectRouteUnion(
            unionCandidates,
            declaredRouteNames,
          )
          if (Option.isNone(maybeSelectedUnion)) {
            return
          }
          const selectedUnion = maybeSelectedUnion.value
          const fallbackRouteNames = yield* Ref.get(fallbackRouteNamesRef)
          const mappedRouteNames = Array.map(
            declaredRouteMappings,
            mapping => mapping.routeName,
          )
          const unparsedMembers = selectedUnion.filter(
            member =>
              !Array.contains(fallbackRouteNames, member.name) &&
              !Array.contains(mappedRouteNames, member.name),
          )
          yield* Effect.forEach(
            unparsedMembers,
            member =>
              ctx.report(
                Diagnostic.make({
                  node: member.node,
                  message: unparsedMemberMessage(member.name),
                }),
              ),
            { discard: true },
          )
          const uniqueRouterMappings = Array.dedupeWith(
            declaredRouteMappings,
            (first, second) => first.routerName === second.routerName,
          )
          const unregisteredRouterMappings = uniqueRouterMappings.filter(
            mapping =>
              !Array.contains(registeredRouterNames, mapping.routerName),
          )
          yield* Effect.forEach(
            unregisteredRouterMappings,
            mapping =>
              ctx.report(
                Diagnostic.make({
                  node: mapping.routerNode,
                  message: unregisteredRouterMessage(
                    mapping.routerName,
                    mapping.routeName,
                  ),
                }),
              ),
            { discard: true },
          )
        }),
    }
  },
})
