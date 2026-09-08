import { Match, Option, pipe } from 'effect'

/** Context passed to the `viewTransition` predicate before each live render.
 *
 *  A View Transition animates between two states, so the predicate is given
 *  both. `previousModel` is the Model behind the DOM on screen, the state the
 *  browser is about to snapshot. `model` is the Model the pending render will
 *  paint. Direction is the pair: comparing the two says where the application
 *  is going and where it came from, with no route history kept in the Model.
 *
 *  `previousModel` is always a real painted state rather than an `Option`. The
 *  predicate only runs once a Message has dirtied the Model, and the initial
 *  render completes before any Message is processed.
 *
 *  `message` is the Message that dirtied the Model for this frame. The runtime
 *  coalesces a burst of dispatches into one render frame, so the predicate
 *  sees the last dirtying Message before the frame. */
export type ViewTransitionContext<Model, Message> = Readonly<{
  previousModel: Model
  model: Model
  message: Message
}>

/** What the `viewTransition` predicate returns for a render. `false` renders
 *  plainly. `true` wraps the render in `document.startViewTransition`.
 *  `{ types }` additionally tags the transition so CSS can scope animations
 *  via `:active-view-transition-type(...)`. */
export type ViewTransitionDecision =
  | boolean
  | Readonly<{ types: ReadonlyArray<string> }>

/** Decides, per render, whether the DOM update should run inside a View
 *  Transition. The predicate is total over the Message union, so animation is
 *  opted into per Message: return `true` for the ones worth animating and
 *  `false` for everything else. */
export type ViewTransitionConfig<Model, Message> = (
  context: ViewTransitionContext<Model, Message>,
) => ViewTransitionDecision

/** The slice of the DOM `ViewTransition` handle the runtime consumes. `ready`
 *  and `finished` are optional: the runtime only ever attaches rejection
 *  handlers to them, so a handle that omits them stays valid. */
export type ViewTransitionHandle = Readonly<{
  updateCallbackDone: Promise<void>
  skipTransition: () => void
  ready?: Promise<void>
  finished?: Promise<void>
}>

/**
 * Attaches no-op rejection handlers to a transition's promises.
 *
 * The browser rejects `ready` whenever a transition is skipped, and skipping
 * is routine rather than exceptional: a second navigation lands mid-animation,
 * the document is hidden, or the runtime skips the transition itself while
 * tearing down. The runtime never awaits any of these promises, so without a
 * handler every skip surfaces as an unhandled rejection and lands in whatever
 * the application wired to `window.onunhandledrejection`, turning a purely
 * cosmetic animation into an error report.
 */
export const __silenceViewTransitionRejections = (
  handle: ViewTransitionHandle,
): void => {
  const ignore = (): void => {}
  handle.ready?.catch(ignore)
  handle.finished?.catch(ignore)
  handle.updateCallbackDone.catch(ignore)
}

/** Starts a View Transition around `update`. Injected into the render path so
 *  tests can fake the browser API. */
export type StartViewTransition = (
  update: () => void,
  maybeTypes: Option.Option<ReadonlyArray<string>>,
) => ViewTransitionHandle

/** Feature-detects `document.startViewTransition`, returning `Option.none()`
 *  where the API is unavailable so the runtime falls through to plain
 *  renders. Transition types are newer than the API itself, so when the
 *  running browser only supports the callback form the types are dropped and
 *  the transition still runs untyped. */
export const __resolveStartViewTransition =
  (): Option.Option<StartViewTransition> => {
    if (typeof document.startViewTransition !== 'function') {
      return Option.none()
    }

    const isTypesSupported =
      typeof ViewTransition !== 'undefined' &&
      'types' in ViewTransition.prototype

    return Option.some((update, maybeTypes) =>
      pipe(
        maybeTypes,
        Option.filter(() => isTypesSupported),
        Option.match({
          onNone: () => document.startViewTransition(update),
          onSome: types =>
            document.startViewTransition({ update, types: [...types] }),
        }),
      ),
    )
  }

/** Normalizes a `ViewTransitionDecision` into "skip" (`Option.none()`) or
 *  "transition, with these types" so the render path branches once. */
export const __decideViewTransition = <Model, Message>(
  decide: ViewTransitionConfig<Model, Message>,
  context: ViewTransitionContext<Model, Message>,
): Option.Option<
  Readonly<{ maybeTypes: Option.Option<ReadonlyArray<string>> }>
> =>
  Match.value(decide(context)).pipe(
    Match.withReturnType<
      Option.Option<
        Readonly<{ maybeTypes: Option.Option<ReadonlyArray<string>> }>
      >
    >(),
    Match.when(false, () => Option.none()),
    Match.when(true, () => Option.some({ maybeTypes: Option.none() })),
    Match.orElse(({ types }) =>
      Option.some({ maybeTypes: Option.some(types) }),
    ),
  )
