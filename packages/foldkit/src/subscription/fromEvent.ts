import { Effect, Option, Queue, Stream } from 'effect'

declare const EventMapMarker: unique symbol

/**
 * An `EventTarget` that declares the events it dispatches, so the `fromEvent`
 * helpers can resolve an event name to its event type the way they do for
 * `window`, `document`, and the DOM interfaces lib.dom declares event maps
 * for.
 *
 * Annotate a target with this and the mapper's parameter follows from the
 * event name, including a `CustomEvent`'s `detail`. A declared event overrides
 * the corresponding native event and otherwise augments the target's native
 * events, so an element that dispatches custom events can be annotated without
 * losing events such as `click`. Any `EventTarget` is assignable to it, so the
 * annotation is the only change needed.
 *
 * @example
 * ```ts
 * const slowWarningTarget: Subscription.TypedEventTarget<{
 *   'foldkit:slow-warning': CustomEvent<SlowWarningReport>
 * }> = new EventTarget()
 * ```
 */
export interface TypedEventTarget<
  EventMap extends { readonly [Type in keyof EventMap]: Event },
> extends EventTarget {
  readonly [EventMapMarker]?: EventMap
}

type EventMapMarkerKey = typeof EventMapMarker

// NOTE: the optional marker keeps every EventTarget assignable, so checking
// whether the marker is a key distinguishes an annotation from a bare target.
type DeclaredEventMap<Target> = EventMapMarkerKey extends keyof Target
  ? NonNullable<Target[EventMapMarkerKey & keyof Target]>
  : never

type EventFromHandler<Handler> =
  NonNullable<Handler> extends (
    event: infer EventType,
    ...args: ReadonlyArray<unknown>
  ) => unknown
    ? EventType extends Event
      ? EventType
      : never
    : never

type EventMapFromHandlers<Target> = {
  readonly [
    Key in keyof Target as Key extends `on${infer Type}`
      ? [EventFromHandler<Target[Key]>] extends [never]
        ? never
        : Type
      : never
  ]: EventFromHandler<Target[Key]>
}

type OverrideEventMap<Base, Declared> = Omit<Base, keyof Declared> & Declared

// NOTE: order the lib.dom Element maps most specific first so inherited
// interfaces do not hide a target's more precise map.
type ElementEventMapOf<Target> = Target extends HTMLVideoElement
  ? HTMLVideoElementEventMap
  : Target extends HTMLMediaElement
    ? HTMLMediaElementEventMap
    : Target extends HTMLBodyElement
      ? HTMLBodyElementEventMap
      : Target extends HTMLFrameSetElement
        ? HTMLFrameSetElementEventMap
        : Target extends HTMLElement
          ? HTMLElementEventMap
          : Target extends MathMLElement
            ? MathMLElementEventMap
            : Target extends SVGSVGElement
              ? SVGSVGElementEventMap
              : Target extends SVGElement
                ? SVGElementEventMap
                : Target extends Element
                  ? ElementEventMap & GlobalEventHandlersEventMap
                  : never

type NativeEventMapOf<Target> = Target extends Window
  ? WindowEventMap
  : Target extends Document
    ? DocumentEventMap
    : Target extends XMLHttpRequest
      ? XMLHttpRequestEventMap
      : Target extends XMLHttpRequestEventTarget
        ? XMLHttpRequestEventTargetEventMap
        : [ElementEventMapOf<Target>] extends [never]
          ? EventMapFromHandlers<Target>
          : ElementEventMapOf<Target>

type EventMapOfMember<Target> = [DeclaredEventMap<Target>] extends [never]
  ? [keyof NativeEventMapOf<Target>] extends [never]
    ? Readonly<Record<string, Event>>
    : NativeEventMapOf<Target>
  : [keyof NativeEventMapOf<Target>] extends [never]
    ? DeclaredEventMap<Target>
    : OverrideEventMap<NativeEventMapOf<Target>, DeclaredEventMap<Target>>

type EventMapOf<Target> = Target extends unknown
  ? EventMapOfMember<Target>
  : never

type EventTypeOf<Target> = keyof EventMapOf<Target> & string

type EventOf<
  Target,
  Type extends EventTypeOf<Target>,
> = Type extends keyof EventMapOf<Target>
  ? EventMapOf<Target>[Type] extends infer Resolved extends Event
    ? Resolved
    : Event
  : Event

type PreventDefaultEventListenerOptions = Omit<
  AddEventListenerOptions,
  'passive'
> &
  Readonly<{ passive?: false }>

