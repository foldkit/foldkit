import { Context, Effect, Layer, Option, Ref, Stream, String } from 'effect'

import type { Command, Handler as CommandHandler } from '../command/index.js'
import * as Interruptible from '../command/interruptible/interruptible.js'
import type { Handler as ResourceHandler } from '../managedResource/handler.js'
import type { ManagedResourceService } from '../managedResource/managedResource.js'
import type { Handler as MountHandler } from '../mount/handler.js'
import type { Handler as SubscriptionHandler } from '../subscription/handler.js'
import {
  type DefinitionIdentity,
  type NamedIdentity,
  copyIdentity,
  definitionsOf,
  isHandlerKey,
  isResourceKey,
  ownerOf,
  ownerOfIdentityToken,
  ownerOfInvocation,
} from './identity.js'
import {
  CommandInstancesTypeId,
  CurrentInstance,
  type InstanceCursor,
  type InstanceFrame,
  commandInstances,
  enterInstance,
} from './instanceContext.js'

declare const ScopedTypeId: unique symbol

/** A handler or resource capability qualified by its Binding path in the
 * composition graph. */
export interface Scoped<Path extends string, Contract> {
  readonly [ScopedTypeId]: Readonly<{
    path: (path: Path) => Path
    contract: (contract: Contract) => Contract
  }>
}

type LocalCapability<Requirements> =
  Requirements extends CommandHandler<infer Name, infer Args, infer Message>
    ? CommandHandler<Name, Args, Message>
    : Requirements extends SubscriptionHandler<
          infer Name,
          infer Dependencies,
          infer Message
        >
      ? SubscriptionHandler<Name, Dependencies, Message>
      : Requirements extends MountHandler<
            infer Name,
            infer Input,
            infer Message
          >
        ? MountHandler<Name, Input, Message>
        : Requirements extends ResourceHandler<
              infer Name,
              infer Params,
              infer Value
            >
          ? ResourceHandler<Name, Params, Value>
          : Requirements extends ManagedResourceService<infer Key>
            ? ManagedResourceService<Key>
            : never

/** @internal Constructor requirements that depend on a placement's capabilities. */
export type InvalidConstructionRequirements<Requirements> =
  Requirements extends Scoped<infer Path, infer Contract>
    ? Scoped<Path, Contract>
    : LocalCapability<Requirements>

/** @internal Rejects placement-bound capabilities during handler construction. */
export type ValidateConstructionRequirements<Requirements> = [
  InvalidConstructionRequirements<Requirements>,
] extends [never]
  ? unknown
  : Readonly<{
      'Foldkit operation handlers and ManagedResources are unavailable during handler construction': InvalidConstructionRequirements<Requirements>
    }>

/** Qualifies Foldkit handler and resource capabilities with a Binding path while
 * retaining ordinary Effect Services unchanged. */
export type Qualify<Path extends string, Requirements> =
  Requirements extends Scoped<infer ChildPath, infer Contract>
    ? Scoped<`${Path}/${ChildPath}`, Contract>
    : [LocalCapability<Requirements>] extends [never]
      ? Requirements
      : Scoped<Path, Requirements>

type CapabilityName<Requirements> =
  Requirements extends CommandHandler<infer Name, any, any>
    ? Name
    : Requirements extends SubscriptionHandler<infer Name, any, any>
      ? Name
      : Requirements extends MountHandler<infer Name, any, any>
        ? Name
        : Requirements extends ResourceHandler<infer Name, any, any>
          ? Name
          : Requirements extends ManagedResourceService<infer Key>
            ? Key
            : never

/** @internal Qualifies child capabilities lifted by an OutMessage policy. */
export type QualifyOwned<
  Path extends string,
  Id extends string,
  Requirements,
> = Requirements extends unknown
  ? [CapabilityName<Requirements>] extends [never]
    ? Requirements
    : CapabilityName<Requirements> extends `${Id}/${string}`
      ? Qualify<Path, Requirements>
      : Requirements
  : never

const scopedPrefix = '@foldkit/Block/'
const separator = '::'
const OperationScopeTypeId = Symbol('foldkit/Operation/Scope')
const EntryScopeTypeId = Symbol('foldkit/Block/EntryScope')

/** @internal Whether an operation matcher selects a particular bound path. */
export const isScopedInvocation = (operation: object): boolean =>
  Reflect.get(operation, OperationScopeTypeId) === true

/** @internal Whether a lifecycle entry selects a particular composition placement. */
export const isScopedEntry = (entry: object): boolean =>
  Reflect.get(entry, EntryScopeTypeId) === true

