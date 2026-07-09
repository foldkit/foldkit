import { Array, Effect, Function, Predicate, Schema } from 'effect'

/** Type-level brand for CommandDefinition values. */
/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
export const CommandDefinitionTypeId: unique symbol = Symbol.for(
  'foldkit/CommandDefinition',
) as unknown as CommandDefinitionTypeId

/** Type-level brand for CommandDefinition values. */
export type CommandDefinitionTypeId = typeof CommandDefinitionTypeId

/** A named Effect that produces a message, optionally carrying the args used to construct it. */
export type Command<T, E = never, R = never> = [T] extends [Schema.Top]
  ? Readonly<{
      name: string
      args?: Record<string, unknown>
      effect: Effect.Effect<Schema.Schema.Type<T>, E, R>
    }>
  : Readonly<{
      name: string
      args?: Record<string, unknown>
      effect: Effect.Effect<T, E, R>
    }>

/** @internal A single link in a Command's message-mapping chain. Each mapper
 *  lifts the previous result Message into the next Message space. Typed
 *  `(message: unknown) => unknown` because the chain is existential: only its
 *  end type, the Command's declared Message, is visible on {@link Command}. */
type MessageMapper = (message: unknown) => unknown

/** @internal The runtime shape a constructed Command actually carries: the
 *  public `name`/`args`/`effect` plus a message-mapping chain recording the
 *  `mapMessage`/`mapMessages` lifts applied to it. `mapMessage` fuses each lift
 *  into the `effect` (so production dispatch is unchanged) and also appends it
 *  here, purely as recoverable metadata: the Story/Scene test layer replays the
 *  chain over a substitute result so a root test never restates the wrapping.
 *  The runtime never reads it. Kept off the public {@link Command} type, and
 *  optional because Commands built by hand (not via {@link define}) carry no
 *  chain; readers treat its absence as an empty chain. */
type CommandWithMappers = Readonly<{
  name: string
  args?: Record<string, unknown>
  effect: Effect.Effect<unknown, unknown, unknown>
  messageMappers?: ReadonlyArray<MessageMapper>
}>

/** A Command definition for a Command with no declared args. Call as `Definition()` to produce a Command instance. */
export interface CommandDefinitionNoArgs<
  Name extends string,
  Eff extends Effect.Effect<any, any, any>,
> {
  readonly [CommandDefinitionTypeId]: CommandDefinitionTypeId
  readonly name: Name;
  (): Readonly<{ name: Name; effect: Eff }>
}

/** A Command definition for a Command with declared args. Call as `Definition(args)` to produce a Command instance. */
export interface CommandDefinitionWithArgs<
  Name extends string,
  Fields extends Schema.Struct.Fields,
  Eff extends Effect.Effect<any, any, any>,
> {
  readonly [CommandDefinitionTypeId]: CommandDefinitionTypeId
  readonly name: Name;
  (args: Schema.Schema.Type<Schema.Struct<Fields>>): Readonly<{
    name: Name
    args: Schema.Schema.Type<Schema.Struct<Fields>>
    effect: Eff
  }>
}

/** A Command definition created with `Command.define`. Union over the no-args and with-args shapes; consumers that only need name/identity can accept this. */
export type CommandDefinition<
  Name extends string = string,
  ResultMessage = any,
> =
  | CommandDefinitionNoArgs<Name, Effect.Effect<ResultMessage, any, any>>
  | CommandDefinitionWithArgs<Name, any, Effect.Effect<ResultMessage, any, any>>

/**
 * Defines a Command. Two forms, distinguished by whether the second argument
 * is a Schema (a result message) or a record of Schemas (the args declaration).
 *
 * The Effect (or effect builder) is bound at definition time. The returned
 * Definition is callable: with no args for a Command that doesn't declare any,
 * or with the declared args record otherwise.
 *
 * @example No args
 * ```ts
 * const LockScroll = Command.define('LockScroll', CompletedLockScroll)(
 *   Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())),
 * )
 * // Call site:
 * LockScroll()
 * ```
 *
 * @example With args
 * ```ts
 * const FetchWeather = Command.define(
 *   'FetchWeather',
 *   { zipCode: S.String },
 *   SucceededFetchWeather,
 *   FailedFetchWeather,
 * )(({ zipCode }) =>
 *   Effect.gen(function* () { ... }),
 * )
 * // Call site:
 * FetchWeather({ zipCode: '90210' })
 * ```
 */
export function define<
  const Name extends string,
  Results extends ReadonlyArray<Schema.Top>,
>(
  name: Name,
  ...results: Results
): <Eff extends Effect.Effect<Schema.Schema.Type<Results[number]>, any, any>>(
  effect: Eff,
) => CommandDefinitionNoArgs<Name, Eff>

