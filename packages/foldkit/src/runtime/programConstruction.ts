import {
  type Context,
  Effect,
  Layer,
  Option,
  Predicate,
  Schema,
  type Scope,
} from 'effect'

import type { AnyBlock } from '../block/definition.js'
import type { Ports } from '../port/index.js'
import { validatePorts } from './hostConnector.js'
import {
  assertRuntimeId,
  resolveApplicationContainer,
  resolveElementContainer,
} from './hostContainer.js'
import { resolveHydrationHandoff } from './hydrationHandoff.js'
import { type RootBlock, resolveProgramRoot } from './rootBlock.js'
import { runtimeInternals } from './runtime.js'

type HostConfig = Readonly<{
  block: RootBlock
  container: HTMLElement | null
  Flags?: Schema.Codec<any, any, never, never>
  flags?: Effect.Effect<any, never, any>
  ports?: Ports
}>

type NativeProgram = Readonly<{
  runtimeId: string
  start: (preservedModel?: unknown) => Effect.Effect<void>
  ports: Ports | undefined
}>

type ProgramInternals = NonNullable<ReturnType<typeof runtimeInternals.get>>
type ProviderLayer = Layer.Layer<never, any, any>

function buildProgramServices(
  layer: ProviderLayer,
  memoMap: Layer.MemoMap,
  scope: Scope.Scope,
): Effect.Effect<Context.Context<never>, any>
function buildProgramServices(
  layer: ProviderLayer,
  memoMap: Layer.MemoMap,
  scope: Scope.Scope,
): Effect.Effect<Context.Context<never>, any, any> {
  return Layer.buildWithMemoMap(layer, memoMap, scope)
}

const appendProviders = (
  previous: ProviderLayer,
  dependencies: ProviderLayer,
): ProviderLayer => Layer.provideMerge(previous, dependencies)

const providerPlan = (
  input: unknown,
): Readonly<{
  services: ProviderLayer
  runtime: ProviderLayer | undefined
}> => {
  if (!Predicate.isObject(input)) {
    throw new Error(
      '[foldkit] Program providers require a Layer or a provider plan.',
    )
  }

  for (const key of Reflect.ownKeys(input)) {
    if (key !== 'services' && key !== 'runtime') {
      throw new Error(
        '[foldkit] A Program provider plan only supports services and runtime.',
      )
    }
  }

  if (!Layer.isLayer(input['services'])) {
    throw new Error(
      '[foldkit] A Program provider plan requires a services Layer.',
    )
  }

  if (input['runtime'] !== undefined && !Layer.isLayer(input['runtime'])) {
    throw new Error(
      '[foldkit] A Program provider plan runtime provider must be a Layer.',
    )
  }

  return { services: input['services'], runtime: input['runtime'] }
}

/** @internal Defers Layer-owned graph acquisition into the ordinary Program host lifetime. */
export const makeConstructedProgram = (
  config: HostConfig,
  kind: 'Application' | 'Element',
  complete: (block: AnyBlock) => NativeProgram,
): unknown => {
  const hasFlags = Object.hasOwn(config, 'Flags')
  const host =
    kind === 'Application'
      ? resolveApplicationContainer(config.container, hasFlags)
      : {
          container: resolveElementContainer(config.container),
          hydration: undefined,
        }

  if (config.ports !== undefined) {
    validatePorts(config.ports)
  }

  const runtimeId = host.hydration?.runtimeId ?? host.container.id
  const embedLifecycle: ProgramInternals['embedLifecycle'] = {
    isEmbedActive: false,
    maybeActiveFiber: Option.none(),
  }
  const makeProvided = (
    servicesLayer: ProviderLayer,
    runtimeLayer: ProviderLayer,
  ): unknown => {
    const startWithApplicationLayer: ProgramInternals['startWithApplicationLayer'] =
      (connector, preservedModel, bootMode, flags, buildId, applicationLayer) =>
        Effect.scoped(
          Effect.gen(function* () {
            assertRuntimeId(runtimeId)

            const handoff = yield* resolveHydrationHandoff({
              bootMode,
              hydration: host.hydration,
              bootFlags: flags,
              configuredFlags: Option.fromNullishOr(config.flags),
              isFlagsRequired: hasFlags,
              FlagsCodec: config.Flags ?? Schema.Void,
              preservedModel,
              container: host.container,
              buildId,
            })
            const scope = yield* Effect.scope
            const memoMap = yield* Layer.makeMemoMap
            const services = yield* buildProgramServices(
              servicesLayer,
              memoMap,
              scope,
            ).pipe(Effect.orDie)
            const block = yield* resolveProgramRoot(config.block, memoMap).pipe(
              Effect.provideContext(services),
              Effect.orDie,
            )
            const native = complete(block)
            const internals = runtimeInternals.get(native)

            if (internals === undefined) {
              return yield* Effect.die(
                new Error(
                  '[foldkit] Root construction must complete an ordinary Program.',
                ),
              )
            }

            const runtimeProviders =
              internals.applicationLayer === undefined
                ? applicationLayer
                : Layer.provideMerge(
                    internals.applicationLayer,
                    applicationLayer,
                  )
            const providers = Layer.provideMerge(
              runtimeProviders,
              Layer.succeedContext(services),
            )

            return yield* internals.startWithApplicationLayer(
              connector,
              preservedModel,
              bootMode,
              flags,
              buildId,
              providers,
              handoff,
              memoMap,
            )
          }),
        )
    const startWith: ProgramInternals['startWith'] = (
      connector,
      preservedModel,
      bootMode = 'Fresh',
      flags,
      buildId,
    ) =>
      startWithApplicationLayer(
        connector,
        preservedModel,
        bootMode,
        flags,
        buildId,
        runtimeLayer,
      )
    const program = {
      runtimeId,
      start: (preservedModel?: unknown) =>
        startWith(Option.none(), preservedModel),
      ports: config.ports,
      provide: (input: unknown): unknown => {
        if (Layer.isLayer(input)) {
          return makeProvided(
            servicesLayer,
            appendProviders(runtimeLayer, input),
          )
        }

        const providers = providerPlan(input)

        return makeProvided(
          appendProviders(servicesLayer, providers.services),
          providers.runtime === undefined
            ? runtimeLayer
            : appendProviders(runtimeLayer, providers.runtime),
        )
      },
    }

    runtimeInternals.set(program, {
      startWith,
      startWithApplicationLayer,
      applicationLayer: runtimeLayer,
      kind,
      embedLifecycle,
    })

    return program
  }

  return makeProvided(Layer.empty, Layer.empty)
}