/** @internal Keeps a lifecycle's displayed path separate from source identity. */
export const qualifyEntry = <Entry extends object>(
  segment: string,
  entry: Entry,
): Entry => {
  const name = Reflect.get(entry, 'name')
  if (typeof name !== 'string') {
    return entry
  }
  const owned = ownerOf(entry)
  const localName =
    Reflect.get(entry, EntryScopeTypeId) === true || owned === undefined
      ? name
      : name.slice(owned.owner.id.length + 1)
  const qualified = {
    ...entry,
    name: `${segment}/${localName}`,
    [EntryScopeTypeId]: true,
  }
  copyIdentity(entry, qualified)
  return qualified
}

/** @internal Guards placement-dependent lookups during handler construction. */
export const IsConstructingHandler = Context.Reference<boolean>(
  'foldkit/Block/IsConstructingHandler',
  { defaultValue: () => false },
)

/** @internal Validates a local placement ID before it enters a runtime path. */
export const assertSegment = (segment: string): void => {
  if (segment === '' || segment.includes('/') || segment.includes(separator)) {
    throw new Error(
      `[foldkit] Invalid Block placement "${segment}". Use a nonempty local ID without "/" or "${separator}".`,
    )
  }
}

/** @internal Derives the Context key for a bound capability. */
export const qualifyKey = (segment: string, key: string): string => {
  if (key.startsWith(scopedPrefix)) {
    return `${scopedPrefix}${segment}/${key.slice(scopedPrefix.length)}`
  }
  return isHandlerKey(key) || isResourceKey(key)
    ? `${scopedPrefix}${segment}${separator}${key}`
    : key
}

/** @internal Aliases one selected handler Context to a composition placement. */
export const qualifyContext = <Path extends string, Services>(
  segment: Path,
  context: Context.Context<Services>,
): Context.Context<Qualify<Path, Services>> => {
  assertSegment(segment)
  return Context.makeUnsafe(
    new Map(
      globalThis.Array.from(context.mapUnsafe, ([key, value]) => [
        qualifyKey(segment, key),
        value,
      ]),
    ),
  )
}

type LocalContextIndex = Readonly<{
  ordinaryEntries: ReadonlyMap<string, any>
  placementEntries: ReadonlyMap<string, ReadonlyMap<string, any>>
  projectedContexts: Map<string, Context.Context<any>>
}>

const localContextIndexes = new WeakMap<
  Context.Context<never>,
  LocalContextIndex
>()

const directSeparatorIndexOf = (scopedKey: string): Option.Option<number> => {
  const findFrom = (fromIndex: number): Option.Option<number> =>
    Option.flatMap(
      String.indexOf(separator)(scopedKey.slice(fromIndex)),
      relativeIndex => {
        const index = fromIndex + relativeIndex
        const key = scopedKey.slice(index + separator.length)
        return isHandlerKey(key) || isResourceKey(key)
          ? Option.some(index)
          : findFrom(index + 1)
      },
    )

  return findFrom(0)
}

const makeLocalContextIndex = (
  context: Context.Context<never>,
): LocalContextIndex => {
  const ordinaryEntries = new Map<string, any>()
  const placementEntries = new Map<string, Map<string, any>>()

  for (const [key, value] of context.mapUnsafe) {
    if (!key.startsWith(scopedPrefix)) {
      if (!isHandlerKey(key) && !isResourceKey(key)) {
        ordinaryEntries.set(key, value)
      }
      continue
    }

    const scopedKey = key.slice(scopedPrefix.length)
    const maybeDirectIndex = directSeparatorIndexOf(scopedKey)
    const maybeChildIndex = String.indexOf('/')(scopedKey)
    const isDirect =
      Option.isSome(maybeDirectIndex) &&
      (Option.isNone(maybeChildIndex) ||
        maybeDirectIndex.value < maybeChildIndex.value)
    const maybeSegmentEnd = isDirect ? maybeDirectIndex : maybeChildIndex
    if (Option.isNone(maybeSegmentEnd)) {
      continue
    }

    const segmentEnd = maybeSegmentEnd.value
    if (segmentEnd <= 0) {
      continue
    }

    const segment = scopedKey.slice(0, segmentEnd)
    const projectedKey = isDirect
      ? scopedKey.slice(segmentEnd + separator.length)
      : `${scopedPrefix}${scopedKey.slice(segmentEnd + 1)}`
    const entries = placementEntries.get(segment) ?? new Map<string, any>()
    entries.set(projectedKey, value)
    placementEntries.set(segment, entries)
  }

  return {
    ordinaryEntries,
    placementEntries,
    projectedContexts: new Map(),
  }
}

const localContext = (
  segment: string,
  context: Context.Context<never>,
): Context.Context<any> => {
  const index =
    localContextIndexes.get(context) ?? makeLocalContextIndex(context)
  localContextIndexes.set(context, index)

  const cached = index.projectedContexts.get(segment)
  if (cached !== undefined) {
    return cached
  }

  const entries = new Map(index.ordinaryEntries)
  const placement = index.placementEntries.get(segment)
  if (placement !== undefined) {
    for (const [key, value] of placement) {
      entries.set(key, value)
    }
  }

  const projected = Context.makeUnsafe<any>(entries)
  index.projectedContexts.set(segment, projected)
  return projected
}

const makeInvocationContext = (
  segment: string,
  context: Context.Context<never>,
  frame: InstanceFrame | undefined,
  isHistorical: boolean,
  cursor?: InstanceCursor,
): Context.Context<any> => {
  const projected = localContext(segment, context)
  const local = enterInstance(
    cursor === undefined
      ? projected
      : Context.add(projected, CurrentInstance, cursor),
    frame,
    isHistorical,
  )
  const current = Context.get(local, CurrentInstance)
  const registrySegment =
    current === undefined
      ? segment
      : `${segment}[${current.node.key === undefined ? '' : encodeURIComponent(JSON.stringify(current.node.key))}]#${current.node.generation}`
  const registry = Context.get(context, Interruptible.__CurrentRegistry)
  const scopedRegistry: Interruptible.__Registry = {
    lookup: key => registry.lookup(`${registrySegment}/${key}`),
    register: (key, fiber) =>
      registry.register(`${registrySegment}/${key}`, fiber),
    release: (key, fiber) =>
      registry.release(`${registrySegment}/${key}`, fiber),
    interrupt: key => registry.interrupt(`${registrySegment}/${key}`),
  }
  return Context.makeUnsafe<any>(
    Context.add(
      Context.add(local, Interruptible.__CurrentRegistry, scopedRegistry),
      IsConstructingHandler,
      false,
    ).mapUnsafe,
  )
}

/** @internal Supplies a bound view's local capability Context. */
export const invocationContext = (
  segment: string,
  context: Context.Context<never>,
  frame?: InstanceFrame,
  isHistorical = false,
): Context.Context<any> =>
  makeInvocationContext(segment, context, frame, isHistorical)

/** @internal Projects a stable parent Context before applying an occurrence cursor. */
export const invocationContextWithCursor = (
  segment: string,
  context: Context.Context<never>,
  cursor: InstanceCursor,
  frame?: InstanceFrame,
): Context.Context<any> =>
  makeInvocationContext(segment, context, frame, false, cursor)

/** @internal Supplies the current placement's handler and resource aliases. */
export const qualifyEffect = <Path extends string, A, E, Requirements>(
  segment: Path,
  effect: Effect.Effect<A, E, Requirements>,
  frame?: InstanceFrame,
): Effect.Effect<A, E, Qualify<Path, Requirements>> => {
  assertSegment(segment)
  return Effect.updateContext(effect, context =>
    invocationContext(segment, context, frame),
  )
}

/** @internal Supplies the current placement throughout a Subscription's lifetime. */
export const qualifyStream = <Path extends string, A, E, Requirements>(
  segment: Path,
  stream: Stream.Stream<A, E, Requirements>,
): Stream.Stream<A, E, Qualify<Path, Requirements>> => {
  assertSegment(segment)
  return Stream.unwrap(
    Effect.map(Effect.context<Qualify<Path, Requirements>>(), context =>
      Stream.provideContext(stream, invocationContext(segment, context)),
    ),
  )
}

type SelectLayerOptions = Readonly<{
  allowedIdentities?: ReadonlyArray<DefinitionIdentity>
  descendantOwners?: ReadonlySet<NamedIdentity>
  requiredIdentities?: ReadonlySet<symbol>
}>

