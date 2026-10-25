import {
  Context,
  Effect,
  type Fiber,
  Function,
  Layer,
  Predicate,
  Queue,
  Schema,
  Scope,
  Stream,
} from 'effect'

import {
  InvocationIdentityTypeId,
  InvocationNameTypeId,
  registerIdentity,
} from '../block/identity.js'
import type { ValidateConstructionRequirements } from '../block/scope.js'
import {
  type AnyHandler,
  type Handler,
  type ToEffectLayer,
  type ToStreamLayer,
  makeEffectHandler,
  makeStreamHandler,
} from './handler.js'

export type {
  AnyHandler,
  Handler,
  ToEffectLayer,
  ToStreamLayer,
} from './handler.js'

type ValidateHandlerConstruction<
  Yielded extends Effect.Effect<unknown, unknown, unknown>,
> = ValidateConstructionRequirements<Effect.Services<Yielded>>

/** Effect service tag that observes Mount lifecycle events. The runtime
 *  provides an implementation that buffers events for DevTools history;
 *  the OnMount snabbdom hooks call `started` synchronously when an element
 *  with an OnMount attribute is inserted and `ended` when it is destroyed.
 *  Test renderers do not provide this service, since snabbdom hooks never
 *  fire in their VNode-only environment. */
export class MountTracker extends Context.Service<
  MountTracker,
  {
    readonly started: (name: string, args?: Record<string, unknown>) => void
    readonly ended: (name: string, args?: Record<string, unknown>) => void
  }
>()('@foldkit/MountTracker') {}

/** The state of the DOM currently owned by the Foldkit renderer. `Live` means
 *  it represents the current live Model. `Paused` means time travel has
 *  installed a historical view while the live application continues running. */
export const ViewState = Schema.Literals(['Live', 'Paused'])

/** The state of the DOM currently owned by the Foldkit renderer. */
export type ViewState = typeof ViewState.Type

/** @internal Runtime state used by `OnMount` to supply
 *  `viewStateChanges`. */
export class MountRuntime extends Context.Service<
  MountRuntime,
  {
    readonly captureViewStateChanges: () => Stream.Stream<ViewState>
    readonly registerFiber: (fiber: Fiber.Fiber<void>) => void
    readonly interruptFibers: Effect.Effect<void>
  }
>()('@foldkit/MountRuntime') {}

/** Type-level brand for MountDefinition values. */
/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
export const MountDefinitionTypeId: unique symbol = Symbol.for(
  'foldkit/MountDefinition',
) as unknown as MountDefinitionTypeId

/** Type-level brand for MountDefinition values. */
export type MountDefinitionTypeId = typeof MountDefinitionTypeId

/**
 * @internal Runtime identity shared by a layered Mount Definition and every
 *  action constructed from it.
 */
export type MountRegistration = Readonly<{ name: string }>

/** Property key carrying a layered Mount's registration identity through Block
 * composition. */
/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
export const MountRegistrationTypeId: unique symbol = Symbol.for(
  'foldkit/MountRegistration',
) as unknown as MountRegistrationTypeId

/** Type of the property key that carries a layered Mount's registration
 * identity through Block composition. */
export type MountRegistrationTypeId = typeof MountRegistrationTypeId

/**
 * A named, type-constrained per-element side effect, optionally carrying the
 *  args used to construct it. The runtime invokes `f` with the live `Element`
 *  and required view-state Stream when the element mounts. A Mount acquired by
 *  a live render keeps live dispatch, while one acquired by a historical
 *  render uses no-op dispatch. When resume reuses a replay-created element,
 *  the runtime releases its historical Mount before starting the live action.
 *  Otherwise the Stream's scope is tied to the element's lifetime: when the
 *  element unmounts, the runtime interrupts the fiber, which closes the
 *  Stream's scope and runs any registered `acquireRelease` finalizers.
 *
 *  Authors don't construct this shape directly. `Mount.define` builds the
 *  one-shot case, while `Mount.defineStream` exposes the continuous-event
 *  shape.
 */
export type MountAction<Message, E = never, R = never> = Readonly<{
  name: string
  args?: Record<string, unknown>
  [MountRegistrationTypeId]?: MountRegistration
  f: (
    element: Element,
    viewStateChanges: Stream.Stream<ViewState>,
  ) => Stream.Stream<Message, E, R>
}>

/** A Mount definition for a Mount with no declared args. Call as `Definition()` to produce a MountAction. */
export interface MountDefinitionNoArgs<
  Name extends string,
  ResultMessage,
  R = never,
> {
  readonly [MountDefinitionTypeId]: MountDefinitionTypeId
  readonly name: Name
  (): Readonly<{
    name: Name
    f: (
      element: Element,
      viewStateChanges: Stream.Stream<ViewState>,
    ) => Stream.Stream<ResultMessage, never, R>
  }>
}

