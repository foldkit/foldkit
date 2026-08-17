import {
  Context,
  Effect,
  Function,
  Predicate,
  Queue,
  Schema,
  Scope,
  Stream,
} from 'effect'

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

/** Type-level brand for MountDefinition values. */
/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
export const MountDefinitionTypeId: unique symbol = Symbol.for(
  'foldkit/MountDefinition',
) as unknown as MountDefinitionTypeId

/** Type-level brand for MountDefinition values. */
export type MountDefinitionTypeId = typeof MountDefinitionTypeId

/** A named, type-constrained per-element side effect, optionally carrying the
 *  args used to construct it. The runtime invokes `f` with the live `Element`
 *  when the element mounts, and dispatches each Message emitted by the
 *  returned Stream. The Stream's scope is tied to the element's lifetime: when
 *  the element unmounts, the runtime interrupts the fiber, which closes the
 *  Stream's scope and runs any registered `acquireRelease` finalizers.
 *
 *  Authors typically don't construct Stream-returning factories directly.
 *  `Mount.define` wraps an `Effect<Message>` for the one-shot case; only
 *  `Mount.defineStream` exposes the raw Stream shape for continuous-event
 *  cases. */
export type MountAction<Message, E = never> = Readonly<{
  name: string
  args?: Record<string, unknown>
  f: (element: Element) => Stream.Stream<Message, E>
}>

/** A Mount definition for a Mount with no declared args. Call as `Definition()` to produce a MountAction. */
export interface MountDefinitionNoArgs<Name extends string, ResultMessage> {
  readonly [MountDefinitionTypeId]: MountDefinitionTypeId
  readonly name: Name;
  (): Readonly<{
    name: Name
    f: (element: Element) => Stream.Stream<ResultMessage>
  }>
}

/** A Mount definition for a Mount with declared args. Call as `Definition(args)` to produce a MountAction. */
export interface MountDefinitionWithArgs<
  Name extends string,
  Fields extends Schema.Struct.Fields,
  ResultMessage,
> {
  readonly [MountDefinitionTypeId]: MountDefinitionTypeId
  readonly name: Name;
  (args: Schema.Schema.Type<Schema.Struct<Fields>>): Readonly<{
    name: Name
    args: Schema.Schema.Type<Schema.Struct<Fields>>
    f: (element: Element) => Stream.Stream<ResultMessage>
  }>
}

/** A Mount definition created with `Mount.define` or `Mount.defineStream`.
 *  Union over the no-args and with-args shapes; consumers that only need
 *  name/identity can accept this. */
export type MountDefinition<
  Name extends string = string,
  ResultMessage = any,
> =
  | MountDefinitionNoArgs<Name, ResultMessage>
  | MountDefinitionWithArgs<Name, any, ResultMessage>

const wrapEffectAsStream =
  <Message>(
    factory: (element: Element) => Effect.Effect<Message, never, Scope.Scope>,
  ) =>
  (element: Element): Stream.Stream<Message> =>
    Stream.callback<Message>(queue =>
      Effect.gen(function* () {
        const message = yield* factory(element)
        Queue.offerUnsafe(queue, message)
        return yield* Effect.never
      }),
    )

/**
 * Defines a one-shot Mount. The factory returns `Effect<Message>` that runs
 * once when the element mounts and produces exactly one Message. Cleanup
 * composes via `Effect.acquireRelease` inside the Effect: registered
 * finalizers run when the element unmounts. The Mount's scope stays open
 * across the element's full lifetime, even after the Effect completes.
 *
 * At least one result Message schema is required. The Effect's success
 * type is `Schema.Schema.Type<Results[number]>`; without a declared
 * result, the factory would have to return `Effect.never`, leaving
 * `update` with no record of the work and removing DevTools, Scene,
 * and time-travel replay's reference point. Fire-and-forget Mounts
 * follow the same convention as fire-and-forget Commands: declare a
 * `Completed*` result Message that `update` no-ops on. The side
 * effect stays observable; `update` simply has nothing meaningful to
 * do with the acknowledgment.
 *
 * Two forms, distinguished by whether the second argument is a Schema (a
 * result message) or a record of Schemas (the args declaration). Cleanup is
 * asynchronous with respect to snabbdom's `destroy` hook: the runtime forks
 * `Fiber.interrupt` and returns immediately, so finalizers run on a separate
 * fiber after `destroy` has already completed. For idempotent DOM operations
 * (`element.remove()`, observer `disconnect()`, `removeEventListener`) this
 * is fine; if your cleanup has ordering requirements relative to other DOM
 * removals, prefer doing the imperative work synchronously inside `acquire`
 * and using `release` only for self-contained teardown.
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
 *   MeasuredPanelWidth,
 * )(element =>
 *   Effect.sync(() =>
 *     MeasuredPanelWidth({ width: element.getBoundingClientRect().width }),
 *   ),
 * )
 * ```
 *
 * @example One-shot with cleanup (portal-to-body)
 * ```ts
 * const PortalToBody = Mount.define('PortalToBody', CompletedPortalToBody)(
 *   element =>
 *     Effect.gen(function* () {
 *       yield* Effect.acquireRelease(
 *         Effect.sync(() => document.body.appendChild(element)),
 *         () => Effect.sync(() => element.remove()),
 *       )
 *       return CompletedPortalToBody()
 *     }),
 * )
 * ```
 *
 * @example With args
 * ```ts
 * const AnchorPopover = Mount.define(
 *   'AnchorPopover',
 *   { buttonId: S.String, anchor: AnchorConfig },
 *   CompletedAnchorPopover,
 * )(({ buttonId, anchor }) => element =>
 *   Effect.gen(function* () {
 *     yield* Effect.acquireRelease(
 *       Effect.sync(() => anchorSetup(element, { buttonId, anchor })),
 *       cleanup => Effect.sync(cleanup),
 *     )
 *     return CompletedAnchorPopover()
 *   }),
 * )
 * ```
 *
 * **Args are captured at mount, not refreshed across renders.** The factory
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
 * touch the DOM in some contexts: calling `preventDefault` in an event
 * handler where going through `update` would arrive too late, or
 * maintaining DOM state for as long as a Model condition is true (like
 * applying `user-select: none` to the document while a drag is in progress
 * and undoing it when the drag ends).)
 */
