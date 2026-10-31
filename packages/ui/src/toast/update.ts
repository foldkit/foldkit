import {
  Array,
  Duration,
  Effect,
  Match,
  Number,
  Option,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { Command } from 'foldkit'
import * as Dom from 'foldkit/dom'
import { modifyFields } from 'foldkit/struct'

import * as Animation from '../animation/index.js'
import {
  DEFAULT_DURATION,
  DEFAULT_SWIPE_DIRECTION,
  DEFAULT_SWIPE_THRESHOLD,
  type InitConfig,
  Message,
  SWIPE_SETTLE_DURATION,
  type SwipeDirection,
  SwipeState,
  type Variant,
  makeEntry,
  makeEntryInput,
  makeMessage,
  makeModel,
  makeOutMessage,
} from './schema.js'

/** Input for a Toast's `requestShow`. `payload` is the consumer-defined
 *  content shape for an entry. Omit `duration` to use the container's
 *  `defaultDuration`; pass `sticky: true` to skip auto-dismiss entirely. */
export type ShowInput<A> = Readonly<{
  payload: A
  variant?: Variant
  duration?: Duration.Input
  sticky?: boolean
}>

const DEFAULT_VARIANT: Variant = 'Info'

/** Horizontal offset in pixels for an entry's swipe state. `Dragging`
 *  reports the distance travelled from the press point; `Dismissing` reports
 *  the offset the release left behind; `Idle` and `Settling` report zero. */
export const swipeOffset = (swipeState: SwipeState): number =>
  SwipeState.match(swipeState, {
    Idle: () => 0,
    Dragging: dragging => dragging.currentX - dragging.startX,
    Settling: settling => settling.offsetX,
    Dismissing: dismissing => dismissing.offsetX,
  })

const clampSwipeClientX = (
  startX: number,
  clientX: number,
  direction: SwipeDirection,
): number =>
  Match.value(direction).pipe(
    Match.when('Right', () => Math.max(startX, clientX)),
    Match.when('Left', () => Math.min(startX, clientX)),
    Match.exhaustive,
  )

// COMMAND

/** Waits for an entry's auto-dismiss duration, then emits a versioned
 *  `CompletedWaitBeforeDismissal` Message so update can ignore stale timers. */
export const WaitBeforeDismissal = Command.define('WaitBeforeDismissal', {
  args: {
    entryId: Schema.String,
    version: Schema.Number,
    duration: Schema.DurationFromMillis,
  },
  messages: [Message.CompletedWaitBeforeDismissal],
})

/** Waits for a short or cancelled swipe to animate back, then emits
 *  `CompletedWaitForSwipeSettled` so update can clear `Settling`. */
export const WaitForSwipeSettled = Command.define('WaitForSwipeSettled', {
  args: {
    entryId: Schema.String,
    version: Schema.Number,
  },
  messages: [Message.CompletedWaitForSwipeSettled],
})

/** @internal The Toast's Command handlers. */
export const commandHandlers = {
  WaitBeforeDismissal: ({
    entryId,
    version,
    duration,
  }: Readonly<{
    entryId: string
    version: number
    duration: Duration.Duration
  }>) =>
    Effect.sleep(duration).pipe(
      Effect.as(Message.CompletedWaitBeforeDismissal({ entryId, version })),
    ),
  WaitForSwipeSettled: ({
    entryId,
    version,
  }: Readonly<{ entryId: string; version: number }>) =>
    Effect.sleep(SWIPE_SETTLE_DURATION).pipe(
      Effect.as(Message.CompletedWaitForSwipeSettled({ entryId, version })),
    ),
}

// SUBSCRIPTION

/** @internal What the swipe Subscriptions depend on. */
export type SwipeDependencies = Readonly<{
  isSwipeEnabled: boolean
  isAnyDragging: boolean
}>

const documentStylesWhileSwiping = Stream.callback<never>(() =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const styleElement = document.createElement('style')
      styleElement.textContent = `
        :root {
          user-select: none !important;
          -webkit-user-select: none !important;
        }
        * {
          cursor: grabbing !important;
        }
      `
      document.head.appendChild(styleElement)
      return styleElement
    }),
    styleElement =>
      Effect.sync(() => {
        styleElement.remove()
      }),
  ).pipe(Effect.flatMap(() => Effect.never)),
)

type SwipePointerMessage =
  | typeof Message.MovedSwipePointer.Type
  | typeof Message.ReleasedSwipePointer.Type
  | typeof Message.CancelledSwipe.Type

/** @internal Document pointer Messages for an active swipe, plus document
 *  styles that suppress selection while a pointer drags an entry. Emits
 *  nothing unless swipe is enabled and an entry is dragging. */
export const swipePointerMessages = ({
  isSwipeEnabled,
  isAnyDragging,
}: SwipeDependencies): Stream.Stream<SwipePointerMessage> => {
  const pointerMoveStream = Dom.streamFromEvent({
    target: document,
    type: 'pointermove',
    mapEvent: event =>
      Message.MovedSwipePointer({
        pointerId: event.pointerId,
        clientX: event.clientX,
      }),
  })
  const pointerUpStream = Dom.streamFromEvent({
    target: document,
    type: 'pointerup',
    mapEvent: event =>
      Message.ReleasedSwipePointer({
        pointerId: event.pointerId,
        clientX: event.clientX,
      }),
  })
  const pointerCancelStream = Dom.streamFromEvent({
    target: document,
    type: 'pointercancel',
    mapEvent: event => Message.CancelledSwipe({ pointerId: event.pointerId }),
  })
  const pointerMessages = Stream.mergeAll<SwipePointerMessage, never, never>(
    [pointerMoveStream, pointerUpStream, pointerCancelStream],
    { concurrency: 'unbounded' },
  )

  return Stream.when(
    Stream.merge(pointerMessages, documentStylesWhileSwiping),
    Effect.sync(() => isSwipeEnabled && isAnyDragging),
  )
}

/** @internal Emits `PressedEscape` for the Escape key while swipe is enabled
 *  and an entry is dragging. */
export const swipeEscapeMessages = ({
  isSwipeEnabled,
  isAnyDragging,
}: SwipeDependencies): Stream.Stream<typeof Message.PressedEscape.Type> =>
  Stream.when(
    Dom.streamFromEventFilterMap({
      target: document,
      type: 'keydown',
      filterMapEvent: event =>
        pipe(
          Option.liftPredicate(event.key, key => key === 'Escape'),
          Option.map(() => Message.PressedEscape()),
        ),
    }),
    Effect.sync(() => isSwipeEnabled && isAnyDragging),
  )

/** @internal Returns the swipe Subscription dependencies of a Toast Model. */
export const swipeDependencies = (
  model: Readonly<{
    maybeSwipeConfig: Option.Option<unknown>
    entries: ReadonlyArray<Readonly<{ swipeState: SwipeState }>>
  }>,
): SwipeDependencies => ({
  isSwipeEnabled: Option.isSome(model.maybeSwipeConfig),
  isAnyDragging: Array.some(model.entries, entry =>
    SwipeState.guards.Dragging(entry.swipeState),
  ),
})

// RUNTIME

/**
 * Factory that creates Toast's Schemas and update handlers for a specific
 * payload schema. Called by `makeBlock` in `toast.ts`; inner helpers close
 * over the payload-specific Entry / Model / Message types so generics don't
 * have to propagate through every helper signature.
 *
 * @internal Consumers should use `Toast.makeBlock(PayloadSchema)`.
 */