export function define<
  const Name extends string,
  Fields extends Schema.Struct.Fields,
  Results extends ReadonlyArray<Schema.Top>,
>(
  name: Name,
  args: Fields,
  ...results: Results
): <Eff extends Effect.Effect<Schema.Schema.Type<Results[number]>, any, any>>(
  effectBuilder: (args: Schema.Schema.Type<Schema.Struct<Fields>>) => Eff,
) => CommandDefinitionWithArgs<Name, Fields, Eff>

export function define(name: string, ...rest: ReadonlyArray<unknown>): unknown {
  const [maybeArgs] = rest

  const isArgsRecord =
    Predicate.isObject(maybeArgs) && !Schema.isSchema(maybeArgs)

  if (isArgsRecord) {
    return (
      effectBuilder: (args: any) => Effect.Effect<any, any, any>,
    ): CommandDefinitionWithArgs<string, any, Effect.Effect<any, any, any>> => {
      const definition = (args: any) => ({
        name,
        args,
        effect: effectBuilder(args),
        messageMappers: [],
      })
      Object.defineProperty(definition, 'name', {
        value: name,
        configurable: true,
      })
      Object.defineProperty(definition, CommandDefinitionTypeId, {
        value: CommandDefinitionTypeId,
      })
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      return definition as unknown as CommandDefinitionWithArgs<
        string,
        any,
        Effect.Effect<any, any, any>
      >
    }
  }

  return (
    effect: Effect.Effect<any, any, any>,
  ): CommandDefinitionNoArgs<string, Effect.Effect<any, any, any>> => {
    const definition = () => ({ name, effect, messageMappers: [] })
    Object.defineProperty(definition, 'name', {
      value: name,
      configurable: true,
    })
    Object.defineProperty(definition, CommandDefinitionTypeId, {
      value: CommandDefinitionTypeId,
    })
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return definition as unknown as CommandDefinitionNoArgs<
      string,
      Effect.Effect<any, any, any>
    >
  }
}

/** Transforms the Effect inside a Command while preserving its name, args, and
 *  message-mapping chain. Reach for this to adjust the Effect itself (provide a
 *  service, add a delay or retry), not to lift the result Message. Never use it
 *  to transform the result Message, even via
 *  `Effect.map(childMessage => Parent({ childMessage }))`. That dispatches
 *  correctly in production but is invisible to `Story`/`Scene` `resolve`, which
 *  replays only the recorded chain and never runs the Effect, so the test would
 *  see the child's raw Message instead of the wrapped one. Lift result Messages
 *  with {@link mapMessage} / {@link mapMessages}, which record the lift. */
export const mapEffect: {
  <A, E1, R1, B, E2, R2>(
    f: (effect: Effect.Effect<A, E1, R1>) => Effect.Effect<B, E2, R2>,
  ): (
    command: Readonly<{
      name: string
      args?: Record<string, unknown>
      effect: Effect.Effect<A, E1, R1>
    }>,
  ) => Readonly<{
    name: string
    args?: Record<string, unknown>
    effect: Effect.Effect<B, E2, R2>
  }>
  <A, E1, R1, B, E2, R2>(
    command: Readonly<{
      name: string
      args?: Record<string, unknown>
      effect: Effect.Effect<A, E1, R1>
    }>,
    f: (effect: Effect.Effect<A, E1, R1>) => Effect.Effect<B, E2, R2>,
  ): Readonly<{
    name: string
    args?: Record<string, unknown>
    effect: Effect.Effect<B, E2, R2>
  }>
} = Function.dual(
  2,
  <A, E1, R1, B, E2, R2>(
    command: Readonly<{
      name: string
      args?: Record<string, unknown>
      effect: Effect.Effect<A, E1, R1>
    }>,
    f: (effect: Effect.Effect<A, E1, R1>) => Effect.Effect<B, E2, R2>,
  ): Readonly<{
    name: string
    args?: Record<string, unknown>
    effect: Effect.Effect<B, E2, R2>
  }> => ({ ...command, effect: f(command.effect) }),
)

/** Lifts a single Command's result Message through `f`, transforming
 *  `FromMessage` to `ToMessage`. The singular complement to
 *  {@link mapMessages}: reach for this when a child returns one Command
 *  (e.g. an animation leave Command), reach for `mapMessages` when it
 *  returns a list.
 *
 *  Fuses `f` into the Effect so production dispatch is unchanged, and also
 *  records `f` on the Command's internal message-mapping chain. The chain is
 *  recoverable metadata the runtime never reads: `Story.Command.resolve` and
 *  `Scene.Command.resolve` replay the matched Command's chain over a substitute
 *  result, so a root test resolves with the child's raw result Message and
 *  never restates the wrapping by hand.
 *
 *  Preserves the Command's `name` and `args` so traces still attribute
 *  it to the originating Submodel. When you need to transform the
 *  Effect itself (not just the result Message), reach for
 *  {@link mapEffect} instead. */