/** A Mount definition for a Mount with declared args. Call as `Definition(args)` to produce a MountAction. */
export interface MountDefinitionWithArgs<
  Name extends string,
  Fields extends Schema.Struct.Fields,
  ResultMessage,
  R = never,
> {
  readonly [MountDefinitionTypeId]: MountDefinitionTypeId
  readonly name: Name
  (args: Schema.Schema.Type<Schema.Struct<Fields>>): Readonly<{
    name: Name
    args: Schema.Schema.Type<Schema.Struct<Fields>>
    f: (
      element: Element,
      viewStateChanges: Stream.Stream<ViewState>,
    ) => Stream.Stream<ResultMessage, never, R>
  }>
}

/** A one-shot Mount Definition whose implementation is supplied by a Layer. */
export interface LayeredMountDefinitionNoArgs<
  Name extends string,
  ResultMessage,
> extends MountDefinitionNoArgs<
  Name,
  ResultMessage,
  Handler<Name, ExecuteRuntimeInput, ResultMessage>
> {
  readonly [MountRegistrationTypeId]: MountRegistration
  readonly toLayer: ToEffectLayer<Name, ExecuteRuntimeInput, ResultMessage>
}

/** An argument-bearing one-shot Mount Definition whose implementation is supplied by a Layer. */
export interface LayeredMountDefinitionWithArgs<
  Name extends string,
  Fields extends Schema.Struct.Fields,
  ResultMessage,
> extends MountDefinitionWithArgs<
  Name,
  Fields,
  ResultMessage,
  Handler<
    Name,
    ExecuteRuntimeInput & Schema.Schema.Type<Schema.Struct<Fields>>,
    ResultMessage
  >
> {
  readonly [MountRegistrationTypeId]: MountRegistration
  readonly toLayer: ToEffectLayer<
    Name,
    ExecuteRuntimeInput & Schema.Schema.Type<Schema.Struct<Fields>>,
    ResultMessage
  >
}

/** A streaming Mount Definition whose implementation is supplied by a Layer. */
export interface LayeredStreamMountDefinitionNoArgs<
  Name extends string,
  ResultMessage,
> extends MountDefinitionNoArgs<
  Name,
  ResultMessage,
  Handler<Name, ExecuteRuntimeInput, ResultMessage>
> {
  readonly [MountRegistrationTypeId]: MountRegistration
  readonly toLayer: ToStreamLayer<Name, ExecuteRuntimeInput, ResultMessage>
}

/** An argument-bearing streaming Mount Definition whose implementation is supplied by a Layer. */
export interface LayeredStreamMountDefinitionWithArgs<
  Name extends string,
  Fields extends Schema.Struct.Fields,
  ResultMessage,
> extends MountDefinitionWithArgs<
  Name,
  Fields,
  ResultMessage,
  Handler<
    Name,
    ExecuteRuntimeInput & Schema.Schema.Type<Schema.Struct<Fields>>,
    ResultMessage
  >
> {
  readonly [MountRegistrationTypeId]: MountRegistration
  readonly toLayer: ToStreamLayer<
    Name,
    ExecuteRuntimeInput & Schema.Schema.Type<Schema.Struct<Fields>>,
    ResultMessage
  >
}

/** A Layer-backed Mount Definition registered with an application. */
export type LayeredMountDefinition<
  Name extends string = any,
  ResultMessage = any,
> =
  | LayeredMountDefinitionNoArgs<Name, ResultMessage>
  | LayeredMountDefinitionWithArgs<Name, any, ResultMessage>
  | LayeredStreamMountDefinitionNoArgs<Name, ResultMessage>
  | LayeredStreamMountDefinitionWithArgs<Name, any, ResultMessage>

/** A Mount definition created with `Mount.define` or `Mount.defineStream`.
 *  Union over the no-args and with-args shapes; consumers that only need
 *  name/identity can accept this. */
export type MountDefinition<
  Name extends string = string,
  ResultMessage = any,
  R = any,
> =
  | MountDefinitionNoArgs<Name, ResultMessage, R>
  | MountDefinitionWithArgs<Name, any, ResultMessage, R>

/** The Layer service required by a Layer-backed Mount Definition or registry. */
export type RequirementsOf<DefinitionOrDefinitions> =
  DefinitionOrDefinitions extends ReadonlyArray<infer Definition>
    ? RequirementsOf<Definition>
    : DefinitionOrDefinitions extends (...args: infer _Args) => infer Action
      ? Action extends MountAction<
          infer _Message,
          infer _Error,
          infer Requirements
        >
        ? Requirements
        : never
      : never

