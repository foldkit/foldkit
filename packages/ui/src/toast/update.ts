import { Array, Duration, Effect, Number, Option, Schema, pipe } from 'effect'
import * as Command from 'foldkit/command'
import { evo } from 'foldkit/struct'
import * as Update from 'foldkit/update'

import * as Animation from '../animation/schema.js'
import {
  defaultLeaveCommand as animationDefaultLeaveCommand,
  hide as animationHide,
  show as animationShow,
  update as animationUpdate,
} from '../animation/update.js'
import * as OptionExt from '../internal/optionExtensions.js'
import {
  DEFAULT_DURATION,
  type InitConfig,
  Message as StaticMessage,
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
    entry: Entry,
  ): ReadonlyArray<Command.Command<Message>> => {
    if (isEntryLeaving(entry) || entry.isHovered) {
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
    (message: Animation.Message): Message =>
      MessageSchema.GotAnimationMessage({ entryId, message })

  const toDismissedToastOutMessage: (
    payload: A,
  ) => (outMessage: Animation.OutMessage) => OutMessage | undefined = payload =>
    Animation.OutMessage.match<OutMessage | undefined>({
      StartedLeaveAnimating: () => undefined,
      TransitionedOut: () => OutMessageSchema.DismissedToast({ payload }),
    })

  const foldEntryAnimationOutMessage: (
    entryId: string,
  ) => (
    outMessage: Animation.OutMessage,
    context: Update.FoldContext<Animation.Message, Message>,
  ) => Update.Step<Model, Message> =
    entryId =>
    (outMessage, { liftCommand }) =>
      Animation.OutMessage.match<Update.Step<Model, Message>>(outMessage, {
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
      update: animationShow,
      read: readEntryAnimation(entry.id),
      write: writeEntryAnimation(entry.id),
      toParentMessage: toGotAnimationMessage(entry.id),
    })

  const foldEntryAnimationHide = (entry: Entry) =>
    Update.foldChildStep({
      update: animationHide,
      read: readEntryAnimation(entry.id),
      write: writeEntryAnimation(entry.id),
      toParentMessage: toGotAnimationMessage(entry.id),
    })

  const delegateToEntryAnimation = (
    model: Model,
    entryId: string,
    animationMessage: Animation.Message,
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
      animation: Animation.init({ id: entryId, isShowing: false }),
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
                onSome: rescheduleDismissCommands,
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
            return {
              model: updateEntry(model, entryId, () => nextEntry),
              commands: rescheduleDismissCommands(nextEntry),
            }
          },
        })
      },

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
  } as const
}
