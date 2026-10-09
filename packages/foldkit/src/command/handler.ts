import { Context, Effect, Layer, type Scope } from 'effect'

declare const HandlerTypeId: unique symbol

/** The service required by a Command whose implementation is supplied by a Layer. */
export interface Handler<Name extends string> {
  readonly [HandlerTypeId]: Name
}

/** Extracts the handler requirement carried by a Command definition. */
export type HandlerOf<
  Definition extends (...args: any) => { effect: Effect.Effect<any, any, any> },
> =
  ReturnType<Definition>['effect'] extends Effect.Effect<any, any, infer R>
    ? Extract<R, Handler<string>>
    : never

type HandlerService<Args, Message> = Readonly<{
  identity: symbol
  context: Context.Context<never>
  execute: (args: Args) => Effect.Effect<Message, never, any>
}>

/**
 * Builds a Layer from a Command handler or an Effect that constructs one.
 * An Effect constructor runs once when the application Layer is built and
 * can capture shared services for subsequent executions. Arguments are
 * dispatch data; service dependencies enter through the Effect requirements.
 * Provide alternative dependency services to test the same handler logic.
 */
export interface ToLayer<Name extends string, Args, Message> {
  <ExecuteRequirements, E = never, BuildRequirements = never>(
    build:
      | ((args: Args) => Effect.Effect<Message, never, ExecuteRequirements>)
      | Effect.Effect<
          (args: Args) => Effect.Effect<Message, never, ExecuteRequirements>,
          E,
          BuildRequirements
        >,
  ): Layer.Layer<
    Handler<Name>,
    E,
    Exclude<ExecuteRequirements | BuildRequirements, Scope.Scope>
  >
}

/** @internal Builds the service-backed execution and Layer constructor for a Command definition. */
export const makeHandler = <Name extends string, Args, Message>(name: Name) => {
  const identity = Symbol(name)
  const service = Context.Service<Handler<Name>, HandlerService<Args, Message>>(
    `foldkit/Command/${name}`,
  )

  const execute = (args: Args): Effect.Effect<Message, never, Handler<Name>> =>
    Effect.flatMap(service, handler => {
      if (handler.identity !== identity) {
        return Effect.die(
          new Error(
            `[foldkit] Command handler "${name}" belongs to another definition with the same name. Give each definition a distinct name.`,
          ),
        )
      }

      return Effect.updateContext(
        Effect.suspend(() => handler.execute(args)),
        invocationContext => Context.merge(handler.context, invocationContext),
      )
    })

  const toLayer: ToLayer<Name, Args, Message> = <
    ExecuteRequirements,
    E = never,
    BuildRequirements = never,
  >(
    build:
      | ((args: Args) => Effect.Effect<Message, never, ExecuteRequirements>)
      | Effect.Effect<
          (args: Args) => Effect.Effect<Message, never, ExecuteRequirements>,
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
