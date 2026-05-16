import { Context, Function, Predicate, Schema, Stream } from 'effect'

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
 *  Stream's scope and runs any registered `acquireRelease` finalizers. */
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

/** A Mount definition created with `Mount.define`. Union over the no-args and
 *  with-args shapes; consumers that only need name/identity can accept this. */
export type MountDefinition<
  Name extends string = string,
  ResultMessage = any,
> =
  | MountDefinitionNoArgs<Name, ResultMessage>
  | MountDefinitionWithArgs<Name, any, ResultMessage>

/**
 * Defines a Mount. Two forms, distinguished by whether the second argument is
 * a Schema (a result message) or a record of Schemas (the args declaration).
 *
 * The factory (or factory builder) is bound at definition time. The returned
 * Definition is callable: with no args for a Mount that doesn't declare any,
 * or with the declared args record otherwise. The factory must return a
 * `Stream<Message>` whose lifetime is bound to the element's lifetime: each
 * emitted Message is dispatched, and the Stream's scope is closed (running
 * any registered `acquireRelease` finalizers or `Stream.async` cleanup
 * Effects) when the element unmounts.
 *
 * @example Streaming (continuous scroll events from an element)
 * ```ts
 * const ListenSidebarScroll = Mount.define(
 *   'ListenSidebarScroll',
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
 * @example One-shot, no cleanup (focus on appearance)
 * ```ts
 * const FocusInput = Mount.define('FocusInput', CompletedFocusInput)(element =>
 *   Stream.fromEffect(
 *     Effect.sync(() => {
 *       if (element instanceof HTMLInputElement) element.focus()
 *       return CompletedFocusInput()
 *     }),
 *   ),
 * )
 * ```
 *
 * @example One-shot with cleanup (portal-to-body)
 * ```ts
 * const PortalToBody = Mount.define('PortalToBody', CompletedPortalToBody)(
 *   element =>
 *     Stream.callback<typeof CompletedPortalToBody.Type>(queue =>
 *       Effect.gen(function* () {
 *         yield* Effect.acquireRelease(
 *           Effect.sync(() => {
 *             document.body.appendChild(element)
 *             Queue.offerUnsafe(queue, CompletedPortalToBody())
 *           }),
 *           () => Effect.sync(() => element.remove()),
 *         )
 *         return yield* Effect.never
 *       }),
 *     ),
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
 *   Stream.callback<typeof CompletedAnchorPopover.Type>(queue =>
 *     Effect.gen(function* () {
 *       yield* Effect.acquireRelease(
 *         Effect.sync(() => {
 *           const cleanup = anchorSetup({ buttonId, anchor })(element)
 *           Queue.offerUnsafe(queue, CompletedAnchorPopover())
 *           return cleanup
 *         }),
 *         cleanup => Effect.sync(cleanup),
 *       )
 *       return yield* Effect.never
 *     }),
 *   ),
 * )
 * ```
 */
export function define<
  const Name extends string,
  Results extends ReadonlyArray<Schema.Top>,
>(
  name: Name,
  ...results: Results
): (
  factory: (
    element: Element,
  ) => Stream.Stream<Schema.Schema.Type<Results[number]>, never, never>,
) => MountDefinitionNoArgs<Name, Schema.Schema.Type<Results[number]>>

export function define<
  const Name extends string,
  Fields extends Schema.Struct.Fields,
  Results extends ReadonlyArray<Schema.Top>,
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

export function define(name: string, ...rest: ReadonlyArray<unknown>): unknown {
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
