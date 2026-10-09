import { Context, Effect, Layer, type Scope, Stream } from 'effect'

declare const HandlerTypeId: unique symbol

/** The service required by a Subscription whose implementation is supplied by a Layer. */
export interface Handler<Name extends string> {
  readonly [HandlerTypeId]: Name
}

type StreamHandlerWithoutKeepAlive<Dependencies, Message, R> = (
  dependencies: Dependencies,
) => Stream.Stream<Message, never, R>

type StreamHandlerWithKeepAlive<Dependencies, Message, R> = (
  dependencies: Dependencies,
  readDependencies: () => Dependencies,
) => Stream.Stream<Message, never, R>

type HandlerService<Dependencies, Message> = Readonly<{
  identity: symbol
  context: Context.Context<never>
  dependenciesToStream: (
    dependencies: Dependencies,
    ...args: ReadonlyArray<any>
  ) => Stream.Stream<Message, never, any>
}>

/**
 * Builds a Layer from a Subscription handler without `keepAliveEquivalence`.
 * Handler dependencies are captured while the Layer is constructed. The
 * Stream's invocation context is merged when it runs and takes precedence.
 * An Effect constructor runs when the application Layer is built, rather than
 * on each Stream restart. Test the handler's transformations and lifecycle by
 * providing alternative dependency services to the same handler Layer.
 */
export interface ToLayerWithoutKeepAlive<
  Name extends string,
  Dependencies,
  Message,
> {
  <StreamRequirements, E = never, BuildRequirements = never>(
    build:
      | StreamHandlerWithoutKeepAlive<Dependencies, Message, StreamRequirements>
      | Effect.Effect<
          StreamHandlerWithoutKeepAlive<
            Dependencies,
            Message,
            StreamRequirements
          >,
          E,
          BuildRequirements
        >,
  ): Layer.Layer<
    Handler<Name>,
    E,
    Exclude<StreamRequirements | BuildRequirements, Scope.Scope>
  >
}

/**
 * Builds a Layer from a Subscription handler with `keepAliveEquivalence`.
 * Handler dependencies are captured while the Layer is constructed. The
 * Stream's invocation context is merged when it runs and takes precedence.
 * An Effect constructor runs when the application Layer is built, rather than
 * on each Stream restart. Test the handler's transformations and lifecycle by
 * providing alternative dependency services to the same handler Layer.
 */
export interface ToLayerWithKeepAlive<
  Name extends string,
  Dependencies,
  Message,
> {
  <StreamRequirements, E = never, BuildRequirements = never>(
    build:
      | StreamHandlerWithKeepAlive<Dependencies, Message, StreamRequirements>
      | Effect.Effect<
          StreamHandlerWithKeepAlive<Dependencies, Message, StreamRequirements>,
          E,
          BuildRequirements
        >,
  ): Layer.Layer<
    Handler<Name>,
    E,
    Exclude<StreamRequirements | BuildRequirements, Scope.Scope>
  >
}

/** @internal Builds the service-backed Stream factories for a Subscription entry. */
export const makeHandler = <Name extends string, Dependencies, Message>(
  name: Name,
) => {
  const identity = Symbol(name)
  const service = Context.Service<
    Handler<Name>,
    HandlerService<Dependencies, Message>
  >(`foldkit/Subscription/${name}`)

  const toStream = (
    dependencies: Dependencies,
    readDependencies?: () => Dependencies,
  ): Stream.Stream<Message, never, Handler<Name>> =>
    Stream.unwrap(
      Effect.map(service, handler => {
        if (handler.identity !== identity) {
          return Stream.die(
            new Error(
              `[foldkit] Subscription handler "${name}" belongs to another definition with the same name. Give each definition a distinct name.`,
            ),
          )
        }

        return Stream.suspend(() =>
          handler.dependenciesToStream(dependencies, readDependencies),
        ).pipe(
          Stream.updateContext(invocationContext =>
            Context.merge(handler.context, invocationContext),
          ),
        )
      }),
    )

  const toLayer = <StreamRequirements, E = never, BuildRequirements = never>(
    build:
      | ((
          ...args: ReadonlyArray<any>
        ) => Stream.Stream<Message, never, StreamRequirements>)
      | Effect.Effect<
          (
            ...args: ReadonlyArray<any>
          ) => Stream.Stream<Message, never, StreamRequirements>,
          E,
          BuildRequirements
        >,
  ): Layer.Layer<
    Handler<Name>,
    E,
    Exclude<StreamRequirements | BuildRequirements, Scope.Scope>
  > =>
    Layer.effect(
      service,
      Effect.gen(function* () {
        const context = yield* Effect.context<
          Exclude<StreamRequirements, Scope.Scope> | BuildRequirements
        >()
        const handler = Effect.isEffect(build) ? yield* build : build
        return { identity, context, dependenciesToStream: handler }
      }),
    )

  return { toLayer, toStream }
}