export const mapMessage: {
  <FromMessage, ToMessage, E = never, R = never>(
    command: Readonly<{
      name: string
      args?: Record<string, unknown>
      effect: Effect.Effect<FromMessage, E, R>
    }>,
    f: (message: FromMessage) => ToMessage,
  ): Readonly<{
    name: string
    args?: Record<string, unknown>
    effect: Effect.Effect<ToMessage, E, R>
  }>
  <FromMessage, ToMessage>(
    f: (message: FromMessage) => ToMessage,
  ): <E = never, R = never>(
    command: Readonly<{
      name: string
      args?: Record<string, unknown>
      effect: Effect.Effect<FromMessage, E, R>
    }>,
  ) => Readonly<{
    name: string
    args?: Record<string, unknown>
    effect: Effect.Effect<ToMessage, E, R>
  }>
} = Function.dual(
  2,
  <FromMessage, ToMessage, E = never, R = never>(
    command: Readonly<{
      name: string
      args?: Record<string, unknown>
      effect: Effect.Effect<FromMessage, E, R>
    }>,
    f: (message: FromMessage) => ToMessage,
  ): Readonly<{
    name: string
    args?: Record<string, unknown>
    effect: Effect.Effect<ToMessage, E, R>
  }> => {
    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    const withMappers = command as unknown as CommandWithMappers
    return {
      ...withMappers,
      effect: Effect.map(command.effect, f),
      messageMappers: [...(withMappers.messageMappers ?? []), f],
    } as unknown as Readonly<{
      name: string
      args?: Record<string, unknown>
      effect: Effect.Effect<ToMessage, E, R>
    }>
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
  },
)

/** Lifts every Command in a list through `f`, transforming the result
 *  Message type from `FromMessage` to `ToMessage`. Reach for this at the
 *  boundary where a child Submodel's `update` returns Commands typed in
 *  the child's Message and the parent needs them typed in the parent's
 *  Message:
 *
 *  ```ts
 *  GotChildMessage: ({ message }) => {
 *    const [nextChild, commands, maybeOutMessage] = Child.update(model.child, message)
 *    const mappedCommands = Command.mapMessages(
 *      commands,
 *      message => GotChildMessage({ message }),
 *    )
 *    // ...
 *  }
 *  ```
 *
 *  Fuses `f` into each Command's Effect and also records it on the Command's
 *  internal message-mapping chain, so production dispatch is unchanged while
 *  `Story.Command.resolve` / `Scene.Command.resolve` can recover the mapping
 *  from the matched Command.
 *  Preserves each Command's `name` and `args` so traces still attribute the
 *  Command to the originating Submodel. When you need to transform the Effect
 *  itself (not just the result Message), reach for {@link mapEffect} instead. */
export const mapMessages: {
  <FromMessage, ToMessage, E = never, R = never>(
    commands: ReadonlyArray<
      Readonly<{
        name: string
        args?: Record<string, unknown>
        effect: Effect.Effect<FromMessage, E, R>
      }>
    >,
    f: (message: FromMessage) => ToMessage,
  ): ReadonlyArray<
    Readonly<{
      name: string
      args?: Record<string, unknown>
      effect: Effect.Effect<ToMessage, E, R>
    }>
  >
  <FromMessage, ToMessage>(
    f: (message: FromMessage) => ToMessage,
  ): <E = never, R = never>(
    commands: ReadonlyArray<
      Readonly<{
        name: string
        args?: Record<string, unknown>
        effect: Effect.Effect<FromMessage, E, R>
      }>
    >,
  ) => ReadonlyArray<
    Readonly<{
      name: string
      args?: Record<string, unknown>
      effect: Effect.Effect<ToMessage, E, R>
    }>
  >
} = Function.dual(
  2,
  <FromMessage, ToMessage, E = never, R = never>(
    commands: ReadonlyArray<
      Readonly<{
        name: string
        args?: Record<string, unknown>
        effect: Effect.Effect<FromMessage, E, R>
      }>
    >,
    f: (message: FromMessage) => ToMessage,
  ): ReadonlyArray<
    Readonly<{
      name: string
      args?: Record<string, unknown>
      effect: Effect.Effect<ToMessage, E, R>
    }>
  > => Array.map(commands, command => mapMessage(command, f)),
)
