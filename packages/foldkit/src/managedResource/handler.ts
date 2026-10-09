import { Context, Effect, Layer, type Scope } from 'effect'

declare const HandlerTypeId: unique symbol

/** The service required by a Managed Resource whose lifecycle is supplied by a Layer. */
export interface Handler<Name extends string> {
  readonly [HandlerTypeId]: Name
}

type LifecycleHandler<
  Params,
  Value,
  AcquireRequirements,
  ReleaseRequirements,
  AcquireError,
  ReleaseError,
> = Readonly<{
  acquire: (
    params: Params,
  ) => Effect.Effect<Value, AcquireError, AcquireRequirements | Scope.Scope>
  release: (
    value: Value,
  ) => Effect.Effect<void, ReleaseError, ReleaseRequirements>
}>

type HandlerService<Params, Value> = Readonly<{
  identity: symbol
  context: Context.Context<never>
  acquire: (params: Params) => Effect.Effect<Value, unknown, any>
  release: (value: Value) => Effect.Effect<void, unknown, any>
}>

/**
 * Creates a Layer recipe from a ManagedResource lifecycle handler or an Effect
 * that constructs one. The constructor runs once when the application Layer
 * is built and may capture shared services. The returned acquire and release
 * functions manage each handle according to Model state. Acquire scoped
 * resources inside acquire so their finalizers follow the handle's lifetime.
 * Provide test services before building the same lifecycle handler Layer.
 * Captured services retain their identity; service lookups during acquire and
 * release use the invocation context over the construction context.
 */
export interface ToLayer<Name extends string, Params, Value> {
  <
    AcquireRequirements,
    ReleaseRequirements,
    BuildError = never,
    BuildRequirements = never,
    AcquireError = unknown,
    ReleaseError = unknown,
  >(
    build:
      | LifecycleHandler<
          Params,
          Value,
          AcquireRequirements,
          ReleaseRequirements,
          AcquireError,
          ReleaseError
        >
      | Effect.Effect<
          LifecycleHandler<
            Params,
            Value,
            AcquireRequirements,
            ReleaseRequirements,
            AcquireError,
            ReleaseError
          >,
          BuildError,
          BuildRequirements
        >,
  ): Layer.Layer<
    Handler<Name>,
    BuildError,
    Exclude<
      AcquireRequirements | ReleaseRequirements | BuildRequirements,
      Scope.Scope
    >
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
    AcquireRequirements,
    ReleaseRequirements,
    BuildError = never,
    BuildRequirements = never,
    AcquireError = unknown,
    ReleaseError = unknown,
  >(
    build:
      | LifecycleHandler<
          Params,
          Value,
          AcquireRequirements,
          ReleaseRequirements,
          AcquireError,
          ReleaseError
        >
      | Effect.Effect<
          LifecycleHandler<
            Params,
            Value,
            AcquireRequirements,
            ReleaseRequirements,
            AcquireError,
            ReleaseError
          >,
          BuildError,
          BuildRequirements
        >,
  ): Layer.Layer<
    Handler<Name>,
    BuildError,
    Exclude<
      AcquireRequirements | ReleaseRequirements | BuildRequirements,
      Scope.Scope
    >
  > =>
    Layer.effect(
      service,
      Effect.gen(function* () {
        const context = yield* Effect.context<
          | Exclude<AcquireRequirements | ReleaseRequirements, Scope.Scope>
          | BuildRequirements
        >()
        const handler = Effect.isEffect(build) ? yield* build : build
        return { identity, context, ...handler }
      }),
    )

  return { acquire, release, toLayer }
}
