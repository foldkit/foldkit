import {
  Array,
  Context,
  Effect,
  Fiber,
  Option,
  Predicate,
  Schema,
} from 'effect'

import { ts } from '../../schema/index.js'
import { CommandDefinitionTypeId } from '../index.js'

/** At least one in-flight Command held the interrupt key, and every holder
 *  has been stopped. Their declared result Messages are guaranteed never to
 *  dispatch. */
export const Interrupted = ts('Interrupted')

/** At least one in-flight Command held the interrupt key, and every holder
 *  has been stopped. Their declared result Messages are guaranteed never to
 *  dispatch. */
export type Interrupted = typeof Interrupted.Type

/** No Command holds the interrupt key: every target already completed (its
 *  result Message dispatched or will dispatch) or was never dispatched. The
 *  two cases are indistinguishable by design. */
export const NotFound = ts('NotFound')

/** No Command holds the interrupt key: every target already completed (its
 *  result Message dispatched or will dispatch) or was never dispatched. The
 *  two cases are indistinguishable by design. */
export type NotFound = typeof NotFound.Type

/** The result of an Interrupt Command: {@link Interrupted} when at least one
 *  holder was stopped, {@link NotFound} when nothing held the key.
 *  Interruption itself cannot fail. */
export const Outcome = Schema.Union([Interrupted, NotFound])

/** The result of an Interrupt Command: {@link Interrupted} when at least one
 *  holder was stopped, {@link NotFound} when nothing held the key.
 *  Interruption itself cannot fail. */
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
        onEmpty: () => Effect.succeed<Outcome>(NotFound()),
        onNonEmpty: fibers =>
          Effect.map(Fiber.interruptAll(fibers), (): Outcome => Interrupted()),
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
const registerKeyWhileRunning = <A, E, R>(
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
  readonly name: `${Name}.Interrupt`;
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
  readonly name: `${Name}.Interrupt`;
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
  readonly Interrupt: InterruptDefinitionNoArgs<Name>;
  (): Readonly<{ name: Name; key: string; effect: Eff }>
}

/** An interruptible Command definition with declared args and a key derived
 *  from them, namespaced by the Command name. Call as `Definition(args)` to
 *  produce a Command instance; use `Definition.Interrupt` to build the
 *  Command that stops every holder of a specific key. */
export interface DefinitionWithArgs<
  Name extends string,
  Fields extends Schema.Struct.Fields,
  KeyArgs extends Partial<Schema.Schema.Type<Schema.Struct<Fields>>>,
  Eff extends Effect.Effect<any, any, any>,
> {
  readonly [CommandDefinitionTypeId]: CommandDefinitionTypeId
  readonly name: Name
  readonly Interrupt: InterruptDefinitionWithArgs<Name, KeyArgs>;
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
  readonly Interrupt: InterruptDefinitionNoArgs<Name>;
  (args: Schema.Schema.Type<Schema.Struct<Fields>>): Readonly<{
    name: Name
    args: Schema.Schema.Type<Schema.Struct<Fields>>
    key: string
    effect: Eff
  }>
}

const brandAsDefinition = (definition: unknown, name: string): void => {
  Object.defineProperty(definition, 'name', {
    value: name,
    configurable: true,
  })
  Object.defineProperty(definition, CommandDefinitionTypeId, {
    value: CommandDefinitionTypeId,
  })
}

