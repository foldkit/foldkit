import { Array, Effect, Function, Option, Predicate, Schema } from 'effect'

import { CommandDefinitionTypeId, brandAsDefinition } from './brand.js'
import * as Interruptible from './interruptible/index.js'

export { CommandDefinitionTypeId }

/** A named Effect that produces a message, optionally carrying the args used
 *  to construct it. `key` is present on Commands built by
 *  `define` with `interrupt`: it addresses the invocation in the runtime's
 *  interrupt registry so a later Interrupt Command can stop it. */
export type Command<T, E = never, R = never> = [T] extends [Schema.Top]
  ? Readonly<{
      name: string
      args?: Record<string, unknown>
      key?: string
      effect: Effect.Effect<Schema.Schema.Type<T>, E, R>
    }>
  : Readonly<{
      name: string
      args?: Record<string, unknown>
      key?: string
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
  key?: string
  interruptsKey?: string
  effect: Effect.Effect<unknown, unknown, unknown>
  messageMappers?: ReadonlyArray<MessageMapper>
}>

/** @internal Reads a Command's recorded message-mapping chain, the lifts
 *  `mapMessage`/`mapMessages` applied to it. Returns an empty array for a
 *  Command built by hand (not via {@link define}), which carries no chain.
 *  DevTools folds the chain over a probe leaf to recover the destination
 *  Submodel's wrapper-tag path without running the Command's Effect. Matches
 *  the `as unknown as CommandWithMappers` cast idiom {@link mapMessage} uses. */
export const messageMappersOf = (
  command: Readonly<{ name: string; args?: Record<string, unknown> }>,
): ReadonlyArray<MessageMapper> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  (command as unknown as CommandWithMappers).messageMappers ?? []

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

/** Makes a Command interruptible. `true` keys every invocation by the Command
 *  name, which is what you want when at most one invocation is meaningfully in
 *  flight. `{ keyFields, toKey }` derives the key part from declared args, so
 *  invocations that run concurrently can be interrupted independently.
 *  `keyFields` declares the exact args the Interrupt constructor requires.
 *  Derive the key part from the Model identity that owns the in-flight work (a
 *  list item id, an entity id), never from a generated value: update is pure,
 *  and any invocation you can meaningfully target is already distinguished by
 *  data in the Model. */
export type InterruptOption<
  Args,
  KeyField extends keyof Args & string = keyof Args & string,
> =
  | true
  | Readonly<{
      keyFields: Array.NonEmptyReadonlyArray<KeyField>
      toKey: (keyArgs: Pick<Args, KeyField>) => string
    }>

/** @internal The shape {@link define} reads at runtime. The public overloads
 *  carry the precise types; this is only what the implementation destructures. */
type DefineConfig = Readonly<{
  args?: Schema.Struct.Fields
  messages: ReadonlyArray<Schema.Top>
  interrupt?:
    | true
    | Readonly<{
        keyFields?: ReadonlyArray<string>
        toKey?: (keyArgs: any) => string
      }>
  execute: any
}>

// NOTE: The suspend is load bearing, not a redundant wrapper. Without it the
// `execute` body runs the moment update constructs the Command, so any
// expression it evaluates on the way to returning its Effect runs inside a pure
// reducer. Every side effect the body performs runs there, and every exception
// it raises escapes update, even when update discards the Command instead of
// returning it. Reading a missing browser global is one instance, the one that
// surfaced this, not the boundary of it. Suspending defers the body to
// execution, where the runtime can contain any failure it produces.
// A no-args `execute` is already an Effect value and needs no equivalent.
const suspendExecute = (
  config: DefineConfig,
  args: any,
): Effect.Effect<any, any, any> => Effect.suspend(() => config.execute(args))