type IsAny<Value> = 0 extends 1 & Value ? true : false

type HasErasedMountContract<Requirement> =
  Requirement extends Handler<infer Name, infer Input, infer ResultMessage>
    ? true extends IsAny<Name> | IsAny<Input> | IsAny<ResultMessage>
      ? true
      : unknown extends Input | ResultMessage
        ? true
        : false
    : true

type DeclaredMountArgs<Definition> = Definition extends (
  ...args: infer Args
) => unknown
  ? Args extends [infer DeclaredArgs]
    ? DeclaredArgs
    : never
  : never

type HasErasedMountArgs<Definition> = [DeclaredMountArgs<Definition>] extends [
  never,
]
  ? false
  : IsAny<DeclaredMountArgs<Definition>> extends true
    ? true
    : unknown extends DeclaredMountArgs<Definition>
      ? true
      : string extends keyof DeclaredMountArgs<Definition>
        ? true
        : false

type HasErasedMountRegistryContract<
  Mounts extends ReadonlyArray<LayeredMountDefinition>,
> = [true] extends [HasErasedMountContract<RequirementsOf<Mounts>>]
  ? true
  : [true] extends [HasErasedMountArgs<Mounts[number]>]
    ? true
    : false

type MountNames<Mounts extends ReadonlyArray<LayeredMountDefinition>> =
  Mounts[number] extends Readonly<{ name: infer Name }> ? Name : never

/**
 * @internal Rejects registries whose annotations erased a Definition name or
 *  handler protocol that the view capability check needs.
 */
export type PreciseMountRegistry<
  Mounts extends ReadonlyArray<LayeredMountDefinition>,
> = [Mounts[number]] extends [never]
  ? unknown
  : IsAny<MountNames<Mounts>> extends true
    ? Readonly<{
        'Mount registry must preserve each definition type': never
      }>
    : string extends MountNames<Mounts>
      ? Readonly<{
          'Mount registry must preserve each definition name': never
        }>
      : [true] extends [HasErasedMountRegistryContract<Mounts>]
        ? Readonly<{
            'Mount registry must preserve each definition contract': never
          }>
        : unknown

/** @internal The capability accepted by renderers that do not execute Mounts. */
export type AnyMountHandler = AnyHandler

/**
 * @internal Rejects an args field named `element`. The handler receives the live
 *  element under that name, so an arg of the same name would shadow it. The
 *  literal is the type error a colliding declaration produces.
 */
type ElementFieldIsReserved =
  'Mount args cannot declare `element`: the handler already receives the live element'

/**
 * @internal Rejects an args field named `viewStateChanges`. The handler
 *  receives the runtime-owned Stream under that name.
 */
type ViewStateChangesFieldIsReserved =
  'Mount args cannot declare `viewStateChanges`: the handler already receives the view-state Stream'

/** @internal Fields the runtime supplies to every Mount execution. */
type ExecuteRuntimeInput = Readonly<{
  element: Element
  viewStateChanges: Stream.Stream<ViewState>
}>

/** @internal Type-level rejection for args that collide with runtime fields. */
type ReservedExecuteFields = Readonly<{
  element?: ElementFieldIsReserved
  viewStateChanges?: ViewStateChangesFieldIsReserved
}>

/** @internal The shape {@link define} and {@link defineStream} read at
 *  runtime. The public overloads carry the precise types; this is only what
 *  the implementations destructure. */
type DefineConfig<Implementation, ConstructorError, ConstructorRequirements> =
  Readonly<{
    args?: Schema.Struct.Fields
    messages: ReadonlyArray<Schema.Top>
    handler?: () => Generator<
      Effect.Effect<unknown, ConstructorError, ConstructorRequirements>,
      Implementation,
      unknown
    >
  }>

/** @internal Stamps a callable Definition with its Mount name and the
 *  {@link MountDefinitionTypeId} brand, so `Scene` matchers and the runtime
 *  recognise it. Internal to the Mount module. */
const brandAsDefinition = (definition: unknown, name: string): void => {
  Object.defineProperty(definition, 'name', {
    value: name,
    configurable: true,
  })
  Object.defineProperty(definition, MountDefinitionTypeId, {
    value: MountDefinitionTypeId,
  })
}

const attachHandler = (
  definition: unknown,
  registration: MountRegistration,
  toLayer: unknown,
  layer?: unknown,
): void => {
  Object.defineProperty(definition, MountRegistrationTypeId, {
    value: registration,
  })
  Object.defineProperty(definition, 'toLayer', { value: toLayer })
  if (Predicate.isNotUndefined(layer)) {
    Object.defineProperty(definition, 'layer', { value: layer })
  }
}

