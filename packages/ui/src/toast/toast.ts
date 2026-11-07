import { Context, Effect, Layer, Match, Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { type Html, childAttributes } from 'foldkit/html'
import * as BlockFamily from 'foldkit/internal/block'

import { layer as AnimationLayer } from '../animation/index.js'
import { type EntryHandlers, Position, SwipeState, Variant } from './schema.js'
import { isSwipeExcludedTarget } from './swipeTarget.js'
import { type ToastTest, makeTest } from './test.js'
import { makeRuntime } from './update.js'

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
  InMessage,
  Variant,
  Position,
  SwipeDirection,
  SwipeState,
  DEFAULT_SWIPE_DIRECTION,
  DEFAULT_SWIPE_THRESHOLD,
  SWIPE_SETTLE_DURATION,
} from './schema.js'

export { swipeOffset } from './update.js'

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
export type { EntryHandlers } from './schema.js'

const DEFAULT_ARIA_LABEL = 'Notifications'

const LEFT_MOUSE_BUTTON = 0

const makeToastView = <A, I>(runtime: ToastRuntime<A, I>) => {
  const {
    ToastComposition,
    EntryAnimationBinding: EntriesAnimationBinding,
    ...toastRuntime
  } = runtime
  type Entry = typeof toastRuntime.Entry.Type

  type ToastMessage = typeof toastRuntime.Message.Type

  /** Renders a headless toast stack. The `<div>` container is always present
   *  in the DOM so screen readers can observe its `aria-live` region from
   *  page load. Each entry becomes a `<div>` keyed by its id, with
   *  animation data attributes (`data-enter`, `data-leave`,
   *  `data-transition`, `data-closed`) and `data-variant` reflecting the
   *  entry's variant. When swipe is enabled via `swipeToDismiss`, entries
   *  also carry `data-swipe` (`move` while dragging, `settling` while
   *  returning to rest, and `end` while dismissing) with an inline
   *  `translate` property. On a successful swipe, the entry moves from its
   *  release offset to `100vw` or `-100vw` when leave animation begins.
   *  The offset lives on `translate` rather than `transform` so it composes
   *  with your `transform` animations instead of overriding them. */
  const view = ToastComposition.makeView.withInputs((model, viewInputs, h) => {
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
      const { transitionState } = entry.animation

      const swipeOffset = toastRuntime.swipeOffset(entry.swipeState)
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
        (swipeOffset !== 0 ? `${String(swipeOffset)}px` : undefined)
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
            toastRuntime.Message.PressedEntryPointer({
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
                '--toast-swipe-move-x': `${String(swipeOffset)}px`,
              }
            : {}),
        }),
        h.OnMouseEnter(
          toastRuntime.Message.HoveredEntry({ entryId: entry.id }),
        ),
        h.OnMouseLeave(toastRuntime.Message.LeftEntry({ entryId: entry.id })),
        ...(Option.isSome(model.maybeSwipeConfig)
          ? [h.OnPointerDown(handlePointerDown)]
          : []),
        ...swipeAttributes,
        ...(entryClassName ? [h.Class(entryClassName)] : []),
      ]

      const handlers: EntryHandlers = {
        dismiss: childAttributes([
          h.OnClick(toastRuntime.Message.Dismissed({ entryId: entry.id })),
        ]),
      }

      return h.block(
        EntriesAnimationBinding.embedView({
          key: entry.id,
          slotId: entry.id,
          model: entry.animation,
          viewInputs: {
            toView: () => entryToView(entry, handlers),
            attributes: childAttributes(itemAttributes),
          },
        }),
      )
    }

    return h.keyed('div')(id, containerAttributes, entries.map(renderEntryItem))
  })

  return view
}

/** @internal Authors the Toast contract, private implementation and exact test tokens. */
export const makeFixture = <A, I>(payloadSchema: Schema.Codec<A, I>) => {
  const runtime = makeRuntime(payloadSchema)
  const { EntryAnimationBinding: EntriesAnimationBinding, ...toastRuntime } =
    runtime
  const view = makeToastView(runtime)

  const test = makeTest<ToastContract<A, I>>({
    block: () => block,
    entryAnimationBinding: EntriesAnimationBinding,
    waitBeforeDismissal: toastRuntime.WaitBeforeDismissal,
  })
  const publicTest: ToastTest<ToastContract<A, I>> = {
    drainEntry: test.drainEntry,
  }
  const block = BlockFamily.resolveFamily(
    runtime.ToastDefinition,
    ToastFamily,
    implementation => implementation.construct(runtime, view),
    { members: { test: publicTest } },
  )

  return {
    EntryAnimationBinding: EntriesAnimationBinding,
    ...toastRuntime,
    view,
    test,
    block,
  }
}

type ToastRuntime<A, I> = ReturnType<typeof makeRuntime<A, I>>
type ToastContract<A, I> = BlockFamily.UnifiedFamilyBlock<
  ToastRuntime<A, I>['ToastDefinition'],
  ToastFamily
>
type ToastView<A, I> = ReturnType<typeof makeToastView<A, I>>

interface ToastConstructor {
  <A, I>(
    runtime: ToastRuntime<A, I>,
    view: ToastView<A, I>,
  ): BlockFamily.FamilySpecializationLayer<
    Block.FamilyContractOf<ToastRuntime<A, I>['ToastDefinition']>
  >
}
interface ToastImplementation extends Block.FamilyLifetime {
  readonly construct: ToastConstructor
}

/** @internal Universal construction capability for payload-specific Toast stacks. */
export class ToastFamily extends Context.Service<
  ToastFamily,
  ToastImplementation
>()('@foldkit/ui/ToastFamily') {}

const constructToast: ToastConstructor = (runtime, view) =>
  runtime.ToastDefinition.makeLayer(
    Effect.gen(function* () {
      const children = yield* runtime.ToastComposition.acquireChildren()

      return {
        children,
        init: runtime.init,
        update: runtime.update,
        inMessageUpdate: runtime.inMessageUpdate,
        view,
        subscriptions: runtime.subscriptions,
        EffectsLayer: runtime.EffectsLayer,
      }
    }),
  ).pipe(Layer.provide(AnimationLayer))

/** Constructs Toast payload specializations and their private Animation dependency. */
export const layer = Layer.effect(ToastFamily)(
  Effect.gen(function* () {
    const lifetime = yield* Block.familyLifetime

    return { ...lifetime, construct: constructToast }
  }),
)

/** Passive Toast contract for one payload Schema, including occurrence-aware test helpers. */
export interface Completed<A, I> extends ToastContract<A, I> {
  readonly test: ToastTest<ToastContract<A, I>>
}

/** Creates a Toast contract; provide this module's layer when constructing its parent graph. */
export const makeBlock = <A, I>(
  payloadSchema: Schema.Codec<A, I>,
): Completed<A, I> => makeFixture(payloadSchema).block