export const makeRuntime = <A, I>(payloadSchema: Schema.Codec<A, I>) => {
  const EntrySchema = makeEntry(payloadSchema)
  const EntryInputSchema = makeEntryInput(payloadSchema)
  const ModelSchema = makeModel(payloadSchema)
  const MessageSchema = makeMessage(payloadSchema)
  const OutMessageSchema = makeOutMessage(payloadSchema)

  type Entry = typeof EntrySchema.Type
  type EntryInput = typeof EntryInputSchema.Type
  type Model = typeof ModelSchema.Type
  type RequestedShow = typeof MessageSchema.RequestedShow.Type

  const findEntry = (model: Model, entryId: string): Option.Option<Entry> =>
    Array.findFirst(model.entries, ({ id }) => id === entryId)

  const updateEntry = (
    model: Model,
    entryId: string,
    f: (entry: Entry) => Entry,
  ): Model =>
    modifyFields(model, {
      entries: Array.map(entry => (entry.id === entryId ? f(entry) : entry)),
    })

  const removeEntry = (model: Model, entryId: string): Model =>
    modifyFields(model, {
      entries: Array.filter(({ id }) => id !== entryId),
    })

  const isEntryLeaving = (entry: Entry): boolean =>
    Animation.isLeaving(entry.animation.model.transitionState)

  const isDraggingWithPointerId =
    (pointerId: number) =>
    (entry: Entry): boolean =>
      SwipeState.guards.Dragging(entry.swipeState) &&
      entry.swipeState.pointerId === pointerId

  const isPointerActive = (model: Model, pointerId: number): boolean =>
    Array.some(model.entries, isDraggingWithPointerId(pointerId))

  const findDraggingEntry = (
    model: Model,
    pointerId: number,
  ): Option.Option<Readonly<{ entry: Entry; startX: number }>> =>
    pipe(
      Array.findFirst(model.entries, isDraggingWithPointerId(pointerId)),
      Option.flatMap(entry =>
        SwipeState.matchOrElse(
          entry.swipeState,
          {
            Dragging: dragging =>
              Option.some({ entry, startX: dragging.startX }),
          },
          () => Option.none(),
        ),
      ),
    )

  const scheduleUnheldDismissal = (entry: EntryInput) => {
    if (entry.isHovered || SwipeState.guards.Dragging(entry.swipeState)) {
      return Option.none()
    } else {
      return Option.map(entry.maybeDuration, duration =>
        WaitBeforeDismissal({
          entryId: entry.id,
          version: entry.pendingDismissVersion,
          duration,
        }),
      )
    }
  }

  const scheduleWaitBeforeDismissal = (entry: Entry) =>
    isEntryLeaving(entry) ? Option.none() : scheduleUnheldDismissal(entry)

  const hideEntryAnimation = (entry: Entry) =>
    entry.animation.send(Animation.Animation.Message.RequestedHide())

  const settleSnapBack = (model: Model, entry: Entry) => {
    const nextSwipeVersion = Number.increment(entry.swipeVersion)
    const nextEntry = modifyFields(entry, {
      pendingDismissVersion: Number.increment,
      swipeState: () => SwipeState.Settling({ offsetX: 0 }),
      swipeVersion: () => nextSwipeVersion,
    })

    return {
      model: updateEntry(model, entry.id, () => nextEntry),
      commands: [
        WaitForSwipeSettled({ entryId: entry.id, version: nextSwipeVersion }),
        ...Array.fromOption(scheduleWaitBeforeDismissal(nextEntry)),
      ],
    }
  }

  const dismissEntry = (model: Model, entryId: string) =>
    Option.match(findEntry(model, entryId), {
      onNone: () => ({ model }),
      onSome: entry =>
        isEntryLeaving(entry)
          ? { model }
          : { model, messages: [hideEntryAnimation(entry)] },
    })

  const toEntryInput = (
    model: Model,
    { payload, variant, maybeDuration, isSticky }: RequestedShow,
  ): EntryInput => ({
    id: `${model.id}-entry-${model.nextEntryKey}`,
    variant,
    maybeDuration: isSticky
      ? Option.none()
      : Option.orElse(maybeDuration, () => Option.some(model.defaultDuration)),
    pendingDismissVersion: 0,
    isHovered: false,
    swipeState: SwipeState.Idle(),
    swipeVersion: 0,
    payload,
  })

  /** Creates a Toast's starting Model from its constructor args. Starts empty
   *  with swipe disabled unless `swipeToDismiss` opts in. */
  const initialModel = (config: InitConfig): Model => ({
    id: config.id,
    defaultDuration:
      config.defaultDuration === undefined
        ? DEFAULT_DURATION
        : Duration.fromInputUnsafe(config.defaultDuration),
    entries: [],
    nextEntryKey: 0,
    maybeSwipeConfig: pipe(
      Option.fromNullishOr(config.swipeToDismiss),
      Option.map(({ threshold, direction }) => ({
        threshold: threshold ?? DEFAULT_SWIPE_THRESHOLD,
        direction: direction ?? DEFAULT_SWIPE_DIRECTION,
      })),
    ),
  })

  /** Creates the RequestedShow Message for a show input, applying the
   *  default variant and converting the duration. */
  const requestShow = (input: ShowInput<A>): RequestedShow =>
    MessageSchema.RequestedShow({
      payload: input.payload,
      variant: input.variant ?? DEFAULT_VARIANT,
      maybeDuration: pipe(
        Option.fromNullishOr(input.duration),
        Option.map(Duration.fromInputUnsafe),
      ),
      isSticky: input.sticky ?? false,
    })

  /** Builds the update handlers. `entryAnimation` creates the Animation
   *  instance of a new entry. */
  const makeUpdate = (entryAnimation: (key: string) => Animation.Animation) => {
    const addEntry = (model: Model, input: EntryInput) => {
      const entry: Entry = { ...input, animation: entryAnimation(input.id) }

      return {
        model: modifyFields(model, {
          entries: entries => Array.append(entries, entry),
          nextEntryKey: Number.increment,
        }),
        commands: Array.fromOption(scheduleUnheldDismissal(input)),
        messages: [
          entry.animation.send(Animation.Animation.Message.RequestedShow()),
        ],
      }
    }

    return {
      RequestedShow: (model: Model, message: RequestedShow) =>
        addEntry(model, toEntryInput(model, message)),

      Added: (model: Model, { entry }: typeof MessageSchema.Added.Type) =>
        addEntry(model, entry),

      RequestedDismiss: (
        model: Model,
        { entryId }: typeof MessageSchema.RequestedDismiss.Type,
      ) => dismissEntry(model, entryId),

      RequestedDismissAll: (model: Model) => ({
        model,
        messages: pipe(
          model.entries,
          Array.filter(entry => !isEntryLeaving(entry)),
          Array.map(hideEntryAnimation),
        ),
      }),

      Dismissed: (
        model: Model,
        { entryId }: typeof MessageSchema.Dismissed.Type,
      ) => dismissEntry(model, entryId),

      CompletedWaitBeforeDismissal: (
        model: Model,
        {
          entryId,
          version,
        }: typeof MessageSchema.CompletedWaitBeforeDismissal.Type,
      ) =>
        Option.match(findEntry(model, entryId), {
          onNone: () => ({ model }),
          onSome: entry => {
            const isStale = version !== entry.pendingDismissVersion
            if (isStale || isEntryLeaving(entry)) {
              return { model }
            } else {
              return { model, messages: [hideEntryAnimation(entry)] }
            }
          },
        }),

      HoveredEntry: (
        model: Model,
        { entryId }: typeof MessageSchema.HoveredEntry.Type,
      ) => ({
        model: updateEntry(model, entryId, entry =>
          modifyFields(entry, {
            isHovered: () => true,
            pendingDismissVersion: Number.increment,
          }),
        ),
      }),

      LeftEntry: (
        model: Model,
        { entryId }: typeof MessageSchema.LeftEntry.Type,
      ) =>
        Option.match(findEntry(model, entryId), {
          onNone: () => ({ model }),
          onSome: entry => {
            const nextEntry = modifyFields(entry, {
              isHovered: () => false,
              pendingDismissVersion: Number.increment,
            })
            return {
              model: updateEntry(model, entryId, () => nextEntry),
              commands: Array.fromOption(
                scheduleWaitBeforeDismissal(nextEntry),
              ),
            }
          },
        }),

      PressedEntryPointer: (
        model: Model,
        {
          entryId,
          pointerId,
          clientX,
        }: typeof MessageSchema.PressedEntryPointer.Type,
      ) => {
        if (Option.isNone(model.maybeSwipeConfig)) {
          return { model }
        }

        return Option.match(findEntry(model, entryId), {
          onNone: () => ({ model }),
          onSome: entry => {
            if (
              isEntryLeaving(entry) ||
              SwipeState.guards.Dragging(entry.swipeState) ||
              isPointerActive(model, pointerId)
            ) {
              return { model }
            } else {
              const nextEntry = modifyFields(entry, {
                pendingDismissVersion: Number.increment,
                swipeState: () =>
                  SwipeState.Dragging({
                    pointerId,
                    startX: clientX,
                    currentX: clientX,
                  }),
                swipeVersion: Number.increment,
              })
              return { model: updateEntry(model, entryId, () => nextEntry) }
            }
          },
        })
      },

      MovedSwipePointer: (
        model: Model,
        { pointerId, clientX }: typeof MessageSchema.MovedSwipePointer.Type,
      ) =>
        Option.match(
          Option.all({
            swipeConfig: model.maybeSwipeConfig,
            draggingEntry: findDraggingEntry(model, pointerId),
          }),
          {
            onNone: () => ({ model }),
            onSome: ({ swipeConfig, draggingEntry: { entry, startX } }) => ({
              model: updateEntry(model, entry.id, currentEntry =>
                modifyFields(currentEntry, {
                  swipeState: () =>
                    SwipeState.Dragging({
                      pointerId,
                      startX,
                      currentX: clampSwipeClientX(
                        startX,
                        clientX,
                        swipeConfig.direction,
                      ),
                    }),
                }),
              ),
            }),
          },
        ),

      ReleasedSwipePointer: (
        model: Model,
        { pointerId, clientX }: typeof MessageSchema.ReleasedSwipePointer.Type,
      ) =>
        Option.match(
          Option.all({
            swipeConfig: model.maybeSwipeConfig,
            draggingEntry: findDraggingEntry(model, pointerId),
          }),
          {
            onNone: () => ({ model }),
            onSome: ({ swipeConfig, draggingEntry: { entry, startX } }) => {
              const offset =
                clampSwipeClientX(startX, clientX, swipeConfig.direction) -
                startX
              const isPastSwipeThreshold =
                Math.abs(offset) > swipeConfig.threshold
              if (!isPastSwipeThreshold) {
                return settleSnapBack(model, entry)
              }

              const nextSwipeVersion = Number.increment(entry.swipeVersion)
              const nextEntry = modifyFields(entry, {
                swipeState: () =>
                  SwipeState.Dismissing({
                    offsetX: offset,
                    direction: swipeConfig.direction,
                  }),
                swipeVersion: () => nextSwipeVersion,
              })
              const nextModel = updateEntry(model, entry.id, () => nextEntry)

              if (isEntryLeaving(entry)) {
                return { model: nextModel }
              } else {
                return {
                  model: nextModel,
                  messages: [hideEntryAnimation(entry)],
                }
              }
            },
          },
        ),

      CancelledSwipe: (
        model: Model,
        { pointerId }: typeof MessageSchema.CancelledSwipe.Type,
      ) =>
        Option.match(findDraggingEntry(model, pointerId), {
          onNone: () => ({ model }),
          onSome: ({ entry }) => settleSnapBack(model, entry),
        }),

      PressedEscape: (model: Model) =>
        Array.reduce(
          Array.filter(model.entries, entry =>
            SwipeState.guards.Dragging(entry.swipeState),
          ),
          {
            model,
            commands: Array.empty<
              | ReturnType<typeof WaitForSwipeSettled>
              | ReturnType<typeof WaitBeforeDismissal>
            >(),
          },
          (settled, entry) => {
            const entrySettle = settleSnapBack(settled.model, entry)
            return {
              model: entrySettle.model,
              commands: [...settled.commands, ...entrySettle.commands],
            }
          },
        ),

      CompletedWaitForSwipeSettled: (
        model: Model,
        {
          entryId,
          version,
        }: typeof MessageSchema.CompletedWaitForSwipeSettled.Type,
      ) =>
        Option.match(findEntry(model, entryId), {
          onNone: () => ({ model }),
          onSome: entry => {
            if (
              SwipeState.guards.Settling(entry.swipeState) &&
              entry.swipeVersion === version
            ) {
              return {
                model: updateEntry(model, entryId, current =>
                  modifyFields(current, {
                    swipeState: () => SwipeState.Idle(),
                  }),
                ),
              }
            } else {
              return { model }
            }
          },
        }),
    }
  }

  /** Handles the entry Animations' OutMessages: waits for a leave to settle,
   *  then removes the entry and reports `DismissedToast`. */
  const entryAnimationHandlers = {
    StartedLeaveAnimating: (
      model: Model,
      _outMessage: unknown,
      animation: Animation.Animation,
    ) => ({
      model,
      messages: [
        animation.send(
          Animation.Animation.Message.RequestedWaitForLeaveSettlement(),
        ),
      ],
    }),
    TransitionedOut: (
      model: Model,
      _outMessage: unknown,
      animation: Animation.Animation,
    ) =>
      Option.match(findEntry(model, animation.id), {
        onNone: () => ({ model }),
        onSome: entry => ({
          model: removeEntry(model, entry.id),
          outMessage: OutMessageSchema.DismissedToast({
            payload: entry.payload,
          }),
        }),
      }),
  }

  return {
    Entry: EntrySchema,
    EntryInput: EntryInputSchema,
    Model: ModelSchema,
    Message: MessageSchema,
    OutMessage: OutMessageSchema,
    initialModel,
    requestShow,
    makeUpdate,
    entryAnimationHandlers,
  }
}
