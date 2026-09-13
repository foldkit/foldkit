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
import * as Command from 'foldkit/command'
import { evo } from 'foldkit/struct'
import * as Subscription from 'foldkit/subscription'
import * as Update from 'foldkit/update'

import {
  Message as AnimationMessage,
  type Model as AnimationModel,
  OutMessage as AnimationOutMessage,
  init as animationInit,
} from '../animation/schema.js'
import {
  defaultLeaveCommand as animationDefaultLeaveCommand,
  update as animationUpdate,
} from '../animation/update.js'
import * as OptionExt from '../internal/optionExtensions.js'
import {
  DEFAULT_DURATION,
  DEFAULT_SWIPE_THRESHOLD,
  type InitConfig,
  SWIPE_SETTLE_DURATION,
  Message as StaticMessage,
  SwipeState,
  type Variant,
  makeEntry,
  makeMessage,
  makeModel,
  makeOutMessage,
} from './schema.js'

// Factory-level ShowInput. The consumer supplies the full payload.

/** Input for `show()`. `payload` is the consumer-defined content shape for an
 *  entry. Omit `duration` to use the container's `defaultDuration`; pass
 *  `sticky: true` to skip auto-dismiss entirely. */
export type ShowInput<A> = Readonly<{
  payload: A
  variant?: Variant
  duration?: Duration.Input
  sticky?: boolean
}>

/** Schedules an auto-dismiss timer for an entry. The result Message carries a
 *  version so stale timers (from hover or manual dismiss) are discarded in
 *  the update function. Static. The Command definition doesn't depend on
 *  payload. */
export const WaitBeforeDismissal = Command.define('WaitBeforeDismissal', {
  args: {
    entryId: Schema.String,
    version: Schema.Number,
    duration: Schema.DurationFromMillis,
  },
  messages: [StaticMessage.CompletedWaitBeforeDismissal],
  execute: ({ entryId, version, duration }) =>
    Effect.sleep(duration).pipe(
      Effect.as(
        StaticMessage.CompletedWaitBeforeDismissal({ entryId, version }),
      ),
    ),
})

const DEFAULT_VARIANT: Variant = 'Info'

/** Holds the swipe timer that clears a cancelled gesture's settling state
 *  once consumer CSS has had time to animate the snap-back. Static. The
 *  Command definition doesn't depend on payload. */
export const WaitForSwipeSettled = Command.define('WaitForSwipeSettled', {
  args: {
    entryId: Schema.String,
    version: Schema.Number,
  },
  messages: [StaticMessage.CompletedWaitForSwipeSettled],
  execute: ({ entryId, version }) =>
    Effect.sleep(SWIPE_SETTLE_DURATION).pipe(
      Effect.as(
        StaticMessage.CompletedWaitForSwipeSettled({ entryId, version }),
      ),
    ),
})

/** Horizontal offset in pixels for an entry's swipe state. `Dragging`
 *  reports the distance travelled from the press point; `Settling` reports
 *  the offset the release left behind; `Idle` reports zero. */
export const swipeOffset = (swipeState: typeof SwipeState.Type): number =>
  SwipeState.match(swipeState, {
    Idle: () => 0,
    Dragging: dragging => dragging.currentX - dragging.startX,
    Settling: settling => settling.offsetX,
  })

const isDragging = (swipeState: typeof SwipeState.Type): boolean =>
  SwipeState.match(swipeState, {
    Idle: () => false,
    Dragging: () => true,
    Settling: () => false,
  })

const isSettling = (swipeState: typeof SwipeState.Type): boolean =>
  SwipeState.match(swipeState, {
    Idle: () => false,
    Dragging: () => false,
    Settling: () => true,
  })

/** Factory that binds Toast's runtime (update fn, helpers, commands) to a
 *  specific payload schema. Called by `make` in index.ts; inner helpers close
 *  over the payload-specific Entry / Model / Added types so generics don't
 *  have to propagate through every helper signature.
 *
 *  @internal Consumers should use `Toast.make(PayloadSchema)`. This is
 *  only exported so `index.ts` can wire the view into the bound runtime. */
export const makeRuntime = <A, I>(payloadSchema: Schema.Codec<A, I>) => {
  const EntrySchema = makeEntry(payloadSchema)
  const ModelSchema = makeModel(payloadSchema)
  const MessageSchema = makeMessage(payloadSchema)
  const OutMessageSchema = makeOutMessage(payloadSchema)
  const Added = MessageSchema.Added
  const DismissedToast = OutMessageSchema.DismissedToast

  type Entry = typeof EntrySchema.Type
  type Model = typeof ModelSchema.Type
  type Message = typeof MessageSchema.Type
  type OutMessage = typeof OutMessageSchema.Type

  type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

  const updateEntry = (
    model: Model,
    entryId: string,
    f: (entry: Entry) => Entry,
  ): Model =>
    evo(model, {
      entries: Array.map(entry => (entry.id === entryId ? f(entry) : entry)),
    })

  const removeEntry = (model: Model, entryId: string): Model =>
    evo(model, {
      entries: Array.filter(({ id }) => id !== entryId),
    })

  const isEntryLeaving = (entry: Entry): boolean => {
    const { transitionState } = entry.animation
    return (
      transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
    )
  }

  const activePointerId = (model: Model): Option.Option<number> =>
    pipe(
      Array.findFirst(model.entries, entry => isDragging(entry.swipeState)),
      Option.flatMap(entry =>
        SwipeState.match(entry.swipeState, {
          Idle: () => Option.none(),
          Dragging: dragging => Option.some(dragging.pointerId),
          Settling: () => Option.none(),
        }),
      ),
    )

  const findDraggingEntry = (
    model: Model,
    pointerId: number,
  ): Option.Option<Readonly<{ entryId: string; startX: number }>> =>
    pipe(
      Array.findFirst(model.entries, entry =>
        SwipeState.match(entry.swipeState, {
          Idle: () => false,
          Dragging: dragging => dragging.pointerId === pointerId,
          Settling: () => false,
        }),
      ),
      Option.flatMap(entry =>
        SwipeState.match(entry.swipeState, {
          Idle: () => Option.none(),
          Dragging: dragging =>
            Option.some({ entryId: entry.id, startX: dragging.startX }),
          Settling: () => Option.none(),
        }),
      ),
    )

  const scheduleDismiss = (
    entryId: string,
    version: number,
    duration: Duration.Duration,
  ): Command.Command<Message> =>
    WaitBeforeDismissal({ entryId, version, duration })

  const rescheduleDismissCommands = (
    entry: Entry,
  ): ReadonlyArray<Command.Command<Message>> => {
    if (
      isEntryLeaving(entry) ||
      entry.isHovered ||
      isDragging(entry.swipeState)
    ) {
      return []
    } else {
      return Option.match(entry.maybeDuration, {
        onNone: () => [],
        onSome: duration => [
          scheduleDismiss(entry.id, entry.pendingDismissVersion, duration),
        ],
      })
    }
  }

  /** Returns a cancelled gesture to rest: bumps the dismiss version and the
   *  entry's swipe version, reschedules the auto-dismiss timer, and holds
   *  `Settling` at zero offset while consumer CSS animates the snap-back.
   *  The fresh swipe version means a re-press during the transition safely
   *  discards the stale settle completion. */
  const settleSnapBack = (model: Model, entry: Entry): UpdateReturn => {
    const nextVersion = Number.increment(entry.swipeVersion)
    const nextEntry = evo(entry, {
      pendingDismissVersion: Number.increment,
      swipeState: () => SwipeState.Settling({ offsetX: 0 }),
      swipeVersion: () => nextVersion,
    })
    const nextModel = updateEntry(model, entry.id, () => nextEntry)
    return {
      model: nextModel,
      commands: [
        WaitForSwipeSettled({ entryId: entry.id, version: nextVersion }),
        ...rescheduleDismissCommands(nextEntry),
      ],
    }
  }

  const readEntryAnimation =
    (entryId: string) =>
    (model: Model): Option.Option<Entry['animation']> =>
      pipe(
        Array.findFirst(model.entries, ({ id }) => id === entryId),
        Option.map(({ animation }) => animation),
      )

  const writeEntryAnimation =
    (entryId: string) =>
    (model: Model, nextAnimation: Entry['animation']): Model =>
      updateEntry(model, entryId, entry =>
        evo(entry, { animation: () => nextAnimation }),
      )

  const toGotAnimationMessage =
    (entryId: string) =>
    (message: AnimationMessage): Message =>
      MessageSchema.GotAnimationMessage({ entryId, message })

  const toDismissedToastOutMessage: (
    payload: A,
  ) => (outMessage: AnimationOutMessage) => OutMessage | undefined = payload =>
    Match.type<AnimationOutMessage>().pipe(
      Match.withReturnType<OutMessage | undefined>(),
      Match.tagsExhaustive({
        StartedLeaveAnimating: () => undefined,
        TransitionedOut: () => OutMessageSchema.DismissedToast({ payload }),
      }),
    )

  const foldEntryAnimationOutMessage: (
    entryId: string,
  ) => (
    outMessage: AnimationOutMessage,
    context: Update.FoldContext<AnimationMessage, Message>,
  ) => Update.Step<Model, Message> =
    entryId =>
    (outMessage, { liftCommand }) =>
      AnimationOutMessage.match<Update.Step<Model, Message>>(outMessage, {
        StartedLeaveAnimating: () => model =>
          Option.match(readEntryAnimation(entryId)(model), {
            onNone: () => ({ model }),
            onSome: animation => ({
              model,
              commands: [liftCommand(animationDefaultLeaveCommand(animation))],
            }),
          }),
        TransitionedOut: () => model => ({
          model: removeEntry(model, entryId),
        }),
      })

  const foldEntryAnimation = (entry: Entry) =>
    Update.foldChild({
      update: animationUpdate,
      read: readEntryAnimation(entry.id),
      write: writeEntryAnimation(entry.id),
      toParentMessage: toGotAnimationMessage(entry.id),
      toParentOutMessage: toDismissedToastOutMessage(entry.payload),
      foldOutMessage: foldEntryAnimationOutMessage(entry.id),
    })

  const foldEntryAnimationShow = (entry: Entry) =>
    Update.foldChildStep({
      update: (animation: AnimationModel) =>
        animationUpdate(animation, AnimationMessage.Showed()),
      read: readEntryAnimation(entry.id),
      write: writeEntryAnimation(entry.id),
      toParentMessage: toGotAnimationMessage(entry.id),
    })

  const foldEntryAnimationHide = (entry: Entry) =>
    Update.foldChildStep({
      update: (animation: AnimationModel) =>
        animationUpdate(animation, AnimationMessage.Hid()),
      read: readEntryAnimation(entry.id),
      write: writeEntryAnimation(entry.id),
      toParentMessage: toGotAnimationMessage(entry.id),
    })

  const delegateToEntryAnimation = (
    model: Model,
    entryId: string,
    animationMessage: AnimationMessage,
  ): UpdateReturn =>
    Option.match(
      Array.findFirst(model.entries, ({ id }) => id === entryId),
      {
        onNone: (): UpdateReturn => ({ model }),
        onSome: entry => foldEntryAnimation(entry)(model, animationMessage),
      },
    )

  const createEntry = (model: Model, input: ShowInput<A>): Entry => {
    const entryId = `${model.id}-entry-${model.nextEntryKey}`

    const duration =
      input.duration === undefined
        ? model.defaultDuration
        : Duration.fromInputUnsafe(input.duration)

    const maybeDuration = OptionExt.when(!input.sticky, duration)

    return {
      id: entryId,
      variant: input.variant ?? DEFAULT_VARIANT,
      animation: animationInit({ id: entryId, isShowing: false }),
      maybeDuration,
      pendingDismissVersion: 0,
      isHovered: false,
      swipeState: SwipeState.Idle(),
      swipeVersion: 0,
      payload: input.payload,
    }
  }

  /** Creates an initial toast container model from a config. Starts empty
   *  with swipe disabled unless `swipeToDismiss` opts in. */
  const init = (config: InitConfig): Model => ({
    id: config.id,
    defaultDuration:
      config.defaultDuration === undefined
        ? DEFAULT_DURATION
        : Duration.fromInputUnsafe(config.defaultDuration),
    entries: [],
    nextEntryKey: 0,
    maybeSwipeThreshold:
      config.swipeToDismiss === undefined
        ? Option.none()
        : Option.some(
            config.swipeToDismiss.threshold ?? DEFAULT_SWIPE_THRESHOLD,
          ),
  })

  /** Processes a Toast Message and returns the next Model, optional Commands,
   *  and an optional `DismissedToast` OutMessage emitted once an entry has
   *  finished its leave animation. */
  const update = (model: Model, message: Message) =>
    MessageSchema.match<UpdateReturn>(message, {
      Added: ({ entry }) => {
        return Update.combine(model, [
          stepModel => ({
            model: evo(stepModel, {
              entries: entries => Array.append(entries, entry),
              nextEntryKey: Number.increment,
            }),
          }),
          foldEntryAnimationShow(entry),
          stepModel => ({
            model: stepModel,
            commands: Option.match(
              Array.findFirst(stepModel.entries, ({ id }) => id === entry.id),
              {
                onNone: () => [],
                onSome: found => rescheduleDismissCommands(found),
              },
            ),
          }),
        ])
      },

      Dismissed: ({ entryId }) => {
        const maybeEntry = Array.findFirst(
          model.entries,
          ({ id }) => id === entryId,
        )

        return Option.match(maybeEntry, {
          onNone: (): UpdateReturn => ({ model }),
          onSome: entry => {
            if (isEntryLeaving(entry)) {
              return { model }
            } else {
              return foldEntryAnimationHide(entry)(model)
            }
          },
        })
      },

      DismissedAll: () =>
        Update.combine(
          model,
          pipe(
            model.entries,
            Array.filter(entry => !isEntryLeaving(entry)),
            Array.map(foldEntryAnimationHide),
          ),
        ),

      CompletedWaitBeforeDismissal: ({ entryId, version }) => {
        const maybeEntry = Array.findFirst(
          model.entries,
          ({ id }) => id === entryId,
        )

        return Option.match(maybeEntry, {
          onNone: (): UpdateReturn => ({ model }),
          onSome: entry => {
            const isStale = version !== entry.pendingDismissVersion
            if (isStale || isEntryLeaving(entry)) {
              return { model }
            } else {
              return foldEntryAnimationHide(entry)(model)
            }
          },
        })
      },

      HoveredEntry: ({ entryId }) => ({
        model: updateEntry(model, entryId, entry =>
          evo(entry, {
            isHovered: () => true,
            pendingDismissVersion: Number.increment,
          }),
        ),
      }),

      LeftEntry: ({ entryId }) => {
        const maybeEntry = Array.findFirst(
          model.entries,
          ({ id }) => id === entryId,
        )

        return Option.match(maybeEntry, {
          onNone: (): UpdateReturn => ({ model }),
          onSome: entry => {
            const nextEntry: Entry = evo(entry, {
              isHovered: () => false,
              pendingDismissVersion: Number.increment,
            })
            const nextModel = updateEntry(model, entryId, () => nextEntry)
            return {
              model: nextModel,
              commands: rescheduleDismissCommands(nextEntry),
            }
          },
        })
      },

      PressedEntryPointer: ({ entryId, pointerId, clientX }) => {
        if (Option.isNone(model.maybeSwipeThreshold)) {
          return { model }
        }
        const maybeEntry = Array.findFirst(
          model.entries,
          ({ id }) => id === entryId,
        )
        return Option.match(maybeEntry, {
          onNone: (): UpdateReturn => ({ model }),
          onSome: entry => {
            if (
              isEntryLeaving(entry) ||
              Option.isSome(activePointerId(model))
            ) {
              return { model }
            } else {
              const nextEntry = evo(entry, {
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

      MovedSwipePointer: ({ pointerId, clientX }) =>
        Option.match(findDraggingEntry(model, pointerId), {
          onNone: (): UpdateReturn => ({ model }),
          onSome: ({ entryId, startX }) => ({
            model: updateEntry(model, entryId, entry =>
              evo(entry, {
                swipeState: () =>
                  SwipeState.Dragging({
                    pointerId,
                    startX,
                    currentX: clientX,
                  }),
              }),
            ),
          }),
        }),

      ReleasedSwipePointer: ({ pointerId, clientX }) =>
        Option.match(findDraggingEntry(model, pointerId), {
          onNone: (): UpdateReturn => ({ model }),
          onSome: ({ entryId, startX }) => {
            const offset = clientX - startX
            const threshold = Option.getOrElse(
              model.maybeSwipeThreshold,
              () => DEFAULT_SWIPE_THRESHOLD,
            )
            return Option.match(
              Array.findFirst(model.entries, ({ id }) => id === entryId),
              {
                onNone: (): UpdateReturn => ({ model }),
                onSome: entry => {
                  if (Math.abs(offset) >= threshold) {
                    const nextVersion = Number.increment(entry.swipeVersion)
                    const nextEntry = evo(entry, {
                      swipeState: () =>
                        SwipeState.Settling({ offsetX: offset }),
                      swipeVersion: () => nextVersion,
                    })
                    const settlingModel = updateEntry(
                      model,
                      entryId,
                      () => nextEntry,
                    )
                    if (isEntryLeaving(entry)) {
                      return { model: settlingModel }
                    } else {
                      return foldEntryAnimationHide(entry)(settlingModel)
                    }
                  } else {
                    return settleSnapBack(model, entry)
                  }
                },
              },
            )
          },
        }),

      CancelledSwipe: ({ pointerId }) =>
        Option.match(findDraggingEntry(model, pointerId), {
          onNone: (): UpdateReturn => ({ model }),
          onSome: ({ entryId }) =>
            Option.match(
              Array.findFirst(model.entries, ({ id }) => id === entryId),
              {
                onNone: (): UpdateReturn => ({ model }),
                onSome: entry => settleSnapBack(model, entry),
              },
            ),
        }),

      CompletedWaitForSwipeSettled: ({ entryId, version }) =>
        Option.match(
          Array.findFirst(model.entries, ({ id }) => id === entryId),
          {
            onNone: (): UpdateReturn => ({ model }),
            onSome: entry => {
              if (
                isSettling(entry.swipeState) &&
                entry.swipeVersion === version
              ) {
                return {
                  model: updateEntry(model, entryId, current =>
                    evo(current, { swipeState: () => SwipeState.Idle() }),
                  ),
                }
              } else {
                return { model }
              }
            },
          },
        ),

      GotAnimationMessage: ({ entryId, message: animationMessage }) =>
        delegateToEntryAnimation(model, entryId, animationMessage),
    })

  /** Adds a new toast entry. */
  const show = (model: Model, input: ShowInput<A>): UpdateReturn =>
    update(model, MessageSchema.Added({ entry: createEntry(model, input) }))

  /** Begins dismissing a specific entry. */
  const dismiss = (model: Model, entryId: string): UpdateReturn =>
    update(model, MessageSchema.Dismissed({ entryId }))

  /** Begins dismissing every currently-visible entry. */
  const dismissAll = (model: Model): UpdateReturn =>
    update(model, MessageSchema.DismissedAll())

  const swipeDependencies = (model: Model) => ({
    isSwipeEnabled: Option.isSome(model.maybeSwipeThreshold),
    maybeActivePointerId: activePointerId(model),
  })

  const subscriptions = Subscription.make<Model, Message>()(entry => ({
    swipePointer: entry(
      {
        isSwipeEnabled: Schema.Boolean,
        maybeActivePointerId: Schema.Option(Schema.Number),
      },
      {
        modelToDependencies: swipeDependencies,
        dependenciesToStream: ({ isSwipeEnabled, maybeActivePointerId }) => {
          const moveStream = Subscription.fromEvent<PointerEvent, Message>({
            target: document,
            type: 'pointermove',
            toMessage: event =>
              MessageSchema.MovedSwipePointer({
                pointerId: event.pointerId,
                clientX: event.clientX,
              }),
          })
          const upStream = Subscription.fromEvent<PointerEvent, Message>({
            target: document,
            type: 'pointerup',
            toMessage: event =>
              MessageSchema.ReleasedSwipePointer({
                pointerId: event.pointerId,
                clientX: event.clientX,
              }),
          })
          const cancelStream = Subscription.fromEvent<PointerEvent, Message>({
            target: document,
            type: 'pointercancel',
            toMessage: event =>
              MessageSchema.CancelledSwipe({ pointerId: event.pointerId }),
          })
          const pointerEvents = Stream.merge(
            Stream.merge(moveStream, upStream),
            cancelStream,
          )

          const documentSwipeStyles = Stream.callback<never>(() =>
            Effect.acquireRelease(
              Effect.sync(() => {
                document.documentElement.style.setProperty(
                  'user-select',
                  'none',
                )
                document.documentElement.style.setProperty(
                  '-webkit-user-select',
                  'none',
                )
                const cursorStyle = document.createElement('style')
                cursorStyle.textContent = '* { cursor: grabbing !important; }'
                document.head.appendChild(cursorStyle)
                return cursorStyle
              }),
              cursorStyle =>
                Effect.sync(() => {
                  document.documentElement.style.removeProperty('user-select')
                  document.documentElement.style.removeProperty(
                    '-webkit-user-select',
                  )
                  cursorStyle.remove()
                }),
            ).pipe(Effect.flatMap(() => Effect.never)),
          )

          return Stream.when(
            Stream.merge(pointerEvents, documentSwipeStyles),
            Effect.sync(
              () => isSwipeEnabled && Option.isSome(maybeActivePointerId),
            ),
          )
        },
      },
    ),

    swipeEscape: entry(
      {
        isSwipeEnabled: Schema.Boolean,
        maybeActivePointerId: Schema.Option(Schema.Number),
      },
      {
        modelToDependencies: swipeDependencies,
        dependenciesToStream: ({ isSwipeEnabled, maybeActivePointerId }) =>
          Stream.when(
            Subscription.fromEventFilterMap<KeyboardEvent, Message>({
              target: document,
              type: 'keydown',
              toMessage: event =>
                event.key === 'Escape'
                  ? Option.map(maybeActivePointerId, pointerId =>
                      MessageSchema.CancelledSwipe({ pointerId }),
                    )
                  : Option.none(),
            }),
            Effect.sync(
              () => isSwipeEnabled && Option.isSome(maybeActivePointerId),
            ),
          ),
      },
    ),
  }))

  return {
    Entry: EntrySchema,
    Model: ModelSchema,
    Message: MessageSchema,
    OutMessage: OutMessageSchema,
    Added,
    DismissedToast,
    init,
    update,
    show,
    dismiss,
    dismissAll,
    subscriptions,
    swipeOffset,
  } as const
}
