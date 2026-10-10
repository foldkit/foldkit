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
  type Handler,
  type ToEffectLayer,
  type ToStreamLayer,
  makeEffectHandler,
  makeStreamHandler,
} from './handler.js'

export type { Handler, ToEffectLayer, ToStreamLayer } from './handler.js'

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

/** @internal Runtime identity shared by a layered Mount Definition and every
 *  action constructed from it. */
export type MountRegistration = Readonly<{ name: string }>

/** @internal Property carrying a layered Mount's registration identity. */
/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
export const MountRegistrationTypeId: unique symbol = Symbol.for(
  'foldkit/MountRegistration',
) as unknown as MountRegistrationTypeId

/** @internal Property carrying a layered Mount's registration identity. */
export type MountRegistrationTypeId = typeof MountRegistrationTypeId

/** A named, type-constrained per-element side effect, optionally carrying the
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
 *  shape. */
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
> extends MountDefinitionNoArgs<Name, ResultMessage, Handler<Name>> {
  readonly [MountRegistrationTypeId]: MountRegistration
  readonly toLayer: ToEffectLayer<Name, ExecuteRuntimeInput, ResultMessage>
}

/** An argument-bearing one-shot Mount Definition whose implementation is supplied by a Layer. */
export interface LayeredMountDefinitionWithArgs<
  Name extends string,
  Fields extends Schema.Struct.Fields,
  ResultMessage,
