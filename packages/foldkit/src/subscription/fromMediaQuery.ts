import { Effect, Queue, Stream } from 'effect'

/**
 * Options for `fromMediaQuery`.
 *
 * `query` accepts any media query string supported by `window.matchMedia`,
 * such as `'(prefers-reduced-motion: reduce)'`,
 * `'(prefers-color-scheme: dark)'`, or a viewport breakpoint like
 * `'(max-width: 1023px)'`. `window.matchMedia` is called when the Stream
 * starts, not when the Stream is created.
 *
 * `mapMatches` converts the Boolean `matches` result into each value the Stream
 * emits.
 *
 * The return type of `mapMatches` determines the Stream's output type.
 * `Subscription.make` checks that output against the application's Message
 * type.
 */
export type FromMediaQueryConfig<Output> = Readonly<{
  query: string
  mapMatches: (isMatching: boolean) => Output
}>

/**
 * Creates a Stream from a CSS media query. When the Stream starts, it emits the
 * current `matches` value through `mapMatches`. It emits again whenever that
 * value changes. Stopping the Stream removes the listener.
 *
 * The Stream reads the current value again each time it restarts. Suppose a
 * color-scheme Subscription runs only while the theme preference is `System`.
 * The user selects `Dark`, changes the operating system to a light theme, and
 * then selects `System` again. A new `change` listener waits for the next
 * change, so the Model still records a dark system theme. This helper emits the
 * current light value as soon as the Stream restarts.
 *
 * Creating the Stream does not access `window`; `window.matchMedia` is called
 * only when the Stream starts. The Stream can therefore be created during
 * server rendering as long as it runs only in the browser.
 *
 * This helper returns a Stream, not a Subscription entry. Pass it to
 * `Subscription.persistent` for a query the application always follows. To
 * follow the query only in a particular Model state, use it with `Stream.when`
 * inside a `Subscription.make` entry.
 *
 * @example
 * ```typescript
 * const subscriptions = Subscription.make<Model, Message>()(_entry => ({
 *   reducedMotion: Subscription.persistent(
 *     Subscription.fromMediaQuery({
 *       query: '(prefers-reduced-motion: reduce)',
 *       mapMatches: isMatching =>
 *         Message.ChangedReducedMotion({ isReducedMotion: isMatching }),
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
