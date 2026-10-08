import { Context, Effect, Layer, type Scope } from 'effect'

declare const HandlerTypeId: unique symbol

/** The service required by a Managed Resource whose lifecycle is supplied by a Layer. */
export interface Handler<Name extends string> {
  readonly [HandlerTypeId]: Name
}

type LifecycleHandler<Params, Value, AcquireR, ReleaseR> = Readonly<{
  acquire: (
    params: Params,
  ) => Effect.Effect<Value, unknown, AcquireR | Scope.Scope>
  release: (value: Value) => Effect.Effect<void, unknown, ReleaseR>
}>

type HandlerService<Params, Value> = Readonly<{
  context: Context.Context<never>
  acquire: (params: Params) => Effect.Effect<Value, unknown, any>
  release: (value: Value) => Effect.Effect<void, unknown, any>
}>

/** Builds a Layer from a Managed Resource lifecycle handler. */
export interface ToLayer<Name extends string, Params, Value> {
  <AcquireR, ReleaseR, E = never, BuildR = never>(
    build:
      | LifecycleHandler<Params, Value, AcquireR, ReleaseR>
      | Effect.Effect<
          LifecycleHandler<Params, Value, AcquireR, ReleaseR>,
          E,
          BuildR
        >,
  ): Layer.Layer<
    Handler<Name>,
    E,
    Exclude<AcquireR | ReleaseR | BuildR, Scope.Scope>
  >
}

/** @internal Builds the service-backed lifecycle functions for a Managed Resource entry. */
export const makeHandler = <Name extends string, Params, Value>(name: Name) => {
  const service = Context.Service<Handler<Name>, HandlerService<Params, Value>>(
    `foldkit/ManagedResource/${name}`,
  )

  const acquire = (
    params: Params,
  ): Effect.Effect<Value, unknown, Handler<Name> | Scope.Scope> =>
    Effect.flatMap(service, ({ context, acquire }) =>
      Effect.updateContext(
        Effect.suspend(() => acquire(params)),
        invocationContext => Context.merge(context, invocationContext),
      ),
    )

  const release = (
    value: Value,
  ): Effect.Effect<void, unknown, Handler<Name> | Scope.Scope> =>
    Effect.flatMap(service, ({ context, release }) =>
      Effect.updateContext(
        Effect.suspend(() => release(value)),
        invocationContext => Context.merge(context, invocationContext),
      ),
    )

  const toLayer: ToLayer<Name, Params, Value> = <
    AcquireR,
    ReleaseR,
    E = never,
    BuildR = never,
  >(
    build:
      | LifecycleHandler<Params, Value, AcquireR, ReleaseR>
      | Effect.Effect<
          LifecycleHandler<Params, Value, AcquireR, ReleaseR>,
          E,
          BuildR
        >,
  ): Layer.Layer<
    Handler<Name>,
    E,
    Exclude<AcquireR | ReleaseR | BuildR, Scope.Scope>
  > =>
    Layer.effect(
      service,
      Effect.gen(function* () {
        const context = yield* Effect.context<
          Exclude<AcquireR | ReleaseR, Scope.Scope> | BuildR
        >()
        const handler = Effect.isEffect(build) ? yield* build : build
        return { context, ...handler }
      }),
    )

  return { acquire, release, toLayer }
}
