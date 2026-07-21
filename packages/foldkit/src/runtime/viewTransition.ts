import { Match, Option, pipe } from 'effect'

/** Context passed to the `viewTransition` predicate before each live render.
 *  `message` is the Message that dirtied the Model for this frame. The runtime
 *  coalesces a burst of dispatches into one render frame, so the predicate
 *  sees the last dirtying Message before the frame. */
export type ViewTransitionContext<Model, Message> = Readonly<{
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
 *  Transition. "Animate route changes but not keystrokes" is a predicate on
 *  the Message: match on `context.message._tag` and return `false` for
 *  everything that should stay a plain render. */
export type ViewTransitionConfig<Model, Message> = (
  context: ViewTransitionContext<Model, Message>,
) => ViewTransitionDecision

/** The slice of the DOM `ViewTransition` handle the runtime consumes. */
export type ViewTransitionHandle = Readonly<{
  updateCallbackDone: Promise<void>
  skipTransition: () => void
}>

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
