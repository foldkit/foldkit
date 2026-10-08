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
  context: Context.Context<never>
  execute: (args: Args) => Effect.Effect<Message, never, any>
}>

/** Builds a Layer from a Command handler or an Effect that constructs one. */
export interface ToLayer<Name extends string, Args, Message> {
  <R, E = never, BuildR = never>(
    build:
      | ((args: Args) => Effect.Effect<Message, never, R>)
      | Effect.Effect<
          (args: Args) => Effect.Effect<Message, never, R>,
          E,
          BuildR
        >,
  ): Layer.Layer<Handler<Name>, E, Exclude<R | BuildR, Scope.Scope>>
}

/** @internal Builds the service-backed execution and Layer constructor for a Command definition. */
export const makeHandler = <Name extends string, Args, Message>(name: Name) => {
  const service = Context.Service<Handler<Name>, HandlerService<Args, Message>>(
    `foldkit/Command/${name}`,
  )

  const execute = (args: Args): Effect.Effect<Message, never, Handler<Name>> =>
    Effect.flatMap(service, ({ context, execute }) =>
      Effect.updateContext(
        Effect.suspend(() => execute(args)),
        invocationContext => Context.merge(context, invocationContext),
      ),
    )

  const toLayer: ToLayer<Name, Args, Message> = <R, E = never, BuildR = never>(
    build:
      | ((args: Args) => Effect.Effect<Message, never, R>)
      | Effect.Effect<
          (args: Args) => Effect.Effect<Message, never, R>,
          E,
          BuildR
        >,
  ): Layer.Layer<Handler<Name>, E, Exclude<R | BuildR, Scope.Scope>> =>
    Layer.effect(
      service,
      Effect.gen(function* () {
        const context = yield* Effect.context<
          Exclude<R, Scope.Scope> | BuildR
        >()
        const handler = Effect.isEffect(build) ? yield* build : build
        return { context, execute: handler }
      }),
    )

  return { execute, toLayer }
}
