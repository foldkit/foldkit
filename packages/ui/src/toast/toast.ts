import { Effect, Layer, Match, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type * as BlockTypes from 'foldkit/block'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'

import * as Animation from '../animation/index.js'
import {
  type InitConfig,
  Position,
  SwipeState,
  Variant,
  type makeEntry,
  type makeMessage,
  type makeModel,
  type makeOutMessage,
} from './schema.js'
import { isSwipeExcludedTarget } from './swipeTarget.js'
import { type ToastTest, makeTest } from './test.js'
import {
  type ShowInput,
  WaitBeforeDismissal,
  WaitForSwipeSettled,
  commandHandlers,
  makeRuntime,
  swipeDependencies,
  swipeEscapeMessages,
  swipeOffset,
  swipePointerMessages,
} from './update.js'

export type {
  CompletedWaitBeforeDismissal,
  Dismissed,
  RequestedDismiss,
  RequestedDismissAll,
  PressedEntryPointer,
  MovedSwipePointer,
  ReleasedSwipePointer,
  CancelledSwipe,
  PressedEscape,
  CompletedWaitForSwipeSettled,
  HoveredEntry,
  InitConfig,
  LeftEntry,
  SwipeToDismissConfig,
} from './schema.js'
export type { ShowInput } from './update.js'

export {
  Message,
  Variant,
  Position,
  SwipeDirection,
  SwipeState,
  DEFAULT_SWIPE_DIRECTION,
  DEFAULT_SWIPE_THRESHOLD,
  SWIPE_SETTLE_DURATION,
} from './schema.js'

export {
  WaitBeforeDismissal,
  WaitForSwipeSettled,
  swipeOffset,
} from './update.js'

// VIEW

type VariantRole = 'status' | 'alert'

const variantToRole = (variant: Variant): VariantRole =>
  Match.value(variant).pipe(
    Match.withReturnType<VariantRole>(),
    Match.when('Info', () => 'status'),
    Match.when('Success', () => 'status'),
    Match.when('Warning', () => 'alert'),
    Match.when('Error', () => 'alert'),
    Match.exhaustive,
  )

const positionToContainerStyle = (
  position: Position,
): Readonly<Record<string, string>> => {
  const base: Readonly<Record<string, string>> = {
    position: 'fixed',
    display: 'flex',
    gap: '8px',
    padding: '16px',
    pointerEvents: 'none',
    zIndex: '2147483600',
  }

  return Match.value(position).pipe(
    Match.withReturnType<Readonly<Record<string, string>>>(),
    Match.when('TopLeft', () => ({
      ...base,
      top: '0',
      left: '0',
      flexDirection: 'column-reverse',
    })),
    Match.when('TopCenter', () => ({
      ...base,
      top: '0',
      left: '50%',
      transform: 'translateX(-50%)',
      flexDirection: 'column-reverse',
    })),
    Match.when('TopRight', () => ({
      ...base,
      top: '0',
      right: '0',
      flexDirection: 'column-reverse',
    })),
    Match.when('BottomLeft', () => ({
      ...base,
      bottom: '0',
      left: '0',
      flexDirection: 'column',
    })),
    Match.when('BottomCenter', () => ({
      ...base,
      bottom: '0',
      left: '50%',
      transform: 'translateX(-50%)',
      flexDirection: 'column',
    })),
    Match.when('BottomRight', () => ({
      ...base,
      bottom: '0',
      right: '0',
      flexDirection: 'column',
    })),
    Match.exhaustive,
  )
}

/** Handlers passed to `entryToView`. Spread `dismiss` onto a close button's
 *  attributes to dispatch `Dismissed` for this entry. */
export type EntryHandlers = Readonly<{
  dismiss: ReadonlyArray<ChildAttribute>
}>

const DEFAULT_ARIA_LABEL = 'Notifications'

const LEFT_MOUSE_BUTTON = 0

/** Per-render input a parent passes to `model.toast.view(...)`. */
export type ViewInputs<Entry> = Readonly<{
  position: Position
  entryToView: (entry: Entry, handlers: EntryHandlers) => Html
  ariaLabel?: string
  containerClassName?: string
  entryClassName?: string
}>

/** The contract every Toast class declares, refined to one payload Schema. */
export type Contract<A, I> = Readonly<{
  Model: ReturnType<typeof makeModel<A, I>>
  Message: ReturnType<typeof makeMessage<A, I>>
  OutMessage: ReturnType<typeof makeOutMessage<A, I>>
  Command: ReadonlyArray<
    typeof WaitBeforeDismissal | typeof WaitForSwipeSettled
  >
}>

/** One toast entry of a Toast refined to one payload Schema. */
export type Entry<A, I> = ReturnType<typeof makeEntry<A, I>>['Type']

/** A Toast instance refined to one payload Schema. */
export interface Toast<A, I> extends BlockTypes.Instance<
  Toast<A, I>,
  Contract<A, I>,
  InitConfig,
  ViewInputs<Entry<A, I>>
> {}

/** A Toast Block class refined to one payload Schema, with its Layer, its
 *  `requestShow` Message constructor, and its test helpers. */
export type Completed<A, I> = BlockTypes.BlockClass<
  Toast<A, I>,
  'Toast',
  InitConfig,
  ViewInputs<Entry<A, I>>,
  never,
  Contract<A, I>
> &
  Readonly<{
    Live: Layer.Layer<Toast<A, I>>
    requestShow: (
      input: ShowInput<A>,
    ) => ReturnType<typeof makeMessage<A, I>>['RequestedShow']['Type']
    test: ToastTest
  }>

/**
 * Factory that creates a `Toast` Block class for a user-provided payload
 * Schema. The returned class carries its implementation Layer as `Live`,
 * `requestShow` for building a `RequestedShow` Message from a show input, and
 * Story helpers under `test`.
 *
 * The payload is whatever content shape the consumer supplies via Schema.
 * The Block never reads it. It flows through to `entryToView`. The Block
 * owns the entry's lifecycle, accessibility role, dismiss timer, hover state,
 * and swipe state.
 *
 * Put the class in your parent Model, create the instance with
 * `yield* new AppToast('toast', { id: 'toast' })`, and provide
 * `AppToast.Live`. Send `AppToast.requestShow({ payload })`,
 * `AppToast.Message.RequestedDismiss({ entryId })`, and
 * `AppToast.Message.RequestedDismissAll()` with
 * `model.toast.send(...)`, and handle `DismissedToast` with `.on`.
 *
 * Renders a headless toast stack. The `<div>` container is always present in
 * the DOM so screen readers can observe its `aria-live` region from page load.
 * Each entry becomes a `<div>` keyed by its id, with animation data attributes
 * (`data-enter`, `data-leave`, `data-transition`, `data-closed`) and
 * `data-variant` reflecting the entry's variant. When swipe is enabled via
 * `swipeToDismiss`, entries also carry `data-swipe` (`move` while dragging,
 * `settling` while returning to rest, and `end` while dismissing) with an
 * inline `translate` property. On a successful swipe, the entry moves from its
 * release offset to `100vw` or `-100vw` when leave animation begins. The
 * offset lives on `translate` rather than `transform` so it composes with your
 * `transform` animations instead of overriding them.
 *
 * @example
 * ```ts
 * const ToastPayload = Schema.Struct({
 *   bodyText: Schema.String,
 *   maybeLink: Schema.Option(Schema.Struct({
 *     href: Schema.String,
 *     text: Schema.String,
 *   })),
 * })
 * export const AppToast = Toast.makeBlock(ToastPayload)
 * ```
 */
export const makeBlock = <A, I>(
  payloadSchema: Schema.Codec<A, I>,
): Completed<A, I> => {
  const runtime = makeRuntime(payloadSchema)
  type Entry = typeof runtime.Entry.Type
  type Model = typeof runtime.Model.Type
  type ToastMessage = typeof runtime.Message.Type

  const contract: Contract<A, I> = {
    Model: runtime.Model,
    Message: runtime.Message,
    OutMessage: runtime.OutMessage,
    Command: [WaitBeforeDismissal, WaitForSwipeSettled],
  }

  const ToastClass = Block<Toast<A, I>, InitConfig, ViewInputs<Entry>>()(
    'Toast',
    contract,
  )

  const ToastLive = ToastClass.make(
    Effect.fn(function* (_instanceId, config) {
      const entryAnimation = yield* Animation.Animation.each('entries', {
        isShowing: false,
      })

      return {
        model: runtime.initialModel(config),

        update: {
          ...runtime.makeUpdate(entryAnimation),
          ...entryAnimation.on<Model>(runtime.entryAnimationHandlers),
        },

        commands: commandHandlers,

        subscriptions: {
          swipePointer: {
            dependencies: swipeDependencies,
            stream: swipePointerMessages,
          },
          swipeEscape: {
            dependencies: swipeDependencies,
            stream: swipeEscapeMessages,
          },
        },

        view: (model, h, viewInputs) => {
          const { id, entries } = model
          const {
            position,
            entryToView,
            ariaLabel = DEFAULT_ARIA_LABEL,
            containerClassName,
            entryClassName,
          } = viewInputs

          const containerAttributes = [
            h.Id(id),
            h.Role('region'),
            h.AriaLabel(ariaLabel),
            h.AriaLive('polite'),
            h.Style(positionToContainerStyle(position)),
            ...(containerClassName ? [h.Class(containerClassName)] : []),
          ]

          const renderEntryItem = (entry: Entry): Html => {
            const { transitionState } = entry.animation.model

            const entrySwipeOffset = swipeOffset(entry.swipeState)
            const maybeSwipePhase = SwipeState.match<
              Option.Option<'move' | 'settling' | 'end'>
            >(entry.swipeState, {
              Idle: () => Option.none(),
              Dragging: () => Option.some('move'),
              Settling: () => Option.some('settling'),
              Dismissing: () => Option.some('end'),
            })
            const swipeExitTranslate = SwipeState.match<string | undefined>(
              entry.swipeState,
              {
                Idle: () => undefined,
                Dragging: () => undefined,
                Settling: () => undefined,
                Dismissing: ({ direction }) => {
                  if (transitionState !== 'LeaveAnimating') {
                    return undefined
                  }

                  return Match.value(direction).pipe(
                    Match.when('Right', () => '100vw'),
                    Match.when('Left', () => '-100vw'),
                    Match.exhaustive,
                  )
                },
              },
            )
            const swipeTranslate =
              swipeExitTranslate ??
              (entrySwipeOffset !== 0
                ? `${String(entrySwipeOffset)}px`
                : undefined)
            const swipeAttributes = Option.match(maybeSwipePhase, {
              onNone: () => [],
              onSome: phase => [h.DataAttribute('swipe', phase)],
            })

            const handlePointerDown = (
              pointerType: string,
              button: number,
              _screenX: number,
              _screenY: number,
              _timeStamp: number,
              clientX: number,
              _clientY: number,
              pointerId: number,
              target: EventTarget | null,
            ): Option.Option<ToastMessage> => {
              if (
                (pointerType === 'mouse' && button !== LEFT_MOUSE_BUTTON) ||
                isSwipeExcludedTarget(pointerType, target)
              ) {
                return Option.none()
              } else {
                return Option.some(
                  runtime.Message.PressedEntryPointer({
                    entryId: entry.id,
                    pointerId,
                    clientX,
                  }),
                )
              }
            }

            const itemAttributes = [
              h.Role(variantToRole(entry.variant)),
              h.AriaAtomic(true),
              h.DataAttribute('variant', entry.variant),
              h.Style({
                pointerEvents: 'auto',
                ...(Option.isSome(model.maybeSwipeConfig)
                  ? { touchAction: 'pan-y' }
                  : {}),
                ...(swipeTranslate !== undefined
                  ? {
                      translate: swipeTranslate,
                      '--toast-swipe-move-x': `${String(entrySwipeOffset)}px`,
                    }
                  : {}),
              }),
              h.OnMouseEnter(
                runtime.Message.HoveredEntry({ entryId: entry.id }),
              ),
              h.OnMouseLeave(runtime.Message.LeftEntry({ entryId: entry.id })),
              ...(Option.isSome(model.maybeSwipeConfig)
                ? [h.OnPointerDown(handlePointerDown)]
                : []),
              ...swipeAttributes,
              ...(entryClassName ? [h.Class(entryClassName)] : []),
            ]

            const handlers: EntryHandlers = {
              dismiss: childAttributes([
                h.OnClick(runtime.Message.Dismissed({ entryId: entry.id })),
              ]),
            }

            return entry.animation.view({
              toView: () => entryToView(entry, handlers),
              attributes: childAttributes(itemAttributes),
            })
          }

          return h.keyed('div')(
            id,
            containerAttributes,
            entries.map(renderEntryItem),
          )
        },
      }
    }),
  ).pipe(Layer.provide(Animation.AnimationLive))

  return Object.assign(ToastClass, {
    Live: ToastLive,
    requestShow: runtime.requestShow,
    test: makeTest(),
  })
}
