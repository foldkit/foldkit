import { Context, Effect, Layer, type Scope } from 'effect'

declare const HandlerTypeId: unique symbol

/** The service required by a ManagedResource whose lifecycle is supplied by a Layer. */
export interface Handler<Name extends string> {
  readonly [HandlerTypeId]: Name
}

type LifecycleHandler<Params, Value> = Readonly<{
  acquire: (params: Params) => Effect.Effect<Value, any, any>
  release: (value: Value) => Effect.Effect<void, any, any>
}>

type LifecycleRequirements<Lifecycle> =
  Lifecycle extends LifecycleHandler<any, any>
    ?
        | Effect.Services<ReturnType<Lifecycle['acquire']>>
        | Effect.Services<ReturnType<Lifecycle['release']>>
    : never

type HandlerService<Params, Value> = Readonly<{
  identity: symbol
  context: Context.Context<never>
  acquire: (params: Params) => Effect.Effect<Value, unknown, any>
  release: (value: Value) => Effect.Effect<void, unknown, any>
}>

/**
 * Creates a Layer recipe from an Effect that constructs a ManagedResource
 * lifecycle handler. The constructor runs once when the application Layer
 * is built and may capture shared services. The returned acquire and release
 * functions manage each handle according to Model state. Acquire scoped
 * resources inside acquire so their finalizers follow the handle's lifetime.
 * Provide test services before building the same lifecycle handler Layer.
 * Captured services retain their identity; service lookups during acquire and
 * release use the invocation context over the construction context.
 */
export interface ToLayer<Name extends string, Params, Value> {
  <
    Lifecycle extends LifecycleHandler<Params, Value>,
    BuildError = never,
    BuildRequirements = never,
  >(
    build: Effect.Effect<Lifecycle, BuildError, BuildRequirements>,
  ): Layer.Layer<
    Handler<Name>,
    BuildError,
    Exclude<LifecycleRequirements<Lifecycle> | BuildRequirements, Scope.Scope>
  >
}

/** @internal Builds the service-backed lifecycle functions for a ManagedResource entry. */
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
    Lifecycle extends LifecycleHandler<Params, Value>,
    BuildError = never,
    BuildRequirements = never,
  >(
    build: Effect.Effect<Lifecycle, BuildError, BuildRequirements>,
  ): Layer.Layer<
    Handler<Name>,
    BuildError,
    Exclude<LifecycleRequirements<Lifecycle> | BuildRequirements, Scope.Scope>
  > =>
    Layer.effect(
      service,
      Effect.gen(function* () {
        const context = yield* Effect.context<
          | Exclude<LifecycleRequirements<Lifecycle>, Scope.Scope>
          | BuildRequirements
        >()
        const handler = yield* build
        return { identity, context, ...handler }
      }),
    )

  return { acquire, release, toLayer }
}
