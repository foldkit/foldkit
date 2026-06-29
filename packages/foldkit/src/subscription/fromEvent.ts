import { Effect, Queue, Stream } from 'effect'

/**
 * Configuration for the `fromEvent` Stream helper.
 *
 * `target` is read inside the acquire Effect, never before it, so the
 * resolved `EventTarget` is captured at the moment the Subscription's scope
 * opens. Pass a thunk when the target may not exist until the scope opens, or
 * pass the `EventTarget` directly for always-present globals like `window` or
 * `document`.
 *
 * `toMessage(event)` transforms each dispatched event into a Message. The
 * mapper runs synchronously in the same call stack as the browser's event
 * dispatch, so calling `event.preventDefault()` inside it works as expected.
 */
export type FromEventConfig<EventType extends Event, Message> = Readonly<{
  target: EventTarget | (() => EventTarget)
  type: string
  toMessage: (event: EventType) => Message
  options?: AddEventListenerOptions
}>

const resolveTarget = (
  target: EventTarget | (() => EventTarget),
): EventTarget => (typeof target === 'function' ? target() : target)

/**
 * Build a Stream that emits a Message for every dispatch of a DOM event,
 * registering the listener when the Stream's scope opens and removing it when
 * the scope closes.
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
 *   shortcut: entry(
 *     { isListening: S.Boolean },
 *     {
 *       modelToDependencies: model => ({ isListening: model.isListening }),
 *       dependenciesToStream: ({ isListening }) =>
 *         Stream.when(
 *           Subscription.fromEvent<KeyboardEvent, Message>({
 *             target: window,
 *             type: 'keydown',
 *             toMessage: event => PressedKey({ key: event.key }),
 *           }),
 *           Effect.sync(() => isListening),
 *         ),
 *     },
 *   ),
 * }))
 * ```
 */
export const fromEvent = <EventType extends Event, Message>(
  config: FromEventConfig<EventType, Message>,
): Stream.Stream<Message> =>
  Stream.callback<Message>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const target = resolveTarget(config.target)

        const handleEvent = (event: Event): void => {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          Queue.offerUnsafe(queue, config.toMessage(event as EventType))
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
