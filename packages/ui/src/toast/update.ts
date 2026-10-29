import {
  Array,
  Duration,
  Effect,
  Layer,
  Match,
  Number,
  Option,
  Schema,
  Stream,
  Tuple,
  pipe,
} from 'effect'
import * as Block from 'foldkit/block'
import * as Dom from 'foldkit/dom'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'

import * as Animation from '../animation/index.js'
import {
  DEFAULT_DURATION,
  DEFAULT_SWIPE_DIRECTION,
  DEFAULT_SWIPE_THRESHOLD,
  type InitConfig,
  SWIPE_SETTLE_DURATION,
  type SwipeDirection,
  SwipeState,
  type Variant,
  makeEntry,
  makeMessage,
  makeModel,
  makeOutMessage,
} from './schema.js'

// Factory-level ShowInput. The consumer supplies the full payload.

/** Input for the exposed `show` operation. `payload` is the consumer-defined content shape for an
 *  entry. Omit `duration` to use the container's `defaultDuration`; pass
 *  `sticky: true` to skip auto-dismiss entirely. */
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

/**
 * Factory that creates Toast's runtime (update fn, helpers, commands) for a
 *  specific payload schema. Called by `makeFixture` in `toast.ts`; inner helpers close
 *  over the payload-specific Entry / Model / Message types so generics don't
 *  have to propagate through every helper signature.
 *
 *  @internal Consumers should use `Toast.makeBlock(PayloadSchema)`. This is
 *  only exported so `toast.ts` can wire the view into the runtime.
 */
export const makeRuntime = <A, I>(payloadSchema: Schema.Codec<A, I>) => {
  const EntrySchema = makeEntry(payloadSchema)
  const ModelSchema = makeModel(payloadSchema)
  const MessageSchema = makeMessage(payloadSchema)
  const OutMessageSchema = makeOutMessage(payloadSchema)
  type RequestedShow = typeof MessageSchema.RequestedShow.Type
  const ToastDefinition = Block.makeDefinition('Toast', {
    Model: ModelSchema,
    Message: MessageSchema,
    OutMessage: OutMessageSchema,
  })

  type Entry = typeof EntrySchema.Type
  type Model = typeof ModelSchema.Type

  /** Waits for an entry's auto-dismiss duration, then emits a versioned
   *  `CompletedWaitBeforeDismissal` Message so update can ignore stale timers. */
  const WaitBeforeDismissal = ToastDefinition.makeCommand(
    'WaitBeforeDismissal',
    {
      args: {
        entryId: Schema.String,
        version: Schema.Number,
        duration: Schema.DurationFromMillis,
      },
      messages: [MessageSchema.CompletedWaitBeforeDismissal],
      handler: function* () {
        return ({ entryId, version, duration }) =>
          Effect.gen(function* () {
            yield* Effect.sleep(duration)
            return MessageSchema.CompletedWaitBeforeDismissal({
              entryId,
              version,
            })
          })
      },
    },
  )

  /** Waits for a short or cancelled swipe to animate back, then emits
   *  `CompletedWaitForSwipeSettled` so update can clear `Settling`. */
  const WaitForSwipeSettled = ToastDefinition.makeCommand(
    'WaitForSwipeSettled',
    {
      args: {
        entryId: Schema.String,
        version: Schema.Number,
      },
      messages: [MessageSchema.CompletedWaitForSwipeSettled],
      handler: function* () {
        return ({ entryId, version }) =>
          Effect.gen(function* () {
            yield* Effect.sleep(SWIPE_SETTLE_DURATION)
            return MessageSchema.CompletedWaitForSwipeSettled({
              entryId,
              version,
            })
          })
      },
    },
  )

  const SharedEffectsLayer = Layer.mergeAll(
    WaitBeforeDismissal.layer,
    WaitForSwipeSettled.layer,
  )

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

  const isEntryLeaving = (entry: Entry): boolean => {
    const { transitionState } = entry.animation
    return (
      transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
    )
  }

  const isDraggingWithPointerId =
    (pointerId: number) =>
    (entry: Entry): boolean =>
      SwipeState.guards.Dragging(entry.swipeState) &&
      entry.swipeState.pointerId === pointerId

  const isPointerActive = (model: Model, pointerId: number): boolean =>
    Array.some(model.entries, isDraggingWithPointerId(pointerId))

  const isAnyDragging = (model: Model): boolean =>
    Array.some(model.entries, entry =>
      SwipeState.guards.Dragging(entry.swipeState),
    )

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

  const scheduleWaitBeforeDismissal = (entry: Entry) => {
    if (
      isEntryLeaving(entry) ||
      entry.isHovered ||
      SwipeState.guards.Dragging(entry.swipeState)
    ) {
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

  const settleSnapBackStep = (entry: Entry) =>
    ToastDefinition.makeStep(model => {
      const nextSwipeVersion = Number.increment(entry.swipeVersion)
      const nextEntry = modifyFields(entry, {
        pendingDismissVersion: Number.increment,
        swipeState: () => SwipeState.Settling({ offsetX: 0 }),
        swipeVersion: () => nextSwipeVersion,
      })
      const nextModel = updateEntry(model, entry.id, () => nextEntry)
      return {
        model: nextModel,
        commands: [
          WaitForSwipeSettled({ entryId: entry.id, version: nextSwipeVersion }),
          ...Array.fromOption(scheduleWaitBeforeDismissal(nextEntry)),
        ],
      }
    })

  const EntryAnimationBinding = ToastDefinition.makeBinding(
    Animation.AnimationBlock,
    {
      field: 'entries',
      key: 'id',
      childField: 'animation',
    },
  )

  const makeEntryAnimationOutMessageFold = (entryId: string) =>
    ToastDefinition.makeOutMessageFold(Animation.AnimationBlock, {
      StartedLeaveAnimating: () =>
        EntryAnimationBinding.requestWaitForLeaveSettlement(entryId),
      TransitionedOut: () =>
        ToastDefinition.makeStep(model =>
          Option.match(
            Array.findFirst(model.entries, ({ id }) => id === entryId),
            {
              onNone: () => ({ model }),
              onSome: entry => ({
                model: removeEntry(model, entryId),
                outMessage: OutMessageSchema.DismissedToast({
                  payload: entry.payload,
                }),
              }),
            },
          ),
        ),
    })

  const ToastComposition = ToastDefinition.makeComposition({
    bindings: [
      EntryAnimationBinding.withOutMessagePolicy({
        fold: (entryId, outMessage) =>
          makeEntryAnimationOutMessageFold(entryId)(outMessage),
      }),
    ],
  })

  const foldEntryAnimationShowStep = (entry: Entry) =>
    EntryAnimationBinding.requestShow(entry.id)

  const foldEntryAnimationHideStep = (entry: Entry) =>
    EntryAnimationBinding.requestHide(entry.id)

  const createEntry = (
    model: Model,
    { payload, variant, maybeDuration, isSticky }: RequestedShow,
  ): Entry => {
    const entryId = `${model.id}-entry-${model.nextEntryKey}`

    return {
      id: entryId,
      variant,
      animation: Animation.AnimationBlock.init({
        id: entryId,
        isShowing: false,
      }).model,
      maybeDuration: isSticky
        ? Option.none()
        : Option.orElse(maybeDuration, () =>
            Option.some(model.defaultDuration),
          ),
      pendingDismissVersion: 0,
      isHovered: false,
      swipeState: SwipeState.Idle(),
      swipeVersion: 0,
      payload,
    }
  }

  const makeInitialModel = (config: InitConfig): Model => ({
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
  /** Creates an initial Toast Model and Commands from a config. Starts empty
   *  with swipe disabled unless `swipeToDismiss` opts in. */
  const init = ToastComposition.makeInit((config: InitConfig) => ({
    model: makeInitialModel(config),
  }))

  const addEntryStep = (entry: Entry) => {
    const appendEntryStep = ToastDefinition.makeFieldsStep(() => ({
      entries: entries => Array.append(entries, entry),
      nextEntryKey: Number.increment,
    }))
    const scheduleDismissalStep = ToastDefinition.makeCommandsStep(model =>
      pipe(
        Array.findFirst(model.entries, ({ id }) => id === entry.id),
        Option.flatMap(scheduleWaitBeforeDismissal),
        Array.fromOption,
      ),
    )

    return Update.combineSteps([
      appendEntryStep,
      foldEntryAnimationShowStep(entry),
      scheduleDismissalStep,
    ])
  }

  const dismissEntriesStep = (entries: ReadonlyArray<Entry>) =>
    Update.combineSteps(Array.map(entries, foldEntryAnimationHideStep))

  const leaveToastUnchangedStep = ToastDefinition.makeNoopStep()
  const dismissEntryStep = (entryId: string) =>
    ToastDefinition.makeStep(model => {
      const dismiss = Option.match(
        Array.findFirst(model.entries, ({ id }) => id === entryId),
        {
          onNone: () => leaveToastUnchangedStep,
          onSome: entry =>
            isEntryLeaving(entry)
              ? leaveToastUnchangedStep
              : foldEntryAnimationHideStep(entry),
        },
      )

      return dismiss
    })

  /** Processes a Toast Message and returns the next Model, optional Commands,
   *  and an optional `DismissedToast` OutMessage emitted once an entry has
   *  finished its leave animation. */
  const update = ToastComposition.makeUpdate({
    RequestedShow: (model, input) =>
      addEntryStep(createEntry(model, input))(model),

    Added: (model, { entry }) => addEntryStep(entry)(model),

    RequestedDismiss: (model, { entryId }) => dismissEntryStep(entryId)(model),

    RequestedDismissAll: model => {
      const dismissVisibleEntries = pipe(
        model.entries,
        Array.filter(entry => !isEntryLeaving(entry)),
        dismissEntriesStep,
      )

      return dismissVisibleEntries(model)
    },

    Dismissed: (model, { entryId }) => dismissEntryStep(entryId)(model),

    CompletedWaitBeforeDismissal: (model, { entryId, version }) => {
      const maybeEntry = Array.findFirst(
        model.entries,
        ({ id }) => id === entryId,
      )

      return Option.match(maybeEntry, {
        onNone: () => leaveToastUnchangedStep(model),
        onSome: entry => {
          const isStale = version !== entry.pendingDismissVersion
          if (isStale || isEntryLeaving(entry)) {
            return leaveToastUnchangedStep(model)
          } else {
            return foldEntryAnimationHideStep(entry)(model)
          }
        },
      })
    },

    HoveredEntry: (model, { entryId }) => ({
      model: updateEntry(model, entryId, entry =>
        modifyFields(entry, {
          isHovered: () => true,
          pendingDismissVersion: Number.increment,
        }),
      ),
    }),

    LeftEntry: (model, { entryId }) => {
      const maybeEntry = Array.findFirst(
        model.entries,
        ({ id }) => id === entryId,
      )

      return Option.match(maybeEntry, {
        onNone: () => ({ model }),
        onSome: entry => {
          const nextEntry: Entry = modifyFields(entry, {
            isHovered: () => false,
            pendingDismissVersion: Number.increment,
          })
          const nextModel = updateEntry(model, entryId, () => nextEntry)
          return {
            model: nextModel,
            commands: Array.fromOption(scheduleWaitBeforeDismissal(nextEntry)),
          }
        },
      })
    },

    PressedEntryPointer: (model, { entryId, pointerId, clientX }) => {
      if (Option.isNone(model.maybeSwipeConfig)) {
        return { model }
      }
      const maybeEntry = Array.findFirst(
        model.entries,
        ({ id }) => id === entryId,
      )
      return Option.match(maybeEntry, {
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

    MovedSwipePointer: (model, { pointerId, clientX }) =>
      Option.match(
        Option.all({
          swipeConfig: model.maybeSwipeConfig,
          draggingEntry: findDraggingEntry(model, pointerId),
        }),
        {
          onNone: () => leaveToastUnchangedStep(model),
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

    ReleasedSwipePointer: (model, { pointerId, clientX }) =>
      Option.match(
        Option.all({
          swipeConfig: model.maybeSwipeConfig,
          draggingEntry: findDraggingEntry(model, pointerId),
        }),
        {
          onNone: () => leaveToastUnchangedStep(model),
          onSome: ({ swipeConfig, draggingEntry: { entry, startX } }) => {
            const offset =
              clampSwipeClientX(startX, clientX, swipeConfig.direction) - startX
            const isPastSwipeThreshold =
              Math.abs(offset) > swipeConfig.threshold
            if (!isPastSwipeThreshold) {
              return settleSnapBackStep(entry)(model)
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
              return ToastDefinition.makeStep(() => ({ model: nextModel }))(
                model,
              )
            } else {
              return Update.combineSteps(model, [
                ToastDefinition.makeStep(() => ({ model: nextModel })),
                foldEntryAnimationHideStep(entry),
              ])
            }
          },
        },
      ),

    CancelledSwipe: (model, { pointerId }) =>
      Option.match(findDraggingEntry(model, pointerId), {
        onNone: () => leaveToastUnchangedStep(model),
        onSome: ({ entry }) => settleSnapBackStep(entry)(model),
      }),

    PressedEscape: model => {
      const draggingEntries = Array.filter(model.entries, entry =>
        SwipeState.guards.Dragging(entry.swipeState),
      )

      return Update.combineSteps(
        model,
        Array.map(draggingEntries, settleSnapBackStep),
      )
    },

    CompletedWaitForSwipeSettled: (model, { entryId, version }) =>
      Option.match(
        Array.findFirst(model.entries, ({ id }) => id === entryId),
        {
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
        },
      ),
  })

  const operations = {
    /** Requests a new entry. The update allocates its identity and applies the
     * container's default duration when no duration is supplied. */
    requestShow: (input: ShowInput<A>) =>
      Tuple.make(
        MessageSchema.RequestedShow({
          payload: input.payload,
          variant: input.variant ?? DEFAULT_VARIANT,
          maybeDuration: pipe(
            Option.fromNullishOr(input.duration),
            Option.map(Duration.fromInputUnsafe),
          ),
          isSticky: input.sticky ?? false,
        }),
      ),
    /** Begins the selected entry's leave animation. Missing entries are ignored. */
    requestDismiss: (entryId: string) =>
      Tuple.make(MessageSchema.RequestedDismiss({ entryId })),
    /** Begins leave animations for every visible entry. */
    requestDismissAll: MessageSchema.RequestedDismissAll,
  }

  const swipeDependencies = (model: Model) => ({
    isSwipeEnabled: Option.isSome(model.maybeSwipeConfig),
    isAnyDragging: isAnyDragging(model),
  })

  type SwipePointerMessage =
    | typeof MessageSchema.MovedSwipePointer.Type
    | typeof MessageSchema.ReleasedSwipePointer.Type
    | typeof MessageSchema.CancelledSwipe.Type

  const subscriptions = ToastDefinition.makeSubscriptions(entry => ({
    swipePointer: entry(
      'SwipePointer',
      {
        isSwipeEnabled: Schema.Boolean,
        isAnyDragging: Schema.Boolean,
      },
      {
        messages: [
          MessageSchema.MovedSwipePointer,
          MessageSchema.ReleasedSwipePointer,
          MessageSchema.CancelledSwipe,
        ],
        modelToDependencies: swipeDependencies,
        handler: function* () {
          return ({ isSwipeEnabled, isAnyDragging }) => {
            const pointerMoveStream = Dom.streamFromEvent({
              target: document,
              type: 'pointermove',
              mapEvent: event =>
                MessageSchema.MovedSwipePointer({
                  pointerId: event.pointerId,
                  clientX: event.clientX,
                }),
            })
            const pointerUpStream = Dom.streamFromEvent({
              target: document,
              type: 'pointerup',
              mapEvent: event =>
                MessageSchema.ReleasedSwipePointer({
                  pointerId: event.pointerId,
                  clientX: event.clientX,
                }),
            })
            const pointerCancelStream = Dom.streamFromEvent({
              target: document,
              type: 'pointercancel',
              mapEvent: event =>
                MessageSchema.CancelledSwipe({ pointerId: event.pointerId }),
            })
            const pointerMessages = Stream.mergeAll<
              SwipePointerMessage,
              never,
              never
            >([pointerMoveStream, pointerUpStream, pointerCancelStream], {
              concurrency: 'unbounded',
            })

            return Stream.when(
              Stream.merge(pointerMessages, documentStylesWhileSwiping),
              Effect.sync(() => isSwipeEnabled && isAnyDragging),
            )
          }
        },
      },
    ),

    swipeEscape: entry(
      'SwipeEscape',
      {
        isSwipeEnabled: Schema.Boolean,
        isAnyDragging: Schema.Boolean,
      },
      {
        messages: [MessageSchema.PressedEscape],
        modelToDependencies: swipeDependencies,
        handler: function* () {
          return ({ isSwipeEnabled, isAnyDragging }) =>
            Stream.when(
              Dom.streamFromEventFilterMap({
                target: document,
                type: 'keydown',
                filterMapEvent: event =>
                  pipe(
                    Option.liftPredicate(event.key, key => key === 'Escape'),
                    Option.map(() => MessageSchema.PressedEscape()),
                  ),
              }),
              Effect.sync(() => isSwipeEnabled && isAnyDragging),
            )
        },
      },
    ),
  }))

  /** Provides this Toast instance's Command and Subscription handlers. */
  const EffectsLayer = Layer.mergeAll(SharedEffectsLayer, subscriptions.layer)

  return {
    ToastComposition,
    EntryAnimationBinding,
    Entry: EntrySchema,
    Model: ModelSchema,
    Message: MessageSchema,
    OutMessage: OutMessageSchema,
    init,
    update,
    operations,
    subscriptions,
    EffectsLayer,
    WaitBeforeDismissal,
    WaitForSwipeSettled,
    swipeOffset,
  }
}