> extends MountDefinitionWithArgs<Name, Fields, ResultMessage, Handler<Name>> {
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
> extends MountDefinitionNoArgs<Name, ResultMessage, Handler<Name>> {
  readonly [MountRegistrationTypeId]: MountRegistration
  readonly toLayer: ToStreamLayer<Name, ExecuteRuntimeInput, ResultMessage>
}

/** An argument-bearing streaming Mount Definition whose implementation is supplied by a Layer. */
export interface LayeredStreamMountDefinitionWithArgs<
  Name extends string,
  Fields extends Schema.Struct.Fields,
  ResultMessage,
> extends MountDefinitionWithArgs<Name, Fields, ResultMessage, Handler<Name>> {
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

/** @internal Rejects an args field named `element`. The handler receives the live
 *  element under that name, so an arg of the same name would shadow it. The
 *  literal is the type error a colliding declaration produces. */
type ElementFieldIsReserved =
  'Mount args cannot declare `element`: the handler already receives the live element'

/** @internal Rejects an args field named `viewStateChanges`. The handler
 *  receives the runtime-owned Stream under that name. */
type ViewStateChangesFieldIsReserved =
  'Mount args cannot declare `viewStateChanges`: the handler already receives the view-state Stream'

/** @internal Fields the runtime supplies to every Mount execution. */
type ExecuteRuntimeInput = Readonly<{
  element: Element
  viewStateChanges: Stream.Stream<ViewState>
}>

/** @internal The decoded declared args used to contextually type a handler. */
type HandlerArgs<Fields extends Schema.Struct.Fields> = Schema.Struct.Type<
  NoInfer<Fields>
>

/** @internal Type-level rejection for args that collide with runtime fields. */
type ReservedExecuteFields = Readonly<{
  element?: ElementFieldIsReserved
  viewStateChanges?: ViewStateChangesFieldIsReserved
}>

/** @internal Configuration shared by attached Mount constructors. */
type AttachedMountConfig = Readonly<{
  args?: Schema.Struct.Fields
  messages: readonly [Schema.Top, ...ReadonlyArray<Schema.Top>]
  handler?: never
  execute?: never
}>

/** @internal The exact handler input selected by an attached Mount config. */
type MountHandlerInput<Config extends AttachedMountConfig> =
  Config extends Readonly<{
    args: infer Fields extends Schema.Struct.Fields
  }>
    ? ExecuteRuntimeInput & HandlerArgs<Fields>
    : ExecuteRuntimeInput

/** @internal Rejects args fields that collide with runtime-owned fields. */
type CheckedAttachedMountConfig<Config extends AttachedMountConfig> =
  Config extends Readonly<{
    args: infer Fields extends Schema.Struct.Fields
  }>
    ? Readonly<{ args: Fields & NoInfer<ReservedExecuteFields> }>
    : Readonly<{ args?: never }>

/** @internal The shape {@link define} and {@link defineStream} read at
 *  runtime. The public overloads carry the precise types; this is only what
 *  the implementations destructure. */
type DefineConfig = Readonly<{
  args?: Schema.Struct.Fields
  messages: ReadonlyArray<Schema.Top>
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
 * The final argument is an Effect that constructs the handler. The
 * Definition's `layer` provides that handler to the application. The returned
 * handler receives the live `Element` as `element` and the runtime's
 * `viewStateChanges` Stream alongside the declared args, and returns an
 * `Effect<Message>` that runs once when the element mounts.
 * Register the Definition in
 * `Application.make({ mounts: [...] })` so the application carries its handler
 * requirement. The Layer lives for the application; each element controls
 * its own Mount acquisition and release.
 *
 * Omit the final argument to declare a host contract. A host contract has no
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
 * Cleanup is asynchronous with respect to snabbdom's `destroy` hook: the
 * runtime forks `Fiber.interrupt` and returns immediately, so finalizers run
 * on a separate fiber after `destroy` has already completed. For idempotent
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
 * @example One-shot, no cleanup (read element geometry on mount)
 * ```ts
 * const MeasurePanelWidth = Mount.define(
 *   'MeasurePanelWidth',
 *   { messages: [Message.MeasuredPanelWidth] },
 *   Effect.succeed(({ element }) =>
 *     Effect.sync(() =>
 *       Message.MeasuredPanelWidth({
 *         width: element.getBoundingClientRect().width,
 *       }),
 *     ),
 *   ),
 * )
 *
 * const EffectsLayer = MeasurePanelWidth.layer
 * ```
 *
 * @example One-shot with cleanup (portal-to-body)
 * ```ts
 * const PortalToBody = Mount.define(
 *   'PortalToBody',
 *   { messages: [Message.CompletedPortalToBody] },
 *   Effect.succeed(({ element }) =>
 *     Effect.gen(function* () {
 *       yield* Effect.acquireRelease(
 *         Effect.sync(() => document.body.appendChild(element)),
 *         () => Effect.sync(() => element.remove()),
 *       )
 *       return Message.CompletedPortalToBody()
 *     }),
 *   ),
 * )
 *
 * const EffectsLayer = PortalToBody.layer
 * ```
 *
 * @example With args
 * ```ts
 * const AnchorPopover = Mount.define(
 *   'AnchorPopover',
 *   {
 *     args: { buttonId: Schema.String, anchor: AnchorConfig },
 *     messages: [Message.CompletedAnchorPopover],
 *   },
 *   Effect.succeed(({ element, buttonId, anchor }) =>
 *     Effect.gen(function* () {
 *       yield* Effect.acquireRelease(
 *         Effect.sync(() => anchorSetup(element, { buttonId, anchor })),
 *         cleanup => Effect.sync(cleanup),
 *       )
 *       return Message.CompletedAnchorPopover()
 *     }),
 *   ),
 * )
 *
 * const EffectsLayer = AnchorPopover.layer
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
  const Config extends AttachedMountConfig,
  HandlerRequirements = never,
  BuildError = never,
  BuildRequirements = never,
>(
  name: Name,
  config: Config & CheckedAttachedMountConfig<Config>,
  handler: Effect.Effect<
    (
      input: MountHandlerInput<NoInfer<Config>>,
    ) => Effect.Effect<
      NoInfer<Schema.Schema.Type<Config['messages'][number]>>,
      never,
      HandlerRequirements
    >,
    BuildError,
    BuildRequirements
  >,
): (Config extends Readonly<{
  args: infer Fields extends Schema.Struct.Fields
}>
  ? LayeredMountDefinitionWithArgs<
      Name,
      Fields,
      Schema.Schema.Type<Config['messages'][number]>
    >
  : LayeredMountDefinitionNoArgs<
      Name,
      Schema.Schema.Type<Config['messages'][number]>
    >) &
  Readonly<{
    layer: Layer.Layer<
      Handler<Name>,
      BuildError,
      Exclude<HandlerRequirements | BuildRequirements, Scope.Scope>
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
  ExecuteRequirements = never,
  BuildError = never,
  BuildRequirements = never,
>(
  name: string,
  config: DefineConfig,
  handlerEffect?: Effect.Effect<
    (input: any) => Effect.Effect<any, never, ExecuteRequirements>,
    BuildError,
    BuildRequirements
  >,
): unknown {
  const isArgsDeclared = Predicate.isNotUndefined(config.args)
  const handler = makeEffectHandler<string, any, any>(name)
  const registration: MountRegistration = { name }
  const layer = Predicate.isUndefined(handlerEffect)
    ? undefined
    : handler.toLayer(handlerEffect)
  const makeEffect = (input: ExecuteRuntimeInput & Record<string, unknown>) =>
    handler.execute(input)

  if (isArgsDeclared) {
    const definition = (args: any) => ({
      name,
      args,
      [MountRegistrationTypeId]: registration,
      f: wrapEffectAsStream((element, viewStateChanges) =>
        makeEffect({ ...args, element, viewStateChanges }),
      ),
    })
    brandAsDefinition(definition, name)
    attachHandler(definition, registration, handler.toLayer, layer)
    return definition
  } else {
    const definition = () => ({
      name,
      [MountRegistrationTypeId]: registration,
      f: wrapEffectAsStream((element, viewStateChanges) =>
        makeEffect({ element, viewStateChanges }),
      ),
    })
    brandAsDefinition(definition, name)
    attachHandler(definition, registration, handler.toLayer, layer)
    return definition
  }
}

/**
 * Defines a streaming Mount. Every input is a named field, exactly as in
 * `Mount.define`: `args` declares the args Schema, and `messages` lists the
 * Messages this Mount can produce. The final argument is an Effect that
 * constructs a Stream handler. The Definition's `layer` provides that handler
 * to the application, and the Definition must be registered in
 * `Application.make({ mounts: [...] })`. The returned handler receives the
 * live `Element` as `element` and the runtime's
 * `viewStateChanges` Stream alongside the declared args, and returns a
 * `Stream<Message>` whose lifetime is bound to the element's lifetime: each
 * emitted Message is dispatched, and the Stream's scope is closed (running any
 * registered `Effect.acquireRelease` finalizers) when the element unmounts.
 * Use this form when the Mount emits a continuum of events from observers or
 * listeners attached to the element.
 *
 * Omit the final argument to declare a host contract. A host contract has no
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
 * Cleanup timing relative to snabbdom's `destroy` hook is the same as
 * `Mount.define` (asynchronous via `Fiber.interrupt`).
 *
 * For a Mount that produces exactly one Message at acquire and then holds
 * lifecycle-scoped resources, use `Mount.define` with `Effect<Message>`.
 * That form encodes "exactly one Message" in the type system. Reserve
 * `defineStream` for cases that genuinely emit a stream of events.
 *
 * @example Continuous scroll events from an element
 * ```ts
 * const SyncSidebarScroll = Mount.defineStream(
 *   'SyncSidebarScroll',
 *   { messages: [Message.ScrolledSidebar] },
 *   Effect.succeed(({ element }) =>
 *     Stream.callback<typeof Message.ScrolledSidebar.Type>(queue =>
 *       Effect.gen(function* () {
 *         yield* Effect.acquireRelease(
 *           Effect.sync(() => {
 *             const handler = () =>
 *               Queue.offerUnsafe(
 *                 queue,
 *                 Message.ScrolledSidebar({ scroll: element.scrollTop }),
 *               )
 *             element.addEventListener('scroll', handler, { passive: true })
 *             return handler
 *           }),
 *           handler =>
 *             Effect.sync(() =>
 *               element.removeEventListener('scroll', handler),
 *             ),
 *         )
 *         return yield* Effect.never
 *       }),
 *     ),
 *   ),
 * )
 *
 * const EffectsLayer = SyncSidebarScroll.layer
 * ```
 *
 * @example IntersectionObserver events
 * ```ts
 * const ObserveHeroVisibility = Mount.defineStream(
 *   'ObserveHeroVisibility',
 *   { messages: [Message.ChangedHeroVisibility] },
 *   Effect.succeed(({ element }) =>
 *     Stream.callback<typeof Message.ChangedHeroVisibility.Type>(queue =>
 *       Effect.gen(function* () {
 *         yield* Effect.acquireRelease(
 *           Effect.sync(() => {
 *             const observer = new IntersectionObserver(entries => {
 *               pipe(
 *                 Array.head(entries),
 *                 Option.match({
 *                   onNone: Function.constVoid,
 *                   onSome: entry =>
 *                     Queue.offerUnsafe(
 *                       queue,
 *                       Message.ChangedHeroVisibility({
 *                         isVisible: entry.isIntersecting,
 *                       }),
 *                     ),
 *                 }),
 *               )
 *             })
 *             observer.observe(element)
 *             return observer
 *           }),
 *           observer => Effect.sync(() => observer.disconnect()),
 *         )
 *         return yield* Effect.never
 *       }),
 *     ),
 *   ),
 * )
 *
 * const EffectsLayer = ObserveHeroVisibility.layer
 * ```
 *
 * The args-captured-at-mount and Subscriptions-vs-Mount guidance from
 * `Mount.define` apply identically here. See that constructor's docs for
 * the mental model.
 */
export function defineStream<
  const Name extends string,
  const Config extends AttachedMountConfig,
  HandlerRequirements = never,
  BuildError = never,
  BuildRequirements = never,
>(
  name: Name,
  config: Config & CheckedAttachedMountConfig<Config>,
  handler: Effect.Effect<
    (
      input: MountHandlerInput<NoInfer<Config>>,
    ) => Stream.Stream<
      NoInfer<Schema.Schema.Type<Config['messages'][number]>>,
      never,
      HandlerRequirements
    >,
    BuildError,
    BuildRequirements
  >,
): (Config extends Readonly<{
  args: infer Fields extends Schema.Struct.Fields
}>
  ? LayeredStreamMountDefinitionWithArgs<
      Name,
      Fields,
      Schema.Schema.Type<Config['messages'][number]>
    >
  : LayeredStreamMountDefinitionNoArgs<
      Name,
      Schema.Schema.Type<Config['messages'][number]>
    >) &
  Readonly<{
    layer: Layer.Layer<
      Handler<Name>,
      BuildError,
      Exclude<HandlerRequirements | BuildRequirements, Scope.Scope>
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
  StreamRequirements = never,
  BuildError = never,
  BuildRequirements = never,
>(
  name: string,
  config: DefineConfig,
  handlerEffect?: Effect.Effect<
    (input: any) => Stream.Stream<any, never, StreamRequirements>,
    BuildError,
    BuildRequirements
  >,
): unknown {
  const isArgsDeclared = Predicate.isNotUndefined(config.args)
  const handler = makeStreamHandler<string, any, any>(name)
  const registration: MountRegistration = { name }
  const layer = Predicate.isUndefined(handlerEffect)
    ? undefined
    : handler.toLayer(handlerEffect)
  const makeStream = (input: ExecuteRuntimeInput & Record<string, unknown>) =>
    handler.execute(input)

  if (isArgsDeclared) {
    const definition = (args: any) => ({
      name,
      args,
      [MountRegistrationTypeId]: registration,
      f: (element: Element, viewStateChanges: Stream.Stream<ViewState>) =>
        makeStream({
          ...args,
          element,
          viewStateChanges,
        }),
    })
    brandAsDefinition(definition, name)
    attachHandler(definition, registration, handler.toLayer, layer)
    return definition
  } else {
    const definition = () => ({
      name,
      [MountRegistrationTypeId]: registration,
      f: (element: Element, viewStateChanges: Stream.Stream<ViewState>) =>
        makeStream({
          element,
          viewStateChanges,
        }),
    })
    brandAsDefinition(definition, name)
    attachHandler(definition, registration, handler.toLayer, layer)
    return definition
  }
}

/** Lifts a `MountAction` from one Message universe to another by mapping its
 *  dispatched Messages through a transform. Used by Submodel components to
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
