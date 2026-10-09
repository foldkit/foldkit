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
 * Creates a Layer recipe from a one-shot Mount handler or an Effect that constructs one.
 * An Effect constructor runs once when the application Layer is built and may
 * capture shared services. The returned handler receives the rendered element
 * and executes in that element's scope. Perform DOM work inside the handler.
 * Provide test services before building the same handler Layer.
 * Captured services retain their identity; service lookups inside execution
 * use the invocation context over the construction context.
 */
export interface ToEffectLayer<Name extends string, Input, Message> {
  <ExecuteRequirements, E = never, BuildRequirements = never>(
    build:
      | EffectHandler<Input, Message, ExecuteRequirements>
      | Effect.Effect<
          EffectHandler<Input, Message, ExecuteRequirements>,
          E,
          BuildRequirements
        >,
  ): Layer.Layer<
    Handler<Name>,
    E,
    Exclude<ExecuteRequirements | BuildRequirements, Scope.Scope>
  >
}

/**
 * Creates a Layer recipe from a streaming Mount handler or an Effect that constructs one.
 * An Effect constructor runs once when the application Layer is built and may
 * capture shared services. The returned handler receives the rendered element
 * and produces a Stream whose resources follow that element's scope.
 * Provide test services before building the same handler Layer.
 * Captured services retain their identity; service lookups inside the Stream
 * use the invocation context over the construction context.
 */
export interface ToStreamLayer<Name extends string, Input, Message> {
  <StreamRequirements, E = never, BuildRequirements = never>(
    build:
      | StreamHandler<Input, Message, StreamRequirements>
      | Effect.Effect<
          StreamHandler<Input, Message, StreamRequirements>,
          E,
          BuildRequirements
        >,
  ): Layer.Layer<
    Handler<Name>,
    E,
    Exclude<StreamRequirements | BuildRequirements, Scope.Scope>
  >
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
    ExecuteRequirements,
    E = never,
    BuildRequirements = never,
  >(
    build:
      | EffectHandler<Input, Message, ExecuteRequirements>
      | Effect.Effect<
          EffectHandler<Input, Message, ExecuteRequirements>,
          E,
          BuildRequirements
        >,
  ): Layer.Layer<
    Handler<Name>,
    E,
    Exclude<ExecuteRequirements | BuildRequirements, Scope.Scope>
  > =>
    Layer.effect(
      service,
      Effect.gen(function* () {
        const context = yield* Effect.context<
          Exclude<ExecuteRequirements, Scope.Scope> | BuildRequirements
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
    StreamRequirements,
    E = never,
    BuildRequirements = never,
  >(
    build:
      | StreamHandler<Input, Message, StreamRequirements>
      | Effect.Effect<
          StreamHandler<Input, Message, StreamRequirements>,
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
        return { identity, context, execute: handler }
      }),
    )

  return { execute, toLayer }
}