/**
 * Defines a Command. Every input is a named field: `args` declares the args
 * Schema, `messages` lists the Messages this Command can produce, `execute`
 * holds the Effect, and `interrupt` opts into interruption.
 *
 * `args` is optional. Omit it and `execute` is a bare Effect and the Definition
 * is callable as `Definition()`; declare it and `execute` receives the args and
 * the Definition is callable as `Definition(args)`.
 *
 * Constructing a Command never runs `execute`. When `args` is declared the body
 * is deferred until the runtime executes the Command, so no side effect the
 * body performs and no exception it raises can reach update, and a Command that
 * update builds and then discards runs nothing at all.
 *
 * With `interrupt`, every invocation registers under a key in the runtime's
 * interrupt registry for the duration of its Effect, and the returned Definition
 * carries an `Interrupt` constructor that builds an ordinary Command to stop it.
 * See {@link InterruptOption} for how the key is chosen. Semantics:
 *
 * - A key is an address, not a lock. Any number of invocations may run under one
 *   key concurrently, and dispatching never interrupts anything. Interruption
 *   only happens when update returns an Interrupt Command.
 * - `Definition.Interrupt` interrupts every current holder of the key and
 *   results in `toMessage(outcome)`. The outcome is `Interrupted` when at least
 *   one holder was stopped (their Messages are guaranteed never to dispatch) or
 *   `NotFound` when nothing held the key. Name the Message
 *   `CompletedCancel<CommandName>`.
 * - To dispatch a replacement after cancelling, sequence through the Interrupt's
 *   result Message. Commands in one batch run concurrently with no
 *   execution-order guarantee, so `[Interrupt, Next]` in one list is a race.
 *
 * Interruption is for one-shot async work that is structurally a Command (an
 * in-flight HTTP request, a file read, an upload), fired once and normally left
 * to finish, where stopping it is the exception. Work whose lifetime is derived
 * from the Model belongs in a Subscription or ManagedResource instead: the
 * runtime starts and tears those down as the Model declares them, so there is
 * no in-flight Command to interrupt.
 *
 * @example No args
 * ```ts
 * const LockScroll = Command.define('LockScroll', {
 *   messages: [CompletedLockScroll],
 *   execute: Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())),
 * })
 * // Call site:
 * LockScroll()
 * ```
 *
 * @example With args
 * ```ts
 * const FetchWeather = Command.define('FetchWeather', {
 *   args: { zipCode: S.String },
 *   messages: [SucceededFetchWeather, FailedFetchWeather],
 *   execute: ({ zipCode }) => Effect.gen(function* () { ... }),
 * })
 * // Call site:
 * FetchWeather({ zipCode: '90210' })
 * ```
 *
 * @example Interruptible, keyed by the Command name
 * ```ts
 * const SaveDraft = Command.define('SaveDraft', {
 *   args: { draftId: S.String, body: S.String },
 *   messages: [SucceededSaveDraft, FailedSaveDraft],
 *   interrupt: true,
 *   execute: ({ draftId, body }) => Effect.gen(function* () { ... }),
 * })
 * // Call sites:
 * SaveDraft({ draftId: 'abc', body })
 * SaveDraft.Interrupt(outcome => CompletedCancelSaveDraft({ outcome }))
 * ```
 *
 * @example Interruptible, keyed by args
 * ```ts
 * const UploadFile = Command.define('UploadFile', {
 *   args: { uploadId: S.Number, file: S.instanceOf(File) },
 *   messages: [SucceededUploadFile, FailedUploadFile],
 *   interrupt: {
 *     keyFields: ['uploadId'],
 *     toKey: ({ uploadId }) => String(uploadId),
 *   },
 *   execute: ({ uploadId, file }) => Effect.gen(function* () { ... }),
 * })
 * // Call sites:
 * UploadFile({ uploadId: 1, file })
 * UploadFile.Interrupt({ uploadId: 1 }, outcome =>
 *   CompletedCancelUploadFile({ uploadId: 1, outcome }),
 * )
 * ```
 */
export function define<
  const Name extends string,
  Fields extends Schema.Struct.Fields,
  const Messages extends ReadonlyArray<Schema.Top>,
  const KeyField extends keyof Schema.Schema.Type<Schema.Struct<Fields>> &
    string,
  Eff extends Effect.Effect<Schema.Schema.Type<Messages[number]>, any, any>,
>(
  name: Name,
  config: Readonly<{
    args: Fields
    messages: Messages
    interrupt: Readonly<{
      keyFields: Array.NonEmptyReadonlyArray<KeyField>
      toKey: (
        keyArgs: Pick<Schema.Schema.Type<Schema.Struct<Fields>>, KeyField>,
      ) => string
    }>
    execute: (args: Schema.Schema.Type<Schema.Struct<Fields>>) => Eff
  }>,
): Interruptible.DefinitionWithArgs<
  Name,
  Fields,
  Pick<Schema.Schema.Type<Schema.Struct<Fields>>, KeyField>,
  Eff
