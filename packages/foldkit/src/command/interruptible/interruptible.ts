import { Array, Context, Effect, Fiber, Option, Schema } from 'effect'

import { defineTaggedUnion } from '../../schema/index.js'
import { CommandDefinitionTypeId, brandAsDefinition } from '../brand.js'

/** The result of interrupting a key. `Outcome.Interrupted` means at least one
 * in-flight Command was stopped and will not dispatch its result Message.
 * `Outcome.NotFound` means no Command held the key. The interrupt operation
 * itself cannot fail. */
export const Outcome = defineTaggedUnion({
  Interrupted: {},
  NotFound: {},
})

/** The result of interrupting a key. `Outcome.Interrupted` means at least one
 * in-flight Command was stopped and will not dispatch its result Message.
 * `Outcome.NotFound` means no Command held the key. The interrupt operation
 * itself cannot fail. */
export type Outcome = typeof Outcome.Type

/** @internal The per-runtime-instance map from interrupt key to the fibers
 *  of the interruptible Commands currently holding it. A key is an address,
 *  not a lock: any number of invocations may hold one key concurrently, and
 *  dispatching under a held key never interrupts anything. Commands register
 *  under their key for the duration of their Effect; Interrupt Commands look
 *  the key up and interrupt every holder. Internal to the runtime. */
export type __Registry = Readonly<{
  lookup: (key: string) => ReadonlyArray<Fiber.Fiber<unknown, unknown>>
  register: (key: string, fiber: Fiber.Fiber<unknown, unknown>) => void
  release: (key: string, fiber: Fiber.Fiber<unknown, unknown>) => void
  interrupt: (key: string) => Effect.Effect<Outcome>
}>

/** @internal Creates an interrupt registry. The runtime creates one per
 *  instance and provides it through {@link __CurrentRegistry}. Internal to
 *  the runtime. */
export const __makeRegistry = (): __Registry => {
  const holders = new Map<string, Set<Fiber.Fiber<unknown, unknown>>>()

  const lookup = (key: string): ReadonlyArray<Fiber.Fiber<unknown, unknown>> =>
    Option.match(Option.fromNullishOr(holders.get(key)), {
      onNone: () => [],
      onSome: fibers => Array.fromIterable(fibers),
    })

  const register = (
    key: string,
    fiber: Fiber.Fiber<unknown, unknown>,
  ): void => {
    Option.match(Option.fromNullishOr(holders.get(key)), {
      onNone: () => {
        holders.set(key, new Set([fiber]))
      },
      onSome: fibers => {
        fibers.add(fiber)
      },
    })
  }

  const release = (key: string, fiber: Fiber.Fiber<unknown, unknown>): void => {
    const maybeFibers = Option.fromNullishOr(holders.get(key))
    if (Option.isSome(maybeFibers)) {
      maybeFibers.value.delete(fiber)
      if (maybeFibers.value.size === 0) {
        holders.delete(key)
      }
    }
  }

  // NOTE: `Effect.suspend` defers the lookup to each run of the returned
  // Effect. Without it the holders would be snapshotted when the Effect
  // value is built, so a stored or retried Interrupt Effect would act on
  // stale fibers instead of whatever holds the key at run time.
  const interrupt = (key: string): Effect.Effect<Outcome> =>
    Effect.suspend(() =>
      Array.match(lookup(key), {
        onEmpty: () => Effect.succeed<Outcome>(Outcome.NotFound()),
        onNonEmpty: fibers =>
          Effect.map(Fiber.interruptAll(fibers), (): Outcome =>
            Outcome.Interrupted(),
          ),
      }),
    )

  return { lookup, register, release, interrupt }
}

/** Reference through which the runtime provides the current instance's
 *  interrupt registry to Command Effects. A Reference has a default value, so
 *  reading it never adds a service requirement; the default is a shared
 *  registry for Effects run outside a runtime (unit tests). Internal to the
 *  runtime. */
export const __CurrentRegistry = Context.Reference<__Registry>(
  'foldkit/Command/Interruptible/CurrentRegistry',
  { defaultValue: __makeRegistry },
)

