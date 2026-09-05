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

const SWIPE_THRESHOLD_FALLBACK = DEFAULT_SWIPE_THRESHOLD

const SwipeActivity = Schema.Literals(['Idle', 'Active'])

const swipeActivityFromState = (
  swipeState: typeof SwipeState.Type,
): typeof SwipeActivity.Type =>
  Match.value(swipeState).pipe(
    Match.withReturnType<typeof SwipeActivity.Type>(),
    Match.tag('Dragging', () => 'Active'),
    Match.orElse(() => 'Idle'),
  )

export const swipeOffsetForEntry = (
  swipeState: typeof SwipeState.Type,
  entryId: string,
): number =>
  Match.value(swipeState).pipe(
    Match.withReturnType<number>(),
    Match.tag('Dragging', dragging =>
      dragging.entryId === entryId ? dragging.currentX - dragging.startX : 0,
    ),
    Match.orElse(() => 0),
  )

const isSwipingEntry = (
  swipeState: typeof SwipeState.Type,
  entryId: string,
): boolean =>
  Match.value(swipeState).pipe(
    Match.withReturnType<boolean>(),
    Match.tag('Dragging', dragging => dragging.entryId === entryId),
    Match.orElse(() => false),
  )

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

  const scheduleDismiss = (
    entryId: string,
    version: number,
    duration: Duration.Duration,
  ): Command.Command<Message> =>
    WaitBeforeDismissal({ entryId, version, duration })

  const rescheduleDismissCommands = (
    model: Model,
    entry: Entry,
  ): ReadonlyArray<Command.Command<Message>> => {
    if (
      isEntryLeaving(entry) ||
      entry.isHovered ||
      isSwipingEntry(model.swipeState, entry.id)
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
      payload: input.payload,
    }
  }

  /** Creates an initial toast container model from a config. Starts empty. */
  const init = (config: InitConfig): Model => ({
    id: config.id,
    defaultDuration:
      config.defaultDuration === undefined
        ? DEFAULT_DURATION
        : Duration.fromInputUnsafe(config.defaultDuration),
    entries: [],
    nextEntryKey: 0,
    swipeState: SwipeState.Idle(),
    swipeThreshold: config.swipeThreshold ?? SWIPE_THRESHOLD_FALLBACK,
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
                onSome: found => rescheduleDismissCommands(stepModel, found),
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
              commands: rescheduleDismissCommands(nextModel, nextEntry),
            }
          },
        })
      },

      PressedEntryPointer: ({ entryId, clientX }) => {
        const maybeEntry = Array.findFirst(
          model.entries,
          ({ id }) => id === entryId,
        )
        return Option.match(maybeEntry, {
          onNone: (): UpdateReturn => ({ model }),
          onSome: entry => {
            if (isEntryLeaving(entry) || model.swipeState._tag === 'Dragging') {
              return { model }
            } else {
              const nextEntry = evo(entry, {
                pendingDismissVersion: Number.increment,
              })
              return {
                model: evo(
                  updateEntry(model, entryId, () => nextEntry),
                  {
                    swipeState: () =>
                      SwipeState.Dragging({
                        entryId,
                        startX: clientX,
                        currentX: clientX,
                      }),
                  },
                ),
              }
            }
          },
        })
      },

      MovedSwipePointer: ({ clientX }) =>
        Match.value(model.swipeState).pipe(
          Match.withReturnType<UpdateReturn>(),
          Match.tag('Dragging', dragging => ({
            model: evo(model, {
              swipeState: () =>
                SwipeState.Dragging({
                  ...dragging,
                  currentX: clientX,
                }),
            }),
          })),
          Match.orElse(() => ({ model })),
        ),

      ReleasedSwipePointer: ({ clientX }) =>
        Match.value(model.swipeState).pipe(
          Match.withReturnType<UpdateReturn>(),
          Match.tag('Dragging', dragging => {
            const offset = clientX - dragging.startX
            const entryId = dragging.entryId
            const maybeEntry = Array.findFirst(
              model.entries,
              ({ id }) => id === entryId,
            )
            return Option.match(maybeEntry, {
              onNone: (): UpdateReturn => ({
                model: evo(model, { swipeState: () => SwipeState.Idle() }),
              }),
              onSome: entry => {
                if (Math.abs(offset) >= model.swipeThreshold) {
                  const clearedModel = evo(model, {
                    swipeState: () => SwipeState.Idle(),
                  })
                  if (isEntryLeaving(entry)) {
                    return { model: clearedModel }
                  } else {
                    return foldEntryAnimationHide(entry)(clearedModel)
                  }
                } else {
                  const nextEntry = evo(entry, {
                    pendingDismissVersion: Number.increment,
                  })
                  const nextModel = evo(
                    updateEntry(model, entryId, () => nextEntry),
                    { swipeState: () => SwipeState.Idle() },
                  )
                  return {
                    model: nextModel,
                    commands: rescheduleDismissCommands(nextModel, nextEntry),
                  }
                }
              },
            })
          }),
          Match.orElse(() => ({ model })),
        ),

      CancelledSwipe: () =>
        Match.value(model.swipeState).pipe(
          Match.withReturnType<UpdateReturn>(),
          Match.tag('Dragging', dragging => {
            const entryId = dragging.entryId
            const maybeEntry = Array.findFirst(
              model.entries,
              ({ id }) => id === entryId,
            )
            return Option.match(maybeEntry, {
              onNone: (): UpdateReturn => ({
                model: evo(model, { swipeState: () => SwipeState.Idle() }),
              }),
              onSome: entry => {
                const nextEntry = evo(entry, {
                  pendingDismissVersion: Number.increment,
                })
                const nextModel = evo(
                  updateEntry(model, entryId, () => nextEntry),
                  { swipeState: () => SwipeState.Idle() },
                )
                return {
                  model: nextModel,
                  commands: rescheduleDismissCommands(nextModel, nextEntry),
                }
              },
            })
          }),
          Match.orElse(() => ({ model })),
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

  const subscriptions = Subscription.make<Model, Message>()(entry => ({
    swipePointer: entry(
      { swipeActivity: SwipeActivity },
      {
        modelToDependencies: model => ({
          swipeActivity: swipeActivityFromState(model.swipeState),
        }),
        dependenciesToStream: ({ swipeActivity }) => {
          const moveStream = Stream.fromEventListener<PointerEvent>(
            document,
            'pointermove',
          ).pipe(
            Stream.map(event =>
              MessageSchema.MovedSwipePointer({ clientX: event.clientX }),
            ),
          )
          const upStream = Stream.fromEventListener<PointerEvent>(
            document,
            'pointerup',
          ).pipe(
            Stream.map(event =>
              MessageSchema.ReleasedSwipePointer({
                clientX: event.clientX,
              }),
            ),
          )
          const cancelStream = Stream.fromEventListener<PointerEvent>(
            document,
            'pointercancel',
          ).pipe(Stream.map(() => MessageSchema.CancelledSwipe()))
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
            Effect.sync(() => swipeActivity === 'Active'),
          )
        },
      },
    ),

    swipeEscape: entry(
      { swipeActivity: SwipeActivity },
      {
        modelToDependencies: model => ({
          swipeActivity: swipeActivityFromState(model.swipeState),
        }),
        dependenciesToStream: ({ swipeActivity }) =>
          Stream.when(
            Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
              Stream.filter(({ key }) => key === 'Escape'),
              Stream.map(() => MessageSchema.CancelledSwipe()),
            ),
            Effect.sync(() => swipeActivity === 'Active'),
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
    swipeOffsetForEntry,
  } as const
}