/**
 * Configuration for the `fromEvent` Stream helper.
 *
 * `target` is read inside the acquire Effect, never before it, so the
 * resolved `EventTarget` is captured at the moment the Subscription's scope
 * opens. Pass a thunk when the target may not exist until the scope opens, or
 * pass the `EventTarget` directly for always-present globals like `window` or
 * `document`.
 *
 * `type` is constrained to the event names the target declares, and
 * `toMessage`'s parameter is the event those two resolve to. Annotating that
 * parameter is checked against the resolved event rather than replacing it.
 *
 * `toMessage(event)` transforms each dispatched event into a Message. The
 * mapper runs synchronously in the same call stack as the browser's event
 * dispatch, so calling `event.preventDefault()` inside it takes effect,
 * unless the listener is passive. Some browsers default wheel and touch
 * listeners on global targets to passive, where `preventDefault()` is
 * ignored. Pass `options: { passive: false }` explicitly when cancelling
 * those events, or reach for `fromEventFilterMapPreventDefault`, which does
 * so for you.
 */
export type FromEventConfig<
  Target extends EventTarget,
  Type extends EventTypeOf<Target>,
  Message,
> = Readonly<{
  target: Target | (() => Target)
  type: Type
  toMessage: (event: EventOf<Target, Type>) => Message
  options?: AddEventListenerOptions
}>

/**
 * Configuration for the `fromEventFilterMap` Stream helper.
 *
 * `target` is read inside the acquire Effect, never before it, so the
 * resolved `EventTarget` is captured at the moment the Subscription's scope
 * opens. Pass a thunk when the target may not exist until the scope opens, or
 * pass the `EventTarget` directly for always-present globals like `window` or
 * `document`.
 *
 * `type` is constrained to the event names the target declares, and
 * `toMessage`'s parameter is the event those two resolve to. Annotating that
 * parameter is checked against the resolved event rather than replacing it.
 *
 * `toMessage(event)` returns `Option.some(message)` to emit a Message for the
 * event, or `Option.none()` to ignore it. The mapper runs synchronously in the
 * same call stack as the browser's event dispatch, so calling
 * `event.preventDefault()` inside it takes effect, unless the listener is
 * passive. Some browsers default wheel and touch listeners on global targets
 * to passive, where `preventDefault()` is ignored. Pass
 * `options: { passive: false }` explicitly when cancelling those events, or
 * reach for `fromEventFilterMapPreventDefault`, which does so for you.
 */
export type FromEventFilterMapConfig<
  Target extends EventTarget,
  Type extends EventTypeOf<Target>,
  Message,
> = Readonly<{
  target: Target | (() => Target)
  type: Type
  toMessage: (event: EventOf<Target, Type>) => Option.Option<Message>
  options?: AddEventListenerOptions
}>

type ListenerConfig<EventType extends Event, Message> = Readonly<{
  target: EventTarget | (() => EventTarget)
  type: string
  toMessage: (event: EventType) => Option.Option<Message>
  options?: AddEventListenerOptions
}>

const resolveTarget = (
  target: EventTarget | (() => EventTarget),
): EventTarget => (typeof target === 'function' ? target() : target)

const listen = <EventType extends Event, Message>(
  config: ListenerConfig<EventType, Message>,
): Stream.Stream<Message> =>
  Stream.callback<Message>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const target = resolveTarget(config.target)

        const handleEvent = (event: Event): void => {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          const maybeMessage = config.toMessage(event as EventType)
          if (Option.isSome(maybeMessage)) {
            Queue.offerUnsafe(queue, maybeMessage.value)
          }
        }

        target.addEventListener(config.type, handleEvent, config.options)
        return { target, handleEvent }
      }),
      ({ target, handleEvent }) =>
        Effect.sync(() => {
          target.removeEventListener(config.type, handleEvent, config.options)
        }),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )

/**
 * Configuration for the `fromEventFilterMapPreventDefault` Stream helper.
 *
 * `target` is read inside the acquire Effect, never before it, so the
 * resolved `EventTarget` is captured at the moment the Subscription's scope
 * opens. Pass a thunk when the target may not exist until the scope opens, or
 * pass the `EventTarget` directly for always-present globals like `window` or
 * `document`.
 *
 * `type` is constrained to the event names the target declares, and
 * `toMessage`'s parameter is the event those two resolve to. Annotating that
 * parameter is checked against the resolved event rather than replacing it.
 *
 * `toMessage(event)` returns `Option.some(message)` to mark the dispatch
 * handled, or `Option.none()` to leave the default behavior intact. For a
 * handled dispatch the helper calls `event.preventDefault()` and queues the
 * Message before the listener returns; the mapper itself never calls
 * `preventDefault()`.
 *
 * `options.passive` defaults to `false` so `preventDefault()` keeps working
 * for the events browsers would otherwise register as passive. The config
 * rejects `passive: true`; the runtime guard also throws for unchecked
 * JavaScript inputs.
 */
export type FromEventFilterMapPreventDefaultConfig<
  Target extends EventTarget,
  Type extends EventTypeOf<Target>,
  Message,