/** @internal Builds one selected local recipe in an isolated handler memo map. */
export const selectLayer = <Outputs, E, Inputs>(
  owner: NamedIdentity,
  layer: Layer.Layer<Outputs, E, Inputs>,
  options: SelectLayerOptions = {},
): Layer.Layer<Outputs, E, Inputs> =>
  Layer.fromBuildMemo((_memoMap, scope) =>
    Effect.gen(function* () {
      const incoming = yield* Effect.context<Inputs>()
      const entries = new Map(incoming.mapUnsafe)
      for (const key of entries.keys()) {
        if (isResourceKey(key)) {
          entries.set(key, yield* Ref.make(Option.none()))
        }
      }
      const construction = Context.add(
        Context.makeUnsafe(entries),
        IsConstructingHandler,
        true,
      )

      return yield* Layer.buildWithMemoMap(
        layer,
        Layer.makeMemoMapUnsafe(),
        scope,
      ).pipe(
        Effect.provideContext(construction),
        Effect.tap(context =>
          Effect.sync(() => {
            const localIdentities = definitionsOf(owner)
            const expectedIdentities = [
              ...localIdentities,
              ...(options.allowedIdentities ?? []).map(identity => ({
                identity,
                localName: identity.name,
              })),
            ]
            const allowedTokens = new Set(
              expectedIdentities.map(({ identity }) => identity.token),
            )

            for (const { identity, localName } of expectedIdentities) {
              const handler = context.mapUnsafe.get(identity.service.key)
              if (
                handler === undefined &&
                options.requiredIdentities?.has(identity.token) === true
              ) {
                throw new Error(
                  `[foldkit] The handler Layer for "${identity.name}" did not provide its declared host handler.`,
                )
              }
              if (
                handler !== undefined &&
                Reflect.get(handler, 'identity') !== identity.token
              ) {
                throw new Error(
                  `[foldkit] The handler Layer for "${owner.id}/${localName}" belongs to a different definition.`,
                )
              }
            }

            for (const [key, handler] of context.mapUnsafe) {
              if (
                !isHandlerKey(key) ||
                handler === null ||
                typeof handler !== 'object'
              ) {
                continue
              }

              const token = Reflect.get(handler, 'identity')
              if (typeof token !== 'symbol' || allowedTokens.has(token)) {
                continue
              }

              const owned = ownerOfIdentityToken(token)
              if (
                owned !== undefined &&
                options.descendantOwners?.has(owned.owner) === true
              ) {
                throw new Error(
                  `[foldkit] Block "${owner.id}" local EffectsLayer provides the child handler "${owned.owner.id}/${owned.localName}". Child handlers are collected from registered bindings.`,
                )
              }
            }
          }),
        ),
      )
    }),
  )

/** @internal Reuses a selected recipe and exposes its outputs at a placement. */
export const qualifyLayer = <Path extends string, Outputs, E, Inputs>(
  segment: Path,
  layer: Layer.Layer<Outputs, E, Inputs>,
): Layer.Layer<Qualify<Path, Outputs>, E, Qualify<Path, Inputs>> => {
  assertSegment(segment)
  return Layer.fromBuildMemo((memoMap, scope) =>
    Effect.map(
      Effect.updateContext(
        Layer.buildWithMemoMap(layer, memoMap, scope),
        context => localContext(segment, context),
      ),
      context => qualifyContext(segment, context),
    ),
  )
}

/** @internal Lowers a child Command before its result Message is lifted. */
export function qualifyCommand<Path extends string, Message, E, Requirements>(
  segment: Path,
  command: Command<Message, E, Requirements>,
  owner?: NamedIdentity,
  frame?: InstanceFrame,
  allowedIdentities?: ReadonlyArray<DefinitionIdentity>,
): Command<Message, E, Qualify<Path, Requirements>>
export function qualifyCommand(
  segment: string,
  command: Readonly<{
    name: string
    key?: string
    effect: Effect.Effect<any, any, any>
  }>,
  owner?: NamedIdentity,
  frame?: InstanceFrame,
  allowedIdentities: ReadonlyArray<DefinitionIdentity> = [],
) {
  const owned = ownerOfInvocation(command)
  const isScoped = Reflect.get(command, OperationScopeTypeId) === true
  const isAllowed =
    owned !== undefined &&
    allowedIdentities.some(identity => identity.token === owned.identity.token)
  if (
    !isScoped &&
    owned !== undefined &&
    owner !== undefined &&
    owned.owner !== owner &&
    !isAllowed
  ) {
    throw new Error(
      `[foldkit] Block "${owner.id}" returned an unbound ${owned.identity.kind} from "${owned.owner.id}".`,
    )
  }
  const localName =
    !isScoped && owned !== undefined
      ? command.name.slice(owned.owner.id.length + 1)
      : command.name
  return {
    ...command,
    [OperationScopeTypeId]: true,
    name: `${segment}${frame?.key === undefined ? '' : `[${JSON.stringify(frame.key)}]`}/${localName}`,
    [CommandInstancesTypeId]:
      frame === undefined
        ? commandInstances(command)
        : [frame, ...commandInstances(command)],
    ...(command.key === undefined ? {} : { key: `${segment}/${command.key}` }),
    ...(typeof Reflect.get(command, 'interruptsKey') === 'string'
      ? { interruptsKey: `${segment}/${Reflect.get(command, 'interruptsKey')}` }
      : {}),
    // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
    effect: qualifyEffect(segment, command.effect, frame),
  }
}