export function define<
  const Name extends string,
  Results extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
>(
  name: Name,
  ...results: Results
): (
  factory: (
    element: Element,
  ) => Effect.Effect<Schema.Schema.Type<Results[number]>, never, Scope.Scope>,
) => MountDefinitionNoArgs<Name, Schema.Schema.Type<Results[number]>>

export function define<
  const Name extends string,
  Fields extends Schema.Struct.Fields,
  Results extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
>(
  name: Name,
  args: Fields,
  ...results: Results
): (
  factoryBuilder: (
    args: Schema.Schema.Type<Schema.Struct<Fields>>,
  ) => (
    element: Element,
  ) => Effect.Effect<Schema.Schema.Type<Results[number]>, never, Scope.Scope>,
) => MountDefinitionWithArgs<Name, Fields, Schema.Schema.Type<Results[number]>>

export function define(name: string, ...rest: ReadonlyArray<unknown>): unknown {
  const [maybeArgs] = rest

  const isArgsRecord =
    Predicate.isObject(maybeArgs) && !Schema.isSchema(maybeArgs)

  if (isArgsRecord) {
    return (
      factoryBuilder: (
        args: any,
      ) => (element: Element) => Effect.Effect<any, never, Scope.Scope>,
    ): MountDefinitionWithArgs<string, any, any> => {
      const definition = (args: any) => ({
        name,
        args,
        f: wrapEffectAsStream(factoryBuilder(args)),
      })
      Object.defineProperty(definition, 'name', {
        value: name,
        configurable: true,
      })
      Object.defineProperty(definition, MountDefinitionTypeId, {
        value: MountDefinitionTypeId,
      })
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      return definition as MountDefinitionWithArgs<string, any, any>
    }
  }

  return (
    factory: (element: Element) => Effect.Effect<any, never, Scope.Scope>,
  ): MountDefinitionNoArgs<string, any> => {
    const definition = () => ({ name, f: wrapEffectAsStream(factory) })
    Object.defineProperty(definition, 'name', {
      value: name,
      configurable: true,
    })
    Object.defineProperty(definition, MountDefinitionTypeId, {
      value: MountDefinitionTypeId,
    })
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return definition as MountDefinitionNoArgs<string, any>
  }
}