// NOTE: registration and its cleanup must attach as one atomic step, the
// same guarantee `Effect.acquireRelease` gives, built by hand here. The
// whole region is uninterruptible except the Command's own Effect, which
// `restore` makes interruptible again. If an interrupt could land after
// `register` but before `ensuring` attached, the fiber would die without
// ever removing itself from the registry, and every later Interrupt would
// report `Interrupted` against that dead entry forever.
export const __registerKeyWhileRunning = <A, E, R>(
  key: string,
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> =>
  Effect.withFiber(fiber =>
    Effect.gen(function* () {
      const registry = yield* __CurrentRegistry
      return yield* Effect.uninterruptibleMask(restore =>
        Effect.suspend(() => {
          registry.register(key, fiber)
          return restore(effect).pipe(
            Effect.ensuring(Effect.sync(() => registry.release(key, fiber))),
          )
        }),
      )
    }),
  )

const makeInterruptEffect = <ToMessage>(
  key: string,
  toMessage: (outcome: Outcome) => ToMessage,
): Effect.Effect<ToMessage> =>
  Effect.gen(function* () {
    const registry = yield* __CurrentRegistry
    const outcome = yield* registry.interrupt(key)
    return toMessage(outcome)
  })

/** An Interrupt Command definition derived from an interruptible Command
 *  definition with no declared args. Call as `Definition.Interrupt(toMessage)`
 *  to produce a Command that interrupts every holder of the definition's key. */
export interface InterruptDefinitionNoArgs<Name extends string> {
  readonly [CommandDefinitionTypeId]: CommandDefinitionTypeId
  readonly name: `${Name}.Interrupt`
  <ToMessage>(toMessage: (outcome: Outcome) => ToMessage): Readonly<{
    name: `${Name}.Interrupt`
    interruptsKey: string
    effect: Effect.Effect<ToMessage>
  }>
}

/** An Interrupt Command definition derived from an interruptible Command
 *  definition with declared args. Call as
 *  `Definition.Interrupt(keyArgs, toMessage)` to produce a Command that
 *  interrupts every holder of the key derived from `keyArgs`. */
export interface InterruptDefinitionWithArgs<Name extends string, KeyArgs> {
  readonly [CommandDefinitionTypeId]: CommandDefinitionTypeId
  readonly name: `${Name}.Interrupt`
  <ToMessage>(
    keyArgs: KeyArgs,
    toMessage: (outcome: Outcome) => ToMessage,
  ): Readonly<{
    name: `${Name}.Interrupt`
    args: KeyArgs
    interruptsKey: string
    effect: Effect.Effect<ToMessage>
  }>
}

/** An interruptible Command definition with no declared args; its key is the
 *  Command name. Call as `Definition()` to produce a Command instance; use
 *  `Definition.Interrupt` to build the Command that stops it. */
export interface DefinitionNoArgs<
  Name extends string,
  Eff extends Effect.Effect<any, any, any>,
> {
  readonly [CommandDefinitionTypeId]: CommandDefinitionTypeId
  readonly name: Name
  readonly Interrupt: InterruptDefinitionNoArgs<Name>
  (): Readonly<{ name: Name; key: string; effect: Eff }>
}

/** An interruptible Command definition with declared args and a key derived
 *  from them, namespaced by the Command name. Call as `Definition(args)` to
 *  produce a Command instance; use `Definition.Interrupt` to build the
 *  Command that stops every holder of a specific key. */
export interface DefinitionWithArgs<
  Name extends string,
  Fields extends Schema.Struct.Fields,
  KeyArgs extends object,
  Eff extends Effect.Effect<any, any, any>,
> {
  readonly [CommandDefinitionTypeId]: CommandDefinitionTypeId
  readonly name: Name
  readonly Interrupt: InterruptDefinitionWithArgs<Name, KeyArgs>
  (args: Schema.Schema.Type<Schema.Struct<Fields>>): Readonly<{
    name: Name
    args: Schema.Schema.Type<Schema.Struct<Fields>>
    key: string
    effect: Eff
  }>
}

/** An interruptible Command definition with declared args but no `toKey`, so
 *  its key is the Command name, exactly like the no-args form. Call as
 *  `Definition(args)` to produce a Command instance; use `Definition.Interrupt`
 *  to build the Command that stops it. Reach for this when a Command takes args
 *  yet at most one invocation is meaningfully in flight, so its invocations need
 *  nothing to distinguish them. */
export interface DefinitionWithArgsNameKeyed<
  Name extends string,
  Fields extends Schema.Struct.Fields,
  Eff extends Effect.Effect<any, any, any>,
> {
  readonly [CommandDefinitionTypeId]: CommandDefinitionTypeId
  readonly name: Name
  readonly Interrupt: InterruptDefinitionNoArgs<Name>
  (args: Schema.Schema.Type<Schema.Struct<Fields>>): Readonly<{
    name: Name
    args: Schema.Schema.Type<Schema.Struct<Fields>>
    key: string
    effect: Eff
  }>
}

/** @internal Builds the `Interrupt` constructor for an interruptible definition
 *  whose key is the Command name. Internal to the Command module. */
export const __makeInterruptDefinitionNoArgs = (
  name: string,
  key: string,
): unknown => {
  const interruptName = `${name}.Interrupt`
  const definition = (toMessage: (outcome: Outcome) => unknown) => ({
    name: interruptName,
    interruptsKey: key,
    effect: makeInterruptEffect(key, toMessage),
    messageMappers: [],
  })
  brandAsDefinition(definition, interruptName)
  return definition
}

/** @internal Builds the `Interrupt` constructor for an interruptible definition
 *  whose key is derived from its args. Internal to the Command module. */
export const __makeInterruptDefinitionWithArgs = (
  name: string,
  toFullKey: (keyArgs: any) => string,
): unknown => {
  const interruptName = `${name}.Interrupt`
  const definition = (
    keyArgs: any,
    toMessage: (outcome: Outcome) => unknown,
  ) => {
    const key = toFullKey(keyArgs)
    return {
      name: interruptName,
      args: keyArgs,
      interruptsKey: key,
      effect: makeInterruptEffect(key, toMessage),
      messageMappers: [],
    }
  }
  brandAsDefinition(definition, interruptName)
  return definition
}
