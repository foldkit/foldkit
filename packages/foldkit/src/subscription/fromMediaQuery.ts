import { Effect, Queue, Stream } from 'effect'

/**
 * Configuration for the `fromMediaQuery` Stream helper.
 *
 * `query` is any media query string `window.matchMedia` accepts, such as
 * `'(prefers-reduced-motion: reduce)'`, `'(prefers-color-scheme: dark)'`, or
 * a viewport breakpoint like `'(max-width: 1023px)'`. It is resolved inside
 * the acquire Effect, never before it, so building the Stream touches no
 * browser global.
 *
 * `mapMatches(isMatching)` turns the query's current answer into a Stream
 * value. It runs once when the scope opens with the value at that moment,
 * then once per `change` event.
 *
 * The output type is inferred from the mapper; `Subscription.make` checks
 * that the final Stream emits the application's Message type.
 */
export type FromMediaQueryConfig<Output> = Readonly<{
  query: string
  mapMatches: (isMatching: boolean) => Output
}>

/**
 * Build a Stream that answers a media query: it emits the current `matches`
 * value when the Stream's scope opens and emits again on every `change`,
 * registering the listener when the scope opens and removing it when the
 * scope closes.
 *
 * The initial emission is what sets this apart from listening to the
 * `MediaQueryList`'s `change` event with `fromEvent`. `change` fires only on
 * transitions, so a listener alone never learns the value in effect when it
 * starts, and an application ends up reading `matches` separately at boot.
 * This helper reads it for you. That read also happens every time the Stream
 * restarts, so an entry gated on the Model picks up whatever changed while
 * the gate was closed instead of keeping the value it last saw.
 *
 * `window.matchMedia(query)` is called inside the acquire Effect, so building
 * the Stream at module load or during server rendering touches no browser
 * global. The listener lifecycle uses `Effect.acquireRelease`, with
 * `addEventListener` inside the acquire body and `removeEventListener`
 * registered only after acquire completes, so the listener never leaks on
 * interruption.
 *
 * This is a Stream, not a Subscription entry. Wrap it with
 * `Subscription.persistent` for a query the application follows for its
 * whole lifetime, or plug it into a `Subscription.make` entry's
 * `dependenciesToStream` behind `Stream.when` to gate it on a Model
 * condition.
 *
 * @example
 * ```typescript
 * const subscriptions = Subscription.make<Model, Message>()(_entry => ({
 *   reducedMotion: Subscription.persistent(
 *     Subscription.fromMediaQuery({
 *       query: '(prefers-reduced-motion: reduce)',
 *       mapMatches: isMatching =>
 *         Message.ChangedReducedMotion({ isReduced: isMatching }),
 *     }),
 *   ),
 * }))
 * ```
 */
export const fromMediaQuery = <Output>(
  config: FromMediaQueryConfig<Output>,
): Stream.Stream<Output> =>
  Stream.callback<Output>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const mediaQueryList = window.matchMedia(config.query)

        const handleChange = (event: MediaQueryListEvent): void => {
          Queue.offerUnsafe(queue, config.mapMatches(event.matches))
        }

        Queue.offerUnsafe(queue, config.mapMatches(mediaQueryList.matches))
        mediaQueryList.addEventListener('change', handleChange)
        return { mediaQueryList, handleChange }
      }),
      ({ mediaQueryList, handleChange }) =>
        Effect.sync(() => {
          mediaQueryList.removeEventListener('change', handleChange)
        }),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )
