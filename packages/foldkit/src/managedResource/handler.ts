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
  identity: symbol
  context: Context.Context<never>
  acquire: (params: Params) => Effect.Effect<Value, unknown, any>
  release: (value: Value) => Effect.Effect<void, unknown, any>
}>

/**
 * Builds a Layer from a ManagedResource lifecycle handler or an Effect that
 * constructs one. The constructor runs when the application Layer is built;
 * acquire and release follow the entry's Model-driven lifetime. Provide
 * alternative dependency services to test the same acquisition and cleanup.
 */
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
  const identity = Symbol(name)
  const service = Context.Service<Handler<Name>, HandlerService<Params, Value>>(
    `foldkit/ManagedResource/${name}`,
  )

  const acquire = (
    params: Params,
  ): Effect.Effect<Value, unknown, Handler<Name> | Scope.Scope> =>
    Effect.flatMap(service, handler => {
      if (handler.identity !== identity) {
        return Effect.die(
          new Error(
            `[foldkit] ManagedResource handler "${name}" belongs to another definition with the same name. Give each definition a distinct name.`,
          ),
        )
      }

      return Effect.updateContext(
        Effect.suspend(() => handler.acquire(params)),
        invocationContext => Context.merge(handler.context, invocationContext),
      )
    })

  const release = (
    value: Value,
  ): Effect.Effect<void, unknown, Handler<Name> | Scope.Scope> =>
    Effect.flatMap(service, handler => {
      if (handler.identity !== identity) {
        return Effect.die(
          new Error(
            `[foldkit] ManagedResource handler "${name}" belongs to another definition with the same name. Give each definition a distinct name.`,
          ),
        )
      }

      return Effect.updateContext(
        Effect.suspend(() => handler.release(value)),
        invocationContext => Context.merge(handler.context, invocationContext),
      )
    })

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
        return { identity, context, ...handler }
      }),
    )

  return { acquire, release, toLayer }
}
