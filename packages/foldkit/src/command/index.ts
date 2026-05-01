import { Effect, Schema } from 'effect'

/** Type-level brand for CommandDefinition values. */
/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
export const CommandDefinitionTypeId: unique symbol = Symbol.for(
  'foldkit/CommandDefinition',
) as unknown as CommandDefinitionTypeId

/** Type-level brand for CommandDefinition values. */
export type CommandDefinitionTypeId = typeof CommandDefinitionTypeId

/** A named Effect that produces a message. */
export type Command<T, E = never, R = never> = [T] extends [Schema.Top]
  ? Readonly<{
      name: string
      effect: Effect.Effect<Schema.Schema.Type<T>, E, R>
    }>
  : Readonly<{
      name: string
      effect: Effect.Effect<T, E, R>
    }>

/** A Command identity created with `Command.define`. Call with an Effect to create a Command. */
export interface CommandDefinition<Name extends string, ResultMessage = any> {
  readonly [CommandDefinitionTypeId]: CommandDefinitionTypeId
  readonly name: Name;
  <CommandEffect extends Effect.Effect<ResultMessage, any, any>>(
    effect: CommandEffect,
  ): Readonly<{ name: Name; effect: CommandEffect }>
}

/** Defines a named Command identity with the Messages it returns. */
export const define: {
  <const Name extends string, Results extends ReadonlyArray<Schema.Top>>(
    name: Name,
    ...results: Results
  ): CommandDefinition<Name, Schema.Schema.Type<Results[number]>>
} = <const Name extends string>(
  name: Name,
  ..._results: ReadonlyArray<Schema.Top>
): CommandDefinition<Name, any> => {
  const create = (
    effect: Effect.Effect<any, any, any>,
  ): Readonly<{ name: Name; effect: Effect.Effect<any, any, any> }> => ({
    name,
    effect,
  })

  Object.defineProperty(create, 'name', { value: name, configurable: true })
  Object.defineProperty(create, CommandDefinitionTypeId, {
    value: CommandDefinitionTypeId,
  })

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return create as CommandDefinition<Name, any>
}

/** Transforms the Effect inside a Command while preserving its name. */
export const mapEffect: {
  <A, E, R, B>(
    f: (effect: Effect.Effect<A, E, R>) => Effect.Effect<B, E, R>,
  ): (
    command: Readonly<{ name: string; effect: Effect.Effect<A, E, R> }>,
  ) => Readonly<{ name: string; effect: Effect.Effect<B, E, R> }>
  <A, E1, R1, B, E2, R2>(
    command: Readonly<{ name: string; effect: Effect.Effect<A, E1, R1> }>,
    f: (effect: Effect.Effect<A, E1, R1>) => Effect.Effect<B, E2, R2>,
  ): Readonly<{ name: string; effect: Effect.Effect<B, E2, R2> }>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
} = ((...args: ReadonlyArray<any>) =>
  args.length === 1
    ? (command: any) => ({
        name: command.name,
        effect: args[0](command.effect),
      })
    : { name: args[0].name, effect: args[1](args[0].effect) }) as any
