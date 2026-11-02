import { Context, Effect, Layer, type Scope, Stream } from 'effect'

import type {
  DefinitionIdentity,
  HandlerRequirements,
  ValidateConstructionRequirements,
} from '../definitionIdentity.js'
import type { Handler } from './public.js'

export type { Handler } from './public.js'

/** @internal The capability shared by all Layer-backed Mount handlers. */
export type AnyHandler = Handler<any, any, any>

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
    Exclude<
      HandlerRequirements<ExecuteRequirements> | BuildRequirements,
      Scope.Scope
    >
  >
  <ExecuteRequirements>(
    handler: EffectHandler<Input, Message, ExecuteRequirements>,
  ): Layer.Layer<
    Handler<Name, Input, Message>,
    never,
    Exclude<HandlerRequirements<ExecuteRequirements>, Scope.Scope>
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
    Exclude<
      HandlerRequirements<StreamRequirements> | BuildRequirements,
      Scope.Scope
    >
  >
  <StreamRequirements>(
    handler: StreamHandler<Input, Message, StreamRequirements>,
  ): Layer.Layer<
    Handler<Name, Input, Message>,
    never,
    Exclude<HandlerRequirements<StreamRequirements>, Scope.Scope>
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

  const layerFromBuild = <
    ExecuteRequirements,
    E = never,
    BuildRequirements = never,
  >(
    build:
      | Effect.Effect<
          EffectHandler<Input, Message, ExecuteRequirements>,
          E,
          BuildRequirements
        >
      | EffectHandler<Input, Message, ExecuteRequirements>,
  ): Layer.Layer<
    Handler<Name, Input, Message>,
    E,
    Exclude<
      HandlerRequirements<ExecuteRequirements> | BuildRequirements,
      Scope.Scope
    >
  > =>
    Layer.effect(
      service,
      Effect.gen(function* () {
        const context = yield* Effect.context<
          | Exclude<HandlerRequirements<ExecuteRequirements>, Scope.Scope>
          | BuildRequirements
        >()
        const handler = yield* Effect.isEffect(build)
          ? build
          : Effect.succeed(build)
        return { identity, context, execute: handler }
      }),
    )

  // NOTE: one implementation serves both overloads: a handler or an Effect
  // that builds one.
  // oxlint-disable-next-line typescript/consistent-type-assertions
  const layer = layerFromBuild as unknown as ToEffectLayer<Name, Input, Message>

  const definitionIdentity: DefinitionIdentity = {
    kind: 'Mount',
    name,
    token: identity,
    service,
  }

  return { execute, toLayer: layer, identity: definitionIdentity }
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

  const layerFromBuild = <
    StreamRequirements,
    E = never,
    BuildRequirements = never,
  >(
    build:
      | Effect.Effect<
          StreamHandler<Input, Message, StreamRequirements>,
          E,
          BuildRequirements
        >
      | StreamHandler<Input, Message, StreamRequirements>,
  ): Layer.Layer<
    Handler<Name, Input, Message>,
    E,
    Exclude<
      HandlerRequirements<StreamRequirements> | BuildRequirements,
      Scope.Scope
    >
  > =>
    Layer.effect(
      service,
      Effect.gen(function* () {
        const context = yield* Effect.context<
          | Exclude<HandlerRequirements<StreamRequirements>, Scope.Scope>
          | BuildRequirements
        >()
        const handler = yield* Effect.isEffect(build)
          ? build
          : Effect.succeed(build)
        return { identity, context, execute: handler }
      }),
    )

  // NOTE: one implementation serves both overloads: a handler or an Effect
  // that builds one.
  // oxlint-disable-next-line typescript/consistent-type-assertions
  const layer = layerFromBuild as unknown as ToStreamLayer<Name, Input, Message>

  const definitionIdentity: DefinitionIdentity = {
    kind: 'Mount',
    name,
    token: identity,
    service,
  }

  return { execute, toLayer: layer, identity: definitionIdentity }
}