/** A never-ending view-state Stream for renderers without time travel.
 *  It emits `Live` immediately and never completes. Custom renderers and
 *  low-level MountAction wrappers can pass it as the required second argument
 *  to `MountAction.f` when the rendered view is always live. */
export const liveViewStateChanges: Stream.Stream<ViewState> = Stream.concat(
  Stream.make(ViewState.make('Live')),
  Stream.never,
)

const wrapEffectAsStream =
  <Message, R>(
    toEffect: (
      element: Element,
      viewStateChanges: Stream.Stream<ViewState>,
    ) => Effect.Effect<Message, never, R>,
  ) =>
  (
    element: Element,
    viewStateChanges: Stream.Stream<ViewState>,
  ): Stream.Stream<Message, never, Exclude<R, Scope.Scope>> =>
    Stream.callback<Message, never, R>(queue =>
      Effect.matchCauseEffect(toEffect(element, viewStateChanges), {
        onFailure: cause =>
          Effect.sync(() => Queue.failCauseUnsafe(queue, cause)),
        onSuccess: message =>
          Effect.sync(() => Queue.offerUnsafe(queue, message)).pipe(
            Effect.andThen(Effect.never),
          ),
      }),
    )

/**
 * Defines a one-shot Mount. Every input is a named field: `args` declares the
 * args Schema, and `messages` lists the Messages this Mount can produce.
 * `handler` is a generator function that constructs the handler. Foldkit
 * applies `Effect.gen` to the generator. Include the Definition in the owning
 * Block's `makeComposition({ mounts: [...] })` call and include its `layer`
 * recipe in the local Effects Layer passed to `prepareBlock`. The returned
 * handler receives the live `Element` as `element` and the runtime's
 * `viewStateChanges` Stream alongside the declared args, and returns an
 * `Effect<Message>` that runs once when the element mounts.
 * The completed Block carries the recipe without building it; a Runtime builds
 * it once for the application, while each element controls its own Mount
 * acquisition and release.
 *
 * Omit `handler` to declare a host contract. A host contract has no
 * `layer`; use its `toLayer` method to supply an implementation at the
 * application boundary or in a test.
 *
 * `args` is optional. Omit it and the Definition is callable as `Definition()`;
 * declare it and the Definition is callable as `Definition(args)`. The handler
 * keeps the same shape either way, because a Mount always has an element and a
 * view-state Stream. Args fields named `element` or `viewStateChanges` are
 * rejected where you declare them, since they would collide with the runtime
 * fields the handler receives.
 *
 * Constructing a MountAction never runs the handler. The runtime calls it when
 * the element enters the DOM, so nothing the body does happens inside the pure
 * view that built the action.
 *
 * `viewStateChanges` begins with the rendered view's `Live | Paused` state at
 * the moment the Mount is acquired, followed by changes. This acquisition
 * state stays available when the handler performs asynchronous setup before
 * consuming the Stream, so a Mount inserted by a historical render always
 * observes `Paused` first. Time travel pauses the rendered view, not the live
 * application. Use this Stream to make an imperative integration read-only
 * while historical DOM is installed. A surviving live Mount stays acquired
 * throughout pause and resume. Its live async work and external event sources
 * also continue, so the integration must use the Stream to stop DOM-derived
 * interaction while paused. Mounts acquired by a historical render cannot
 * dispatch to the live Model. If the resumed live view owns the same element,
 * Foldkit releases the replay acquisition before starting the live action. The
 * Stream stays open for the Mount's lifetime. When time travel is unavailable,
 * it emits only `Live`.
 *
 * Cleanup composes via `Effect.acquireRelease` inside the Effect: registered
 * finalizers run when the element unmounts. The Mount's scope stays open
 * across the element's full lifetime, even after the Effect completes.
 *
 * At least one result Message schema is required. The Effect's success
 * type is `Schema.Schema.Type<Messages[number]>`; without a declared
 * result, the handler would have to return `Effect.never`, leaving
 * `update` with no record of the work and removing DevTools, Scene,
 * and time-travel replay's reference point. Fire-and-forget Mounts
 * follow the same convention as fire-and-forget Commands: declare a
 * `Completed*` result Message that `update` no-ops on. The side
 * effect stays observable; `update` simply has nothing meaningful to
 * do with the acknowledgment.
 *
 * The runtime starts cleanup from snabbdom's `destroy` hook by forking
 * `Fiber.interrupt` without waiting. A release with no asynchronous step
 * normally finishes inside `destroy`, before snabbdom removes the element's
 * event listeners; one with an asynchronous step finishes later. For idempotent
 * DOM operations (`element.remove()`, observer `disconnect()`,
 * `removeEventListener`) this is fine; if your cleanup has ordering
 * requirements relative to other DOM removals, prefer doing the imperative
 * work synchronously inside `acquire` and using `release` only for
 * self-contained teardown.
 *
 * **Construct resources INSIDE the acquire body, never before it.**
 * `Effect.acquireRelease` only guarantees atomicity of "acquire body
 * completes → release is registered". If you construct a handle before
 * calling `acquireRelease` and your acquire body just returns that handle
 * (`Effect.sync(() => alreadyExistingValue)`), interruption between the
 * construction and the registration leaks the handle. For third-party
 * library instantiation, express the construction as the success value of
 * the acquire Effect: `Effect.tryPromise(() => import(...)).pipe(Effect.map(...))`
 * for async imports, `Effect.sync(() => new Thing(...))` for sync
 * construction. The discipline: whatever the release function needs as
 * input must be the success value of the acquire Effect.
 *
 * Use this form whenever a Mount produces a single Message at acquire and
 * holds lifecycle-scoped resources for the element's lifetime. For Mounts
 * that emit a continuum of events (scroll listeners, IntersectionObservers,
 * MutationObservers), reach for `Mount.defineStream`.
 *
 * @example Read element geometry on mount
 * ```ts
 * const MeasurePanelWidth = Mount.define('MeasurePanelWidth', {
 *   messages: [Message.CompletedMeasurePanelWidth],
 *   handler: function* () {
 *     return ({ element }) =>
 *       Effect.sync(() =>
 *         Message.CompletedMeasurePanelWidth({
 *           width: element.getBoundingClientRect().width,
 *         }),
 *       )
 *   },
 * })
 * const EffectsLayer = MeasurePanelWidth.layer
 * ```
 *
 * @example Portal to the document body with cleanup
 * ```ts
 * const PortalToBody = Mount.define('PortalToBody', {
 *   messages: [Message.CompletedPortalToBody],
 *   handler: function* () {
 *     return ({ element }) =>
 *       Effect.gen(function* () {
 *         yield* Effect.acquireRelease(
 *           Effect.sync(() => document.body.appendChild(element)),
 *           () => Effect.sync(() => element.remove()),
 *         )
 *         return Message.CompletedPortalToBody()
 *       })
 *   },
 * })
 * const EffectsLayer = PortalToBody.layer
 * ```
 *
 * **Args are captured at mount, not refreshed across renders.** The handler
 * runs once when the element enters the DOM. Subsequent renders construct
 * fresh `MountAction` values with updated arg values, but those values are
 * captured in closures that never execute. `OnMount` only binds to
 * snabbdom's `insert` and `destroy` hooks; there is no `update` hook in
 * between. Name args to reflect this. Prefer `initialScroll` over
 * `currentScroll` for values whose role is to seed state at mount time.
 *
 * If you need Model changes to drive ongoing DOM behavior post-mount, the
 * proximate cause is the Message that updated the Model. Dispatch a Command
 * from `update`'s handler for that Message. The Command can find the
 * element and do the imperative work. Don't reach for a Subscription here.
 * Subscriptions watch Model state via `modelToDependencies` to gate their
 * lifetime, but their emissions come from external event sources (timers,
 * document events, library callbacks), not from Model state itself.
 * Translating Model changes into side effects is what `update` does on
 * every Message, via the Commands it returns. (Subscriptions do legitimately
 * touch the DOM in some contexts: calling `preventDefault` in a non-passive
 * event handler where going through `update` would arrive too late, or
 * maintaining DOM state for as long as a Model condition is true (like
 * applying `user-select: none` to the document while a drag is in progress
 * and undoing it when the drag ends).)
 */
