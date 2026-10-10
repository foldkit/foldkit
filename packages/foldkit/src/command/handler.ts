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
 * Creates a Layer recipe from an Effect that constructs a Command handler.
 * The runtime builds the application Layer once before init. An Effect
 * constructor can capture shared services and return the handler; its body
 * receives arguments and performs work on each Command execution.
 * Provide test services before building the Layer to run the same handler logic.
 * Services captured by the constructor retain their identity. Service lookups
 * inside execution use the invocation context over the construction context.
 * Arguments are dispatch data; services enter through Effect requirements.
 */
export interface ToLayer<Name extends string, Args, Message> {
  <ExecuteRequirements, E = never, BuildRequirements = never>(
    build: Effect.Effect<
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
    build: Effect.Effect<
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
        const handler = yield* build
        return { identity, context, execute: handler }
      }),
    )

  return { execute, toLayer }
}
