import { Effect, Schema } from 'effect'

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
    maybeArgs !== undefined &&
    typeof maybeArgs === 'object' &&
    maybeArgs !== null &&
    !Schema.isSchema(maybeArgs)

  if (isArgsRecord) {
    return (
      effectBuilder: (args: any) => Effect.Effect<any, any, any>,
    ): CommandDefinitionWithArgs<string, any, Effect.Effect<any, any, any>> => {
      const definition = (args: any) => ({
        name,
        args,
        effect: effectBuilder(args),
      })
      Object.defineProperty(definition, 'name', {
        value: name,
        configurable: true,
      })
      Object.defineProperty(definition, CommandDefinitionTypeId, {
        value: CommandDefinitionTypeId,
      })
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      return definition as CommandDefinitionWithArgs<
        string,
        any,
        Effect.Effect<any, any, any>
      >
    }
  }

  return (
    effect: Effect.Effect<any, any, any>,
  ): CommandDefinitionNoArgs<string, Effect.Effect<any, any, any>> => {
    const definition = () => ({ name, effect })
    Object.defineProperty(definition, 'name', {
      value: name,
      configurable: true,
    })
    Object.defineProperty(definition, CommandDefinitionTypeId, {
      value: CommandDefinitionTypeId,
    })
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return definition as CommandDefinitionNoArgs<
      string,
      Effect.Effect<any, any, any>
    >
  }
}

/** Transforms the Effect inside a Command while preserving its name and args. */
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
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
} = ((...args: ReadonlyArray<any>) =>
  args.length === 1
    ? (command: any) => ({
        ...command,
        effect: args[0](command.effect),
      })
    : { ...args[0], effect: args[1](args[0].effect) }) as any