export function define<
  const Name extends string,
  Fields extends Schema.Struct.Fields,
  const Messages extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
  Yielded extends Effect.Effect<unknown, unknown, unknown>,
  HandlerRequirements = never,
>(
  name: Name,
  config: Readonly<{
    args: Fields & NoInfer<ReservedExecuteFields>
    messages: Messages
    execute?: never
    handler: (() => Generator<
      Yielded,
      (
        input: ExecuteRuntimeInput & Schema.Struct.Type<NoInfer<Fields>>,
      ) => Effect.Effect<
        NoInfer<Schema.Schema.Type<Messages[number]>>,
        never,
        HandlerRequirements
      >,
      unknown
    >) &
      ValidateHandlerConstruction<Yielded>
  }>,
): LayeredMountDefinitionWithArgs<
  Name,
  Fields,
  Schema.Schema.Type<Messages[number]>
> &
  Readonly<{
    layer: Layer.Layer<
      Handler<
        Name,
        ExecuteRuntimeInput & Schema.Struct.Type<NoInfer<Fields>>,
        Schema.Schema.Type<Messages[number]>
      >,
      Effect.Error<Yielded>,
      Exclude<HandlerRequirements | Effect.Services<Yielded>, Scope.Scope>
    >
  }>

export function define<
  const Name extends string,
  const Messages extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
  Yielded extends Effect.Effect<unknown, unknown, unknown>,
  HandlerRequirements = never,
>(
  name: Name,
  config: Readonly<{
    args?: never
    messages: Messages
    execute?: never
    handler: (() => Generator<
      Yielded,
      (
        input: ExecuteRuntimeInput,
      ) => Effect.Effect<
        NoInfer<Schema.Schema.Type<Messages[number]>>,
        never,
        HandlerRequirements
      >,
      unknown
    >) &
      ValidateHandlerConstruction<Yielded>
  }>,
): LayeredMountDefinitionNoArgs<Name, Schema.Schema.Type<Messages[number]>> &
  Readonly<{
    layer: Layer.Layer<
      Handler<Name, ExecuteRuntimeInput, Schema.Schema.Type<Messages[number]>>,
      Effect.Error<Yielded>,
      Exclude<HandlerRequirements | Effect.Services<Yielded>, Scope.Scope>
    >
  }>

export function define<
  const Name extends string,
  Fields extends Schema.Struct.Fields,
  const Messages extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
>(
  name: Name,
  config: Readonly<{
    args: Fields & NoInfer<ReservedExecuteFields>
    messages: Messages
    handler?: never
    execute?: never
  }>,
): LayeredMountDefinitionWithArgs<
  Name,
  Fields,
  Schema.Schema.Type<Messages[number]>
>

export function define<
  const Name extends string,
  const Messages extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
>(
  name: Name,
  config: Readonly<{
    args?: never
    messages: Messages
    handler?: never
    execute?: never
  }>,
): LayeredMountDefinitionNoArgs<Name, Schema.Schema.Type<Messages[number]>>

export function define<
  ResultMessage,
  HandlerRequirements,
  ConstructorError,
  ConstructorRequirements,
>(
  name: string,
  config: DefineConfig<
    (input: any) => Effect.Effect<ResultMessage, never, HandlerRequirements>,
    ConstructorError,
    ConstructorRequirements
  >,
): unknown {
  const isArgsDeclared = Predicate.isNotUndefined(config.args)
  const handler = makeEffectHandler<string, any, ResultMessage>(name)
  const registration: MountRegistration = { name }
  const layer = Predicate.isUndefined(config.handler)
    ? undefined
    : // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context, typescript/consistent-type-assertions
      handler.toLayer(Effect.gen(config.handler) as never)
  const makeEffect = (input: ExecuteRuntimeInput & Record<string, unknown>) =>
    handler.execute(input)

  if (isArgsDeclared) {
    const definition = (args: any) => ({
      name,
      args,
      [MountRegistrationTypeId]: registration,
      [InvocationIdentityTypeId]: handler.identity,
      [InvocationNameTypeId]: name,
      f: wrapEffectAsStream((element, viewStateChanges) =>
        makeEffect({ ...args, element, viewStateChanges }),
      ),
    })
    brandAsDefinition(definition, name)
    registerIdentity(definition, handler.identity)
    registerIdentity(registration, handler.identity)
    attachHandler(definition, registration, handler.toLayer, layer)
    return definition
  } else {
    const definition = () => ({
      name,
      [MountRegistrationTypeId]: registration,
      [InvocationIdentityTypeId]: handler.identity,
      [InvocationNameTypeId]: name,
      f: wrapEffectAsStream((element, viewStateChanges) =>
        makeEffect({ element, viewStateChanges }),
      ),
    })
    brandAsDefinition(definition, name)
    registerIdentity(definition, handler.identity)
    registerIdentity(registration, handler.identity)
    attachHandler(definition, registration, handler.toLayer, layer)
    return definition
  }
}