const makeInterruptDefinitionNoArgs = (name: string, key: string): unknown => {
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

const makeInterruptDefinitionWithArgs = (
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

/**
 * Defines an interruptible Command. Like `Command.define`, but every
 * invocation registers under a key in the runtime's interrupt registry for
 * the duration of its Effect, and the returned Definition carries an
 * `Interrupt` constructor that builds the Command to stop it.
 *
 * Keys are namespaced by the Command name automatically. With no declared
 * args the key is the Command name itself. With declared args, `toKey` maps
 * them to the part that distinguishes invocations, and the full key becomes
 * `` `${name}:${toKey(args)}` ``, so keys never collide across definitions
 * and call sites never restate the name. Derive the key part from the Model
 * identity that owns the in-flight work (a list item id, an entity id), never
 * from a generated value: the update function is pure, and any invocation you
 * can meaningfully target is already distinguished by data in the Model.
 *
 * `toKey` is optional on the with-args form. Omit it when at most one
 * invocation is meaningfully in flight (a single-instance submit flow), and the
 * key is the Command name, exactly like the no-args form, with `Interrupt`
 * taking only `toMessage`. Provide it, deriving the key from the owning Model
 * identity, when invocations run concurrently and must be interrupted
 * independently.
 *
 * Semantics:
 *
 * - A key is an address, not a lock. Any number of invocations may run under
 *   one key concurrently, and dispatching never interrupts anything.
 *   Interruption only happens when update returns an Interrupt Command.
 * - `Definition.Interrupt` produces a Command whose Effect interrupts every
 *   current holder of the key and results in `toMessage(outcome)`. The
 *   outcome is `Interrupted` when at least one holder was stopped (the
 *   stopped holders' result Messages are guaranteed never to dispatch) or
 *   `NotFound` when nothing held the key. Name the result Message
 *   `CompletedCancel<CommandName>`.
 * - To dispatch a replacement after cancelling, sequence through the
 *   Interrupt's result Message: return the new Command from the
 *   `CompletedCancel<CommandName>` handler. Commands in one batch run
 *   concurrently with no execution-order guarantee, so `[Interrupt, Next]`
 *   in a single list is a race, not a sequence.
 *
 * For work that should stop when the Model says so, reach for a Subscription
 * or ManagedResource instead; interruption is for one-shot async work that is
 * structurally a Command (for example an in-flight HTTP request, a file read,
 * or an upload).
 *
 * @example No args
 * ```ts
 * const SyncLibrary = Command.Interruptible.define(
 *   'SyncLibrary',
 *   SucceededSyncLibrary,
 *   FailedSyncLibrary,
 * )(Effect.gen(function* () { ... }))
 * // Call sites:
 * SyncLibrary()
 * SyncLibrary.Interrupt(outcome => CompletedCancelSyncLibrary({ outcome }))
 * ```
 *
 * @example With args, key derived from them
 * ```ts
 * const UploadFile = Command.Interruptible.define(
 *   'UploadFile',
 *   { uploadId: S.Number, file: S.instanceOf(File) },
 *   ({ uploadId }: { uploadId: number }) => String(uploadId),
 *   SucceededUploadFile,
 *   FailedUploadFile,
 * )(({ uploadId, file }) =>
 *   Effect.gen(function* () { ... }),
 * )
 * // Call sites:
 * UploadFile({ uploadId: 1, file })
 * UploadFile.Interrupt({ uploadId: 1 }, outcome =>
 *   CompletedCancelUploadFile({ uploadId: 1, outcome }),
 * )
 * ```
 *
 * @example With args, keyed by name (one invocation in flight)
 * ```ts
 * const SaveDraft = Command.Interruptible.define(
 *   'SaveDraft',
 *   { draftId: S.String, body: S.String },
 *   SucceededSaveDraft,
 *   FailedSaveDraft,
 * )(({ draftId, body }) =>
 *   Effect.gen(function* () { ... }),
 * )
 * // Call sites:
 * SaveDraft({ draftId: 'abc', body })
 * SaveDraft.Interrupt(outcome => CompletedCancelSaveDraft({ outcome }))
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
) => DefinitionNoArgs<Name, Eff>

export function define<
  const Name extends string,
  Fields extends Schema.Struct.Fields,
  KeyArgs extends Partial<Schema.Schema.Type<Schema.Struct<Fields>>>,
  Results extends ReadonlyArray<Schema.Top>,
>(
  name: Name,
  args: Fields,
  toKey: (keyArgs: KeyArgs) => string,
  ...results: Results
): <Eff extends Effect.Effect<Schema.Schema.Type<Results[number]>, any, any>>(
  effectBuilder: (args: Schema.Schema.Type<Schema.Struct<Fields>>) => Eff,
) => DefinitionWithArgs<Name, Fields, KeyArgs, Eff>

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
) => DefinitionWithArgsNameKeyed<Name, Fields, Eff>

export function define(name: string, ...rest: ReadonlyArray<unknown>): unknown {
  const [maybeArgs, maybeToKey] = rest

  const isArgsRecord =
    Predicate.isObject(maybeArgs) && !Schema.isSchema(maybeArgs)

  if (!isArgsRecord) {
    const key = name
    return (effect: Effect.Effect<any, any, any>) => {
      const definition = () => ({
        name,
        key,
        effect: registerKeyWhileRunning(key, effect),
        messageMappers: [],
      })
      brandAsDefinition(definition, name)
      Object.defineProperty(definition, 'Interrupt', {
        value: makeInterruptDefinitionNoArgs(name, key),
      })
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      return definition as unknown as DefinitionNoArgs<
        string,
        Effect.Effect<any, any, any>
      >
    }
  }

  const isToKeyFunction =
    Predicate.isFunction(maybeToKey) && !Schema.isSchema(maybeToKey)

  if (!isToKeyFunction) {
    const key = name
    return (effectBuilder: (args: any) => Effect.Effect<any, any, any>) => {
      const definition = (args: any) => ({
        name,
        args,
        key,
        effect: registerKeyWhileRunning(key, effectBuilder(args)),
        messageMappers: [],
      })
      brandAsDefinition(definition, name)
      Object.defineProperty(definition, 'Interrupt', {
        value: makeInterruptDefinitionNoArgs(name, key),
      })
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      return definition as unknown as DefinitionWithArgsNameKeyed<
        string,
        any,
        Effect.Effect<any, any, any>
      >
    }
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const toKey = maybeToKey as (keyArgs: any) => string
  const toFullKey = (keyArgs: any): string => `${name}:${toKey(keyArgs)}`
  return (effectBuilder: (args: any) => Effect.Effect<any, any, any>) => {
    const definition = (args: any) => {
      const key = toFullKey(args)
      return {
        name,
        args,
        key,
        effect: registerKeyWhileRunning(key, effectBuilder(args)),
        messageMappers: [],
      }
    }
    brandAsDefinition(definition, name)
    Object.defineProperty(definition, 'Interrupt', {
      value: makeInterruptDefinitionWithArgs(name, toFullKey),
    })
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return definition as unknown as DefinitionWithArgs<
      string,
      any,
      any,
      Effect.Effect<any, any, any>
    >
  }
}
