import {
  Array,
  Duration,
  Effect,
  Match as M,
  Number,
  Option,
  Schema as S,
} from 'effect'

import * as Command from '../../command/index.js'
import { OptionExt } from '../../effectExtensions/index.js'
import { evo } from '../../struct/index.js'
import {
  Hid as AnimationHid,
  type Message as AnimationMessage,
  type OutMessage as AnimationOutMessage,
  Showed as AnimationShowed,
  init as animationInit,
} from '../animation/schema.js'
import {
  defaultLeaveCommand as animationDefaultLeaveCommand,
  update as animationUpdate,
} from '../animation/update.js'
import {
  DEFAULT_DURATION,
  Dismissed,
  DismissedAll,
  ElapsedDuration,
  GotAnimationMessage,
  type InitConfig,
  type Variant,
  makeAdded,
  makeDismissedToast,
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
export const DismissAfter = Command.define(
  'DismissAfter',
  {
    entryId: S.String,
    version: S.Number,
    duration: S.DurationFromMillis,
  },
  ElapsedDuration,
)(({ entryId, version, duration }) =>
  Effect.sleep(duration).pipe(Effect.as(ElapsedDuration({ entryId, version }))),
)

const DEFAULT_VARIANT: Variant = 'Info'

/** Factory that binds Toast's runtime (update fn, helpers, commands) to a
 *  specific payload schema. Called by `make` in index.ts; inner helpers close
 *  over the payload-specific Entry / Model / Added types so generics don't
 *  have to propagate through every helper signature.
 *
 *  @internal Consumers should use `Ui.Toast.make(PayloadSchema)`. This is
 *  only exported so `index.ts` can wire the view into the bound runtime. */
export const makeRuntime = <A, I>(payloadSchema: S.Codec<A, I>) => {
  const EntrySchema = makeEntry(payloadSchema)
  const ModelSchema = makeModel(payloadSchema)
  const MessageSchema = makeMessage(payloadSchema)
  const OutMessageSchema = makeOutMessage(payloadSchema)
  const Added = makeAdded(payloadSchema)
  const DismissedToast = makeDismissedToast(payloadSchema)

  type Entry = typeof EntrySchema.Type
  type Model = typeof ModelSchema.Type
  type Message = typeof MessageSchema.Type
  type OutMessage = typeof OutMessageSchema.Type

  type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage>,
  ]
  const withUpdateReturn = M.withReturnType<UpdateReturn>()

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
  ): Command.Command<Message> => DismissAfter({ entryId, version, duration })

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

  const delegateToEntryAnimation = (
    model: Model,
    entryId: string,
    animationMessage: AnimationMessage,
  ): UpdateReturn => {
    const maybeEntry = Array.findFirst(
      model.entries,
      ({ id }) => id === entryId,
    )

    return Option.match(maybeEntry, {
      onNone: (): UpdateReturn => [model, [], Option.none()],
      onSome: entry => {
        const [nextAnimation, animationCommands, maybeOutMessage] =
          animationUpdate(entry.animation, animationMessage)

        const toMessage = (message: AnimationMessage): Message =>
          GotAnimationMessage({ entryId, message })

        const mappedCommands = Command.mapMessages(animationCommands, toMessage)

        const nextEntry: Entry = evo(entry, {
          animation: () => nextAnimation,
        })

        return Option.match(maybeOutMessage, {
          onNone: (): UpdateReturn => [
            updateEntry(model, entryId, () => nextEntry),
            mappedCommands,
            Option.none(),
          ],
          onSome: M.type<AnimationOutMessage>().pipe(
            withUpdateReturn,
            M.tagsExhaustive({
              StartedLeaveAnimating: () => [
                updateEntry(model, entryId, () => nextEntry),
                [
                  ...mappedCommands,
                  Command.mapMessage(
                    animationDefaultLeaveCommand(nextAnimation),
                    toMessage,
                  ),
                ],
                Option.none(),
              ],
              TransitionedOut: () => [
                removeEntry(model, entryId),
                mappedCommands,
                Option.some(DismissedToast({ payload: entry.payload })),
              ],
            }),
          ),
        })
      },
    })
  }

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
  })

  /** Processes a toast message and returns the next model, commands, and
   *  an optional `DismissedToast` OutMessage emitted once an entry has
   *  finished its leave animation. */
  const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
      withUpdateReturn,
      M.tagsExhaustive({
        Added: ({ entry }) => {
          const modelWithEntry = evo(model, {
            entries: entries => Array.append(entries, entry),
            nextEntryKey: Number.increment,
          })

          const [modelAfterShow, showCommands] = delegateToEntryAnimation(
            modelWithEntry,
            entry.id,
            AnimationShowed(),
          )

          const postShowEntry = Array.findFirst(
            modelAfterShow.entries,
            ({ id }) => id === entry.id,
          )

          const dismissCommands = Option.match(postShowEntry, {
            onNone: () => [],
            onSome: rescheduleDismissCommands,
          })

          return [
            modelAfterShow,
            [...showCommands, ...dismissCommands],
            Option.none(),
          ]
        },

        Dismissed: ({ entryId }) => {
          const maybeEntry = Array.findFirst(
            model.entries,
            ({ id }) => id === entryId,
          )

          return Option.match(maybeEntry, {
            onNone: (): UpdateReturn => [model, [], Option.none()],
            onSome: entry => {
              if (isEntryLeaving(entry)) {
                return [model, [], Option.none()]
              } else {
                return delegateToEntryAnimation(model, entryId, AnimationHid())
              }
            },
          })
        },

        DismissedAll: () =>
          Array.reduce<Entry, UpdateReturn>(
            model.entries,
            [model, [], Option.none()],
            ([currentModel, currentCommands, currentOut], entry) => {
              if (isEntryLeaving(entry)) {
                return [currentModel, currentCommands, currentOut]
              }
              const [nextModel, nextCommands] = delegateToEntryAnimation(
                currentModel,
                entry.id,
                AnimationHid(),
              )
              return [
                nextModel,
                [...currentCommands, ...nextCommands],
                currentOut,
              ]
            },
          ),

        ElapsedDuration: ({ entryId, version }) => {
          const maybeEntry = Array.findFirst(
            model.entries,
            ({ id }) => id === entryId,
          )

          return Option.match(maybeEntry, {
            onNone: (): UpdateReturn => [model, [], Option.none()],
            onSome: entry => {
              const isStale = version !== entry.pendingDismissVersion
              if (isStale || isEntryLeaving(entry)) {
                return [model, [], Option.none()]
              } else {
                return delegateToEntryAnimation(model, entryId, AnimationHid())
              }
            },
          })
        },

        HoveredEntry: ({ entryId }) => [
          updateEntry(model, entryId, entry =>
            evo(entry, {
              isHovered: () => true,
              pendingDismissVersion: Number.increment,
            }),
          ),
          [],
          Option.none(),
        ],

        LeftEntry: ({ entryId }) => {
          const maybeEntry = Array.findFirst(
            model.entries,
            ({ id }) => id === entryId,
          )

          return Option.match(maybeEntry, {
            onNone: (): UpdateReturn => [model, [], Option.none()],
            onSome: entry => {
              const nextEntry: Entry = evo(entry, {
                isHovered: () => false,
                pendingDismissVersion: Number.increment,
              })
              return [
                updateEntry(model, entryId, () => nextEntry),
                rescheduleDismissCommands(nextEntry),
                Option.none(),
              ]
            },
          })
        },

        GotAnimationMessage: ({ entryId, message: animationMessage }) =>
          delegateToEntryAnimation(model, entryId, animationMessage),
      }),
    )

  /** Adds a new toast entry. */
  const show = (model: Model, input: ShowInput<A>): UpdateReturn =>
    update(model, Added({ entry: createEntry(model, input) }))

  /** Begins dismissing a specific entry. */
  const dismiss = (model: Model, entryId: string): UpdateReturn =>
    update(model, Dismissed({ entryId }))

  /** Begins dismissing every currently-visible entry. */
  const dismissAll = (model: Model): UpdateReturn =>
    update(model, DismissedAll())

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