/**
 * Defines a streaming Mount. Every input is a named field, exactly as in
 * `Mount.define`: `args` declares the args Schema, and `messages` lists the
 * Messages this Mount can produce. `handler` is a generator function that
 * constructs a Stream handler. Foldkit applies `Effect.gen` to the generator.
 * Include the Definition in the owning Block's
 * `makeComposition({ mounts: [...] })` call and include its `layer` recipe in the
 * local Effects Layer passed to `prepareBlock`. The completed Block carries the
 * recipe without building it; a Runtime builds it once for the application.
 * The returned handler receives the
 * live `Element` as `element` and the runtime's
 * `viewStateChanges` Stream alongside the declared args, and returns a
 * `Stream<Message>` whose lifetime is bound to the element's lifetime: each
 * emitted Message is dispatched, and the Stream's scope is closed (running any
 * registered `Effect.acquireRelease` finalizers) when the element unmounts.
 * Use this form when the Mount emits a continuum of events from observers or
 * listeners attached to the element.
 *
 * Omit `handler` to declare a host contract. A host contract has no
 * `layer`; use its `toLayer` method to supply an implementation at the
 * application boundary or in a test.
 *
 * `args` is optional. Omit it and the Definition is callable as `Definition()`;
 * declare it and the Definition is callable as `Definition(args)`. The handler
 * keeps the same shape either way, because a Mount always has an element and a
 * view-state Stream. Args fields named `element` or `viewStateChanges` are
 * rejected where you declare them, since they would collide with the runtime
 * fields the handler receives.
 *
 * Constructing a MountAction never runs the handler. The runtime calls it when
 * the element enters the DOM, so nothing the body does happens inside the pure
 * view that built the action.
 *
 * `viewStateChanges` has the same semantics as in `Mount.define`: it begins
 * with the rendered view's state at acquisition even after asynchronous
 * setup, keeps a surviving live Mount acquired, and returns to `Live` only
 * after the latest live view has been patched back into the DOM. A live
 * Mount's external sources continue while paused, so use the state to stop
 * listeners from turning historical DOM interaction into Messages. A Mount
 * acquired by a historical render cannot dispatch to the live Model. If the
 * resumed live view owns the same element, Foldkit releases the replay
 * acquisition before starting the live action. The state Stream stays open
 * for the Mount's lifetime. When time travel is unavailable, it emits only
 * `Live`.
 *
 * At least one result Message schema is required. The Stream's emission
 * type is `Schema.Schema.Type<Messages[number]>`; without a declared
 * result, the handler would have to return `Stream<never>`, leaving
 * `update` with no record of the work and removing DevTools, Scene,
 * and time-travel replay's reference point. Fire-and-forget Mounts
 * follow the same convention as fire-and-forget Commands: declare a
 * `Completed*` result Message that `update` no-ops on. The side
 * effect stays observable; `update` simply has nothing meaningful to
 * do with the acknowledgment.
 *
 * Cleanup has the same timing relative to snabbdom's `destroy` hook as
 * `Mount.define`.
 *
 * For a Mount that produces exactly one Message at acquire and then holds
 * lifecycle-scoped resources, use `Mount.define` with `Effect<Message>`.
 * That form encodes "exactly one Message" in the type system. Reserve
 * `defineStream` for cases that genuinely emit a stream of events.
 *
 * @example Observe element scroll events
 * ```ts
 * const ObservePanelScroll = Mount.defineStream('ObservePanelScroll', {
 *   messages: [Message.ScrolledPanel],
 *   handler: function* () {
 *     return ({ element }) =>
 *       Stream.callback(queue =>
 *         Effect.gen(function* () {
 *           const onScroll = () =>
 *             Queue.offerUnsafe(queue, Message.ScrolledPanel({
 *               scroll: element.scrollTop,
 *             }))
 *           yield* Effect.acquireRelease(
 *             Effect.sync(() => element.addEventListener('scroll', onScroll)),
 *             () => Effect.sync(() => element.removeEventListener('scroll', onScroll)),
 *           )
 *           return yield* Effect.never
 *         }),
 *       )
 *   },
 * })
 * const EffectsLayer = ObservePanelScroll.layer
 * ```
 *
 * The args-captured-at-mount and Subscriptions-vs-Mount guidance from
 * `Mount.define` apply identically here. See that constructor's docs for
 * the mental model.
 */
export function defineStream<
  const Name extends string,
  Fields extends Schema.Struct.Fields,
  const Messages extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
  Yielded extends Effect.Effect<unknown, unknown, unknown>,
  HandlerRequirements = never,
>(
  name: Name,
  config: Readonly<{
    args: Fields & NoInfer<ReservedExecuteFields>
    messages: Messages
    execute?: never
    handler: (() => Generator<
      Yielded,
      (
        input: ExecuteRuntimeInput & Schema.Struct.Type<NoInfer<Fields>>,
      ) => Stream.Stream<
        NoInfer<Schema.Schema.Type<Messages[number]>>,
        never,
        HandlerRequirements
      >,
      unknown
    >) &
      ValidateHandlerConstruction<Yielded>
  }>,
): LayeredStreamMountDefinitionWithArgs<
  Name,
  Fields,
  Schema.Schema.Type<Messages[number]>
> &
  Readonly<{
    layer: Layer.Layer<
      Handler<
        Name,
        ExecuteRuntimeInput & Schema.Struct.Type<NoInfer<Fields>>,
        Schema.Schema.Type<Messages[number]>
      >,
      Effect.Error<Yielded>,
      Exclude<HandlerRequirements | Effect.Services<Yielded>, Scope.Scope>
    >
  }>