/**
 * Defines a streaming Mount. The factory returns `Stream<Message>` whose
 * lifetime is bound to the element's lifetime: each emitted Message is
 * dispatched, and the Stream's scope is closed (running any registered
 * `Effect.acquireRelease` finalizers) when the element unmounts. Use this
 * form when the Mount emits a continuum of events from observers or
 * listeners attached to the element.
 *
 * At least one result Message schema is required. The Stream's emission
 * type is `Schema.Schema.Type<Results[number]>`; without a declared
 * result, the factory would have to return `Stream<never>`, leaving
 * `update` with no record of the work and removing DevTools, Scene,
 * and time-travel replay's reference point. Fire-and-forget Mounts
 * follow the same convention as fire-and-forget Commands: declare a
 * `Completed*` result Message that `update` no-ops on. The side
 * effect stays observable; `update` simply has nothing meaningful to
 * do with the acknowledgment. Re-check the cause.
 *
 * Two forms, distinguished by whether the second argument is a Schema or a
 * record of Schemas (the args declaration). Cleanup timing relative to
 * snabbdom's `destroy` hook is the same as `Mount.define` (asynchronous via
 * `Fiber.interrupt`).
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
 *   ScrolledSidebar,
 * )(element =>
 *   Stream.callback<typeof ScrolledSidebar.Type>(queue =>
 *     Effect.gen(function* () {
 *       yield* Effect.acquireRelease(
 *         Effect.sync(() => {
 *           const handler = () =>
 *             Queue.offerUnsafe(
 *               queue,
 *               ScrolledSidebar({ scroll: element.scrollTop }),
 *             )
 *           element.addEventListener('scroll', handler, { passive: true })
 *           return handler
 *         }),
 *         handler =>
 *           Effect.sync(() =>
 *             element.removeEventListener('scroll', handler),
 *           ),
 *       )
 *       return yield* Effect.never
 *     }),
 *   ),
 * )
 * ```
 *
 * @example IntersectionObserver events
 * ```ts
 * const ObserveHeroVisibility = Mount.defineStream(
 *   'ObserveHeroVisibility',
 *   ChangedHeroVisibility,
 * )(element =>
 *   Stream.callback<typeof ChangedHeroVisibility.Type>(queue =>
 *     Effect.gen(function* () {
 *       yield* Effect.acquireRelease(
 *         Effect.sync(() => {
 *           const observer = new IntersectionObserver(entries => {
 *             pipe(
 *               Array.head(entries),
 *               Option.match({
 *                 onNone: Function.constVoid,
 *                 onSome: entry =>
 *                   Queue.offerUnsafe(
 *                     queue,
 *                     ChangedHeroVisibility({
 *                       isVisible: entry.isIntersecting,
 *                     }),
 *                   ),
 *               }),
 *             )
 *           })
 *           observer.observe(element)
 *           return observer
 *         }),
 *         observer => Effect.sync(() => observer.disconnect()),
 *       )
 *       return yield* Effect.never
 *     }),
 *   ),
 * )
 * ```
 *
 * The args-captured-at-mount and Subscriptions-vs-Mount guidance from
 * `Mount.define` apply identically here. See that constructor's docs for
 * the mental model.
 */
export function defineStream<
  const Name extends string,
  Results extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
>(
  name: Name,
  ...results: Results
): (
  factory: (
    element: Element,
  ) => Stream.Stream<Schema.Schema.Type<Results[number]>, never, never>,
) => MountDefinitionNoArgs<Name, Schema.Schema.Type<Results[number]>>

export function defineStream<
  const Name extends string,
  Fields extends Schema.Struct.Fields,
  Results extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
>(
  name: Name,
  args: Fields,
  ...results: Results
): (
  factoryBuilder: (
    args: Schema.Schema.Type<Schema.Struct<Fields>>,
  ) => (
    element: Element,
  ) => Stream.Stream<Schema.Schema.Type<Results[number]>, never, never>,
) => MountDefinitionWithArgs<Name, Fields, Schema.Schema.Type<Results[number]>>

export function defineStream(
  name: string,
  ...rest: ReadonlyArray<unknown>
): unknown {
  const [maybeArgs] = rest

  const isArgsRecord =
    Predicate.isObject(maybeArgs) && !Schema.isSchema(maybeArgs)

  if (isArgsRecord) {
    return (
      factoryBuilder: (
        args: any,
      ) => (element: Element) => Stream.Stream<any, any, any>,
    ): MountDefinitionWithArgs<string, any, any> => {
      const definition = (args: any) => ({
        name,
        args,
        f: factoryBuilder(args),
      })
      Object.defineProperty(definition, 'name', {
        value: name,
        configurable: true,
      })
      Object.defineProperty(definition, MountDefinitionTypeId, {
        value: MountDefinitionTypeId,
      })
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      return definition as MountDefinitionWithArgs<string, any, any>
    }
  }

  return (
    factory: (element: Element) => Stream.Stream<any, any, any>,
  ): MountDefinitionNoArgs<string, any> => {
    const definition = () => ({ name, f: factory })
    Object.defineProperty(definition, 'name', {
      value: name,
      configurable: true,
    })
    Object.defineProperty(definition, MountDefinitionTypeId, {
      value: MountDefinitionTypeId,
    })
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return definition as MountDefinitionNoArgs<string, any>
  }
}

/** Lifts a `MountAction` from one Message universe to another by mapping its
 *  dispatched Messages through a transform. Used by Submodel components to
 *  emit lifecycle action results into the parent's Message union via the
 *  consumer-supplied `toParentMessage` lift. Preserves `name` and `args`. */
export const mapMessage: {
  <A, B>(
    f: (message: A) => B,
  ): <E>(action: MountAction<A, E>) => MountAction<B, E>
  <A, B, E>(action: MountAction<A, E>, f: (message: A) => B): MountAction<B, E>
} = Function.dual(
  2,
  <A, B, E>(
    action: MountAction<A, E>,
    f: (message: A) => B,
  ): MountAction<B, E> => ({
    ...action,
    f: (element: Element) => action.f(element).pipe(Stream.map(f)),
  }),
)
