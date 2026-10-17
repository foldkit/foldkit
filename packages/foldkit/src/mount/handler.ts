import { Context, Effect, Layer, type Scope, Stream } from 'effect'

import type { DefinitionIdentity } from '../block/identity.js'
import type { ValidateConstructionRequirements } from '../block/scope.js'

declare const HandlerTypeId: unique symbol

/** @internal The capability shared by all Layer-backed Mount handlers. */
export interface AnyHandler {
  readonly [HandlerTypeId]: Readonly<{ name: string }>
}

/** The service required by a Mount whose implementation is supplied by a Layer. */
export interface Handler<
  Name extends string,
  Input,
  ResultMessage,
> extends AnyHandler {
  readonly [HandlerTypeId]: Readonly<{
    name: Name
    input: (input: Input) => Input
    result: (result: ResultMessage) => ResultMessage
  }>
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
 * Creates a Layer recipe from an Effect that constructs a one-shot Mount handler.
 * An Effect constructor runs once when the application Layer is built and may
 * capture shared services. The returned handler receives the rendered element
 * and executes in that element's scope. Perform DOM work inside the handler.
 * Provide test services before building the same handler Layer.
 * Captured services retain their identity; service lookups inside execution
 * use the invocation context over the construction context.
 */
export interface ToEffectLayer<Name extends string, Input, Message> {
  <ExecuteRequirements, E = never, BuildRequirements = never>(
    build: Effect.Effect<
      EffectHandler<Input, Message, ExecuteRequirements>,
      E,
      BuildRequirements
    > &
      ValidateConstructionRequirements<BuildRequirements>,
  ): Layer.Layer<
    Handler<Name, Input, Message>,
    E,
    Exclude<ExecuteRequirements | BuildRequirements, Scope.Scope>
  >
}

/**
 * Creates a Layer recipe from an Effect that constructs a streaming Mount handler.
 * An Effect constructor runs once when the application Layer is built and may
 * capture shared services. The returned handler receives the rendered element
 * and produces a Stream whose resources follow that element's scope.
 * Provide test services before building the same handler Layer.
 * Captured services retain their identity; service lookups inside the Stream
 * use the invocation context over the construction context.
 */
export interface ToStreamLayer<Name extends string, Input, Message> {
  <StreamRequirements, E = never, BuildRequirements = never>(
    build: Effect.Effect<
      StreamHandler<Input, Message, StreamRequirements>,
      E,
      BuildRequirements
    > &
      ValidateConstructionRequirements<BuildRequirements>,
  ): Layer.Layer<
    Handler<Name, Input, Message>,
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
    Handler<Name, Input, Message>,
    EffectHandlerService<Input, Message>
  >(`foldkit/Mount/${name}`)

  const execute = (
    input: Input,
  ): Effect.Effect<
    Message,
    never,
    Handler<Name, Input, Message> | Scope.Scope
  > =>
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
    build: Effect.Effect<
      EffectHandler<Input, Message, ExecuteRequirements>,
      E,
      BuildRequirements
    >,
  ): Layer.Layer<
    Handler<Name, Input, Message>,
    E,
    Exclude<ExecuteRequirements | BuildRequirements, Scope.Scope>
  > =>
    Layer.effect(
      service,
      Effect.gen(function* () {
        const context = yield* Effect.context<
          Exclude<ExecuteRequirements, Scope.Scope> | BuildRequirements
        >()
        const handler = yield* build
        return { identity, context, execute: handler }
      }),
    )

  const definitionIdentity: DefinitionIdentity = {
    kind: 'Mount',
    name,
    token: identity,
    service,
  }

  return { execute, toLayer, identity: definitionIdentity }
}

/** @internal Builds service-backed execution for a streaming Mount definition. */
export const makeStreamHandler = <Name extends string, Input, Message>(
  name: Name,
) => {
  const identity = Symbol(name)
  const service = Context.Service<
    Handler<Name, Input, Message>,
    StreamHandlerService<Input, Message>
  >(`foldkit/Mount/${name}`)

  const execute = (
    input: Input,
  ): Stream.Stream<Message, never, Handler<Name, Input, Message>> =>
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
    build: Effect.Effect<
      StreamHandler<Input, Message, StreamRequirements>,
      E,
      BuildRequirements
    >,
  ): Layer.Layer<
    Handler<Name, Input, Message>,
    E,
    Exclude<StreamRequirements | BuildRequirements, Scope.Scope>
  > =>
    Layer.effect(
      service,
      Effect.gen(function* () {
        const context = yield* Effect.context<
          Exclude<StreamRequirements, Scope.Scope> | BuildRequirements
        >()
        const handler = yield* build
        return { identity, context, execute: handler }
      }),
    )

  const definitionIdentity: DefinitionIdentity = {
    kind: 'Mount',
    name,
    token: identity,
    service,
  }

  return { execute, toLayer, identity: definitionIdentity }
}