export function defineStream<
  const Name extends string,
  const Messages extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
  Yielded extends Effect.Effect<unknown, unknown, unknown>,
  HandlerRequirements = never,
>(
  name: Name,
  config: Readonly<{
    args?: never
    messages: Messages
    execute?: never
    handler: (() => Generator<
      Yielded,
      (
        input: ExecuteRuntimeInput,
      ) => Stream.Stream<
        NoInfer<Schema.Schema.Type<Messages[number]>>,
        never,
        HandlerRequirements
      >,
      unknown
    >) &
      ValidateHandlerConstruction<Yielded>
  }>,
): LayeredStreamMountDefinitionNoArgs<
  Name,
  Schema.Schema.Type<Messages[number]>
> &
  Readonly<{
    layer: Layer.Layer<
      Handler<Name, ExecuteRuntimeInput, Schema.Schema.Type<Messages[number]>>,
      Effect.Error<Yielded>,
      Exclude<HandlerRequirements | Effect.Services<Yielded>, Scope.Scope>
    >
  }>

export function defineStream<
  const Name extends string,
  Fields extends Schema.Struct.Fields,
  const Messages extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
>(
  name: Name,
  config: Readonly<{
    args: Fields & NoInfer<ReservedExecuteFields>
    messages: Messages
    handler?: never
    execute?: never
  }>,
): LayeredStreamMountDefinitionWithArgs<
  Name,
  Fields,
  Schema.Schema.Type<Messages[number]>
>

export function defineStream<
  const Name extends string,
  const Messages extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
>(
  name: Name,
  config: Readonly<{
    args?: never
    messages: Messages
    handler?: never
    execute?: never
  }>,
): LayeredStreamMountDefinitionNoArgs<
  Name,
  Schema.Schema.Type<Messages[number]>
>

export function defineStream<
  ResultMessage,
  HandlerRequirements,
  ConstructorError,
  ConstructorRequirements,
>(
  name: string,
  config: DefineConfig<
    (input: any) => Stream.Stream<ResultMessage, never, HandlerRequirements>,
    ConstructorError,
    ConstructorRequirements
  >,
): unknown {
  const isArgsDeclared = Predicate.isNotUndefined(config.args)
  const handler = makeStreamHandler<string, any, ResultMessage>(name)
  const registration: MountRegistration = { name }
  const layer = Predicate.isUndefined(config.handler)
    ? undefined
    : // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context, typescript/consistent-type-assertions
      handler.toLayer(Effect.gen(config.handler) as never)
  const makeStream = (input: ExecuteRuntimeInput & Record<string, unknown>) =>
    handler.execute(input)

  if (isArgsDeclared) {
    const definition = (args: any) => ({
      name,
      args,
      [MountRegistrationTypeId]: registration,
      [InvocationIdentityTypeId]: handler.identity,
      [InvocationNameTypeId]: name,
      f: (element: Element, viewStateChanges: Stream.Stream<ViewState>) =>
        makeStream({
          ...args,
          element,
          viewStateChanges,
        }),
    })
    brandAsDefinition(definition, name)
    registerIdentity(definition, handler.identity)
    registerIdentity(registration, handler.identity)
    attachHandler(definition, registration, handler.toLayer, layer)
    return definition
  } else {
    const definition = () => ({
      name,
      [MountRegistrationTypeId]: registration,
      [InvocationIdentityTypeId]: handler.identity,
      [InvocationNameTypeId]: name,
      f: (element: Element, viewStateChanges: Stream.Stream<ViewState>) =>
        makeStream({
          element,
          viewStateChanges,
        }),
    })
    brandAsDefinition(definition, name)
    registerIdentity(definition, handler.identity)
    registerIdentity(registration, handler.identity)
    attachHandler(definition, registration, handler.toLayer, layer)
    return definition
  }
}

/** Lifts a `MountAction` from one Message universe to another by mapping its
 *  dispatched Messages through a transform. Used by Block components to
 *  emit lifecycle action results into the parent's Message union via the
 *  consumer-supplied `toParentMessage` lift. Preserves `name` and `args`. */
export const mapMessage: {
  <A, B>(
    f: (message: A) => B,
  ): <E, R>(action: MountAction<A, E, R>) => MountAction<B, E, R>
  <A, B, E, R>(
    action: MountAction<A, E, R>,
    f: (message: A) => B,
  ): MountAction<B, E, R>
} = Function.dual(
  2,
  <A, B, E, R>(
    action: MountAction<A, E, R>,
    f: (message: A) => B,
  ): MountAction<B, E, R> => ({
    ...action,
    f: (element: Element, viewStateChanges: Stream.Stream<ViewState>) =>
      action.f(element, viewStateChanges).pipe(Stream.map(f)),
  }),
)