> = Readonly<{
  target: Target | (() => Target)
  type: Type
  toMessage: (event: EventOf<Target, Type>) => Option.Option<Message>
  options?: PreventDefaultEventListenerOptions
}>

/**
 * Build a Stream that emits a Message for the dispatches of a DOM event the
 * mapper chooses to keep, registering the listener when the Stream's scope
 * opens and removing it when the scope closes.
 *
 * This is the filtered variant of `fromEvent`. Its `toMessage` returns
 * `Option.some(message)` to emit and `Option.none()` to ignore the event, so a
 * single listener can react to some dispatches while passing on the rest. A
 * mapper that never emits produces a `Stream<never>`, which composes wherever
 * a Message-producing Stream is expected.
 *
 * Reach for this over a downstream `Stream.filterMap` whenever the decision to
 * keep an event is paired with `event.preventDefault()`. The mapper runs
 * synchronously inside the browser's event dispatch, so `preventDefault()`
 * takes effect, while a downstream filter would run on a later turn after the
 * default action has already happened. The exception is a passive listener,
 * which ignores `preventDefault()`. Some browsers default wheel and touch
 * listeners on global targets to passive. Pass
 * `options: { passive: false }` explicitly when cancelling those events, or
 * reach for `fromEventFilterMapPreventDefault`, which does so for you.
 *
 * The target, the event name, and the event the mapper receives are one fact:
 * `type` is constrained to the names the target declares, and the mapper's
 * parameter is what those two resolve to, so annotating it narrows nothing and
 * cannot contradict the name. A target that is neither annotated nor one
 * lib.dom declares a map for accepts any name and reports `Event`; annotate it
 * with {@link TypedEventTarget} to resolve its own events.
 *
 * The listener lifecycle uses `Effect.acquireRelease`. The `addEventListener`
 * call happens inside the acquire Effect, and the matching
 * `removeEventListener` is registered only after acquire completes, so the
 * listener never leaks on interruption.
 *
 * This is a Stream, not a Subscription entry. Wrap it with
 * `Subscription.persistent` for a listener whose lifetime spans the whole
 * Subscriptions record, or plug it into a `Subscription.make` entry's
 * `dependenciesToStream` (typically behind `Stream.when`) to gate it on a
 * Model condition.
 *
 * @example
 * ```typescript
 * const subscriptions = Subscription.make<Model, Message>()(entry => ({
 *   escapeKey: entry(
 *     { isListening: Schema.Boolean },
 *     {
 *       modelToDependencies: model => ({ isListening: model.isListening }),
 *       dependenciesToStream: ({ isListening }) =>
 *         Stream.when(
 *           Subscription.fromEventFilterMap({
 *             target: window,
 *             type: 'keydown',
 *             toMessage: event =>
 *               event.key === 'Escape'
 *                 ? Option.some(Message.PressedEscape())
 *                 : Option.none(),
 *           }),
 *           Effect.sync(() => isListening),
 *         ),
 *     },
 *   ),
 * }))
 * ```
 */
export const fromEventFilterMap = <
  Target extends EventTarget,
  Type extends EventTypeOf<Target>,
  Message,
>(
  config: FromEventFilterMapConfig<Target, Type, Message>,
): Stream.Stream<Message> => listen<EventOf<Target, Type>, Message>(config)

/**
 * Build a Stream that emits a Message for every dispatch of a DOM event,
 * registering the listener when the Stream's scope opens and removing it when
 * the scope closes.
 *
 * The target, the event name, and the event the mapper receives are one fact:
 * `type` is constrained to the names the target declares, and the mapper's
 * parameter is what those two resolve to, so annotating it narrows nothing and
 * cannot contradict the name. A target that is neither annotated nor one
 * lib.dom declares a map for accepts any name and reports `Event`; annotate it
 * with {@link TypedEventTarget} to resolve its own events.
 *
 * The listener lifecycle uses `Effect.acquireRelease`. The `addEventListener`
 * call happens inside the acquire Effect, and the matching
 * `removeEventListener` is registered only after acquire completes, so the
 * listener never leaks on interruption.
 *
 * This is a Stream, not a Subscription entry. Wrap it with
 * `Subscription.persistent` for a listener whose lifetime spans the whole
 * Subscriptions record, or plug it into a `Subscription.make` entry's
 * `dependenciesToStream` (typically behind `Stream.when`) to gate it on a
 * Model condition.
 *
 * For a listener that reacts to only some events, reach for
 * `fromEventFilterMap`, whose mapper returns `Option<Message>`. For a
 * listener that also cancels the default action of the events it handles,
 * reach for `fromEventFilterMapPreventDefault`.
 *
 * @example
 * ```typescript
 * const subscriptions = Subscription.make<Model, Message>()(entry => ({
 *   shortcut: entry(
 *     { isListening: Schema.Boolean },
 *     {
 *       modelToDependencies: model => ({ isListening: model.isListening }),
 *       dependenciesToStream: ({ isListening }) =>
 *         Stream.when(
 *           Subscription.fromEvent({
 *             target: window,
 *             type: 'keydown',
 *             toMessage: event => Message.PressedKey({ key: event.key }),
 *           }),
 *           Effect.sync(() => isListening),
 *         ),
 *     },
 *   ),
 * }))
 * ```
 */