>

export function define<
  const Name extends string,
  Fields extends Schema.Struct.Fields,
  const Messages extends ReadonlyArray<Schema.Top>,
  Eff extends Effect.Effect<Schema.Schema.Type<Messages[number]>, any, any>,
>(
  name: Name,
  config: Readonly<{
    args: Fields
    messages: Messages
    interrupt: true
    execute: (args: Schema.Schema.Type<Schema.Struct<Fields>>) => Eff
  }>,
): Interruptible.DefinitionWithArgsNameKeyed<Name, Fields, Eff>

export function define<
  const Name extends string,
  Fields extends Schema.Struct.Fields,
  const Messages extends ReadonlyArray<Schema.Top>,
  Eff extends Effect.Effect<Schema.Schema.Type<Messages[number]>, any, any>,
>(
  name: Name,
  config: Readonly<{
    args: Fields
    messages: Messages
    interrupt?: never
    execute: (args: Schema.Schema.Type<Schema.Struct<Fields>>) => Eff
  }>,
): CommandDefinitionWithArgs<Name, Fields, Eff>

export function define<
  const Name extends string,
  const Messages extends ReadonlyArray<Schema.Top>,
  Eff extends Effect.Effect<Schema.Schema.Type<Messages[number]>, any, any>,
>(
  name: Name,
  config: Readonly<{
    messages: Messages
    interrupt: true
    execute: Eff
  }>,
): Interruptible.DefinitionNoArgs<Name, Eff>

export function define<
  const Name extends string,
  const Messages extends ReadonlyArray<Schema.Top>,
  Eff extends Effect.Effect<Schema.Schema.Type<Messages[number]>, any, any>,
>(
  name: Name,
  config: Readonly<{
    messages: Messages
    interrupt?: never
    execute: Eff
  }>,
): CommandDefinitionNoArgs<Name, Eff>

export function define(name: string, config: DefineConfig): unknown {
  const isArgsDeclared = Predicate.isNotUndefined(config.args)
  const maybeInterrupt = Option.fromNullishOr(config.interrupt)

  if (Option.isNone(maybeInterrupt)) {
    if (isArgsDeclared) {
      const definition = (args: any) => ({
        name,
        args,
        effect: suspendExecute(config, args),
        messageMappers: [],
      })
      brandAsDefinition(definition, name)
      return definition
    } else {
      const definition = () => ({
        name,
        effect: config.execute,
        messageMappers: [],
      })
      brandAsDefinition(definition, name)
      return definition
    }
  }

  const interrupt = maybeInterrupt.value
  const maybeToKey =
    Predicate.isObject(interrupt) &&
    Predicate.hasProperty(interrupt, 'toKey') &&
    Predicate.isFunction(interrupt.toKey)
      ? Option.some(interrupt.toKey)
      : Option.none<(keyArgs: any) => string>()

  if (!isArgsDeclared) {
    const definition = () => ({
      name,
      key: name,
      effect: Interruptible.__registerKeyWhileRunning(name, config.execute),
      messageMappers: [],
    })
    brandAsDefinition(definition, name)
    Object.defineProperty(definition, 'Interrupt', {
      value: Interruptible.__makeInterruptDefinitionNoArgs(name, name),
    })
    return definition
  }

  if (Option.isNone(maybeToKey)) {
    const definition = (args: any) => ({
      name,
      args,
      key: name,
      effect: Interruptible.__registerKeyWhileRunning(
        name,
        suspendExecute(config, args),
      ),
      messageMappers: [],
    })
    brandAsDefinition(definition, name)
    Object.defineProperty(definition, 'Interrupt', {
      value: Interruptible.__makeInterruptDefinitionNoArgs(name, name),
    })
    return definition
  }

  const toKey = maybeToKey.value
  const toFullKey = (keyArgs: any): string => `${name}:${toKey(keyArgs)}`

  const definition = (args: any) => {
    const key = toFullKey(args)
    return {
      name,
      args,
      key,
      effect: Interruptible.__registerKeyWhileRunning(
        key,
        suspendExecute(config, args),
      ),
      messageMappers: [],
    }
  }
  brandAsDefinition(definition, name)
  Object.defineProperty(definition, 'Interrupt', {
    value: Interruptible.__makeInterruptDefinitionWithArgs(name, toFullKey),
  })
  return definition
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
