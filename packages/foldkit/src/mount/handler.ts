import { Context, Effect, Layer, type Scope, Stream } from 'effect'

declare const HandlerTypeId: unique symbol

/** The service required by a Mount whose implementation is supplied by a Layer. */
export interface Handler<Name extends string> {
  readonly [HandlerTypeId]: Name
}

type EffectHandler<Input, Message, R> = (
  input: Input,
) => Effect.Effect<Message, never, R>

type StreamHandler<Input, Message, R> = (
  input: Input,
) => Stream.Stream<Message, never, R>

type EffectHandlerService<Input, Message> = Readonly<{
  identity: symbol
  context: Context.Context<never>
  execute: EffectHandler<Input, Message, any>
}>

type StreamHandlerService<Input, Message> = Readonly<{
  identity: symbol
  context: Context.Context<never>
  execute: StreamHandler<Input, Message, any>
}>

/**
 * Builds a Layer from a one-shot Mount handler or an Effect that constructs one.
 * An Effect constructor runs when the application Layer is built. The handler
 * executes in the rendered element's scope. Provide alternative dependency
 * services to test the same DOM behavior and cleanup.
 */
export interface ToEffectLayer<Name extends string, Input, Message> {
  <R, E = never, BuildR = never>(
    build:
      | EffectHandler<Input, Message, R>
      | Effect.Effect<EffectHandler<Input, Message, R>, E, BuildR>,
  ): Layer.Layer<Handler<Name>, E, Exclude<R | BuildR, Scope.Scope>>
}

/**
 * Builds a Layer from a streaming Mount handler or an Effect that constructs one.
 * An Effect constructor runs when the application Layer is built. Each Stream
 * executes in the rendered element's scope. Provide alternative dependency
 * services to test the same Stream behavior and cleanup.
 */
export interface ToStreamLayer<Name extends string, Input, Message> {
  <R, E = never, BuildR = never>(
    build:
      | StreamHandler<Input, Message, R>
      | Effect.Effect<StreamHandler<Input, Message, R>, E, BuildR>,
  ): Layer.Layer<Handler<Name>, E, Exclude<R | BuildR, Scope.Scope>>
}

/** @internal Builds service-backed execution for a one-shot Mount definition. */
export const makeEffectHandler = <Name extends string, Input, Message>(
  name: Name,
) => {
  const identity = Symbol(name)
  const service = Context.Service<
    Handler<Name>,
    EffectHandlerService<Input, Message>
  >(`foldkit/Mount/${name}`)

  const execute = (
    input: Input,
  ): Effect.Effect<Message, never, Handler<Name> | Scope.Scope> =>
    Effect.flatMap(service, handler => {
      if (handler.identity !== identity) {
        return Effect.die(
          new Error(
            `[foldkit] Mount handler "${name}" belongs to another definition with the same name. Give each definition a distinct name.`,
          ),
        )
      }

      return Effect.updateContext(
        Effect.suspend(() => handler.execute(input)),
        invocationContext => Context.merge(handler.context, invocationContext),
      )
    })

  const toLayer: ToEffectLayer<Name, Input, Message> = <
    R,
    E = never,
    BuildR = never,
  >(
    build:
      | EffectHandler<Input, Message, R>
      | Effect.Effect<EffectHandler<Input, Message, R>, E, BuildR>,
  ): Layer.Layer<Handler<Name>, E, Exclude<R | BuildR, Scope.Scope>> =>
    Layer.effect(
      service,
      Effect.gen(function* () {
        const context = yield* Effect.context<
          Exclude<R, Scope.Scope> | BuildR
        >()
        const handler = Effect.isEffect(build) ? yield* build : build
        return { identity, context, execute: handler }
      }),
    )

  return { execute, toLayer }
}

/** @internal Builds service-backed execution for a streaming Mount definition. */
export const makeStreamHandler = <Name extends string, Input, Message>(
  name: Name,
) => {
  const identity = Symbol(name)
  const service = Context.Service<
    Handler<Name>,
    StreamHandlerService<Input, Message>
  >(`foldkit/Mount/${name}`)

  const execute = (
    input: Input,
  ): Stream.Stream<Message, never, Handler<Name>> =>
    Stream.unwrap(
      Effect.map(service, handler => {
        if (handler.identity !== identity) {
          return Stream.die(
            new Error(
              `[foldkit] Mount handler "${name}" belongs to another definition with the same name. Give each definition a distinct name.`,
            ),
          )
        }

        return Stream.suspend(() => handler.execute(input)).pipe(
          Stream.updateContext(invocationContext =>
            Context.merge(handler.context, invocationContext),
          ),
        )
      }),
    )

  const toLayer: ToStreamLayer<Name, Input, Message> = <
    R,
    E = never,
    BuildR = never,
  >(
    build:
      | StreamHandler<Input, Message, R>
      | Effect.Effect<StreamHandler<Input, Message, R>, E, BuildR>,
  ): Layer.Layer<Handler<Name>, E, Exclude<R | BuildR, Scope.Scope>> =>
    Layer.effect(
      service,
      Effect.gen(function* () {
        const context = yield* Effect.context<
          Exclude<R, Scope.Scope> | BuildR
        >()
        const handler = Effect.isEffect(build) ? yield* build : build
        return { identity, context, execute: handler }
      }),
    )

  return { execute, toLayer }
}