export const fromEvent = <
  Target extends EventTarget,
  Type extends EventTypeOf<Target>,
  Message,
>(
  config: FromEventConfig<Target, Type, Message>,
): Stream.Stream<Message> =>
  listen<EventOf<Target, Type>, Message>({
    ...config,
    toMessage: event => Option.some(config.toMessage(event)),
  })

/**
 * Build a Stream that emits a Message for the dispatches of a DOM event the
 * mapper marks handled, calling `event.preventDefault()` on each of them,
 * registering the listener when the Stream's scope opens and removing it when
 * the scope closes.
 *
 * This is the cancelling variant of `fromEventFilterMap`, mirroring
 * `h.OnKeyDownPreventDefault` from `foldkit/html`. Its `toMessage` returns
 * `Option.some(message)` to mark a dispatch handled. The helper evaluates the
 * mapper, calls `event.preventDefault()`, and queues the Message before the
 * native listener returns. `Option.none()` leaves the default behavior intact.
 * The mapper never calls `preventDefault()` itself.
 *
 * Because cancelling is the point, the listener registers with
 * `passive: false` when the config does not say otherwise. This keeps wheel
 * and touch events cancelable when a browser would otherwise make listeners
 * on a global target passive. The config rejects `passive: true`; the runtime
 * guard also throws for unchecked JavaScript inputs.
 *
 * The target, event name, and mapper parameter are one fact: `type` is
 * constrained to the names the target declares, and the mapper receives the
 * event those two resolve to. A target with no declared event map accepts any
 * name and reports `Event`; annotate it with {@link TypedEventTarget} to
 * resolve its own events.
 *
 * The listener lifecycle uses `Effect.acquireRelease`. The `addEventListener`
 * call happens inside the acquire Effect, and the matching
 * `removeEventListener` is registered only after acquire completes, so the
 * listener never leaks on interruption.
 *
 * This is a Stream, not a Subscription entry. Wrap it with
 * `Subscription.persistent` for a listener whose lifetime spans the whole
 * Subscriptions record, or plug it into a `Subscription.make` entry's
 * `dependenciesToStream` (typically behind `Stream.when`) to gate it on a
 * Model condition.
 *
 * @example
 * ```typescript
 * const subscriptions = Subscription.make<Model, Message>()(entry => ({
 *   wheelLock: entry(
 *     { isModalOpen: Schema.Boolean },
 *     {
 *       modelToDependencies: model => ({ isModalOpen: model.isModalOpen }),
 *       dependenciesToStream: ({ isModalOpen }) =>
 *         Stream.when(
 *           Subscription.fromEventFilterMapPreventDefault({
 *             target: window,
 *             type: 'wheel',
 *             toMessage: () => Option.some(Message.SuppressedWheelScroll()),
 *           }),
 *           Effect.sync(() => isModalOpen),
 *         ),
 *     },
 *   ),
 * }))
 * ```
 */
export const fromEventFilterMapPreventDefault = <
  Target extends EventTarget,
  Type extends EventTypeOf<Target>,
  Message,
>(
  config: FromEventFilterMapPreventDefaultConfig<Target, Type, Message>,
): Stream.Stream<Message> => {
  const options: AddEventListenerOptions | undefined = config.options

  if (options?.passive === true) {
    throw new Error(
      `Foldkit: \`Subscription.fromEventFilterMapPreventDefault\` was passed ` +
        `\`options: { passive: true }\` for a "${config.type}" listener. ` +
        `The helper exists to call \`event.preventDefault()\` on every ` +
        `dispatch the mapper marks handled, and a passive listener promises ` +
        `the browser the exact opposite: \`preventDefault()\` inside it is ` +
        `ignored and logs a console warning. Drop the \`passive\` option ` +
        `(the helper registers the listener with \`passive: false\` for ` +
        `you), or use \`Subscription.fromEventFilterMap\` for a listener ` +
        `that only observes.`,
    )
  }

  return fromEventFilterMap({
    ...config,
    options: { ...options, passive: false },
    toMessage: event => {
      const maybeMessage = config.toMessage(event)
      if (Option.isSome(maybeMessage)) {
        event.preventDefault()
      }
      return maybeMessage
    },
  })
}
