import { Effect, Schema } from 'effect'

/** A named Effect that produces a message. */
export type Command<T, E = never, R = never> = [T] extends [Schema.Schema.Any]
  ? Readonly<{
      name: string
      effect: Effect.Effect<Schema.Schema.Type<T>, E, R>
    }>
  : Readonly<{
      name: string
      effect: Effect.Effect<T, E, R>
    }>

/** Creates a named Command from an Effect. */
export const make: {
  (
    name: string,
  ): <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ) => Readonly<{ name: string; effect: Effect.Effect<A, E, R> }>
  <A, E = never, R = never>(
    name: string,
    effect: Effect.Effect<A, E, R>,
  ): Readonly<{ name: string; effect: Effect.Effect<A, E, R> }>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
} = ((...args: ReadonlyArray<any>) =>
  args.length === 1
    ? (effect: any) => ({ name: args[0], effect })
    : { name: args[0], effect: args[1] }) as any

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
