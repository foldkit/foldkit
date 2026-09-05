import { Equal, Match, Option, Schema } from 'effect'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'
import { defineView } from 'foldkit/submodel'

import { Position, Variant } from './schema.js'
import { makeRuntime } from './update.js'

export type {
  CompletedWaitBeforeDismissal,
  Dismissed,
  DismissedAll,
  GotAnimationMessage,
  PressedEntryPointer,
  MovedSwipePointer,
  ReleasedSwipePointer,
  CancelledSwipe,
  HoveredEntry,
  InitConfig,
  LeftEntry,
} from './schema.js'
export type { ShowInput } from './update.js'

export * as test from './test.js'

export {
  Message,
  Variant,
  Position,
  SwipeState,
  DEFAULT_SWIPE_THRESHOLD,
} from './schema.js'

export { WaitBeforeDismissal, swipeOffsetForEntry } from './update.js'

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
    margin: '0',
    listStyle: 'none',
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

/** Handlers passed to `entryToView`. Spread `dismiss` onto a close
 *  button's attribute array (typically inside `h.button([...dismiss])`)
 *  to let users dismiss the entry manually. The attribute carries the
 *  Toast's dismiss handler bound to this entry's id; it routes through
 *  the Toast boundary's wrap chain at click time. */
export type EntryHandlers = Readonly<{
  dismiss: ReadonlyArray<ChildAttribute>
}>

const DEFAULT_ARIA_LABEL = 'Notifications'

const LEFT_MOUSE_BUTTON = 0

/** Factory that binds `Toast` to a user-provided payload schema. The
 *  returned module contains everything needed to wire a toast stack into an
 *  app: `Model`, `Message`, `Entry`, `Added`, `init`, `update`, `show` /
 *  `dismiss` / `dismissAll` helpers, and the headless `view`.
 *
 *  The payload is whatever content shape the consumer supplies via Schema.
 *  The component never reads it. It flows through to `entryToView`. The
 *  component itself owns only lifecycle and a11y fields (id, variant,
 *  animation, dismiss timer, hover state).
 *
 *  Consume the bound module's exports everywhere. `Toast.Model` in your app
 *  Model, `Toast.Message` in your parent Message union, `Toast.show` /
 *  `Toast.dismiss` in your update, `Toast.view` in your view. The top-level
 *  exports (`Variant`, `Position`, static message tags,
 *  `WaitBeforeDismissal`) are
 *  payload-independent and safe to reference when you need them without a
 *  bound module, but the typical path is through the factory return.
 *
 *  @example
 *  ```ts
 *  const ToastPayload = Schema.Struct({
 *    bodyText: Schema.String,
 *    maybeLink: Schema.Option(Schema.Struct({
 *      href: Schema.String,
 *      text: Schema.String,
 *    })),
 *  })
 *  export const Toast = Toast.make(ToastPayload)
 *  ```
 */
export const make = <A, I>(payloadSchema: Schema.Codec<A, I>) => {
  const runtime = makeRuntime(payloadSchema)
  type Entry = typeof runtime.Entry.Type

  type ToastModel = typeof runtime.Model.Type
  type ToastMessage = typeof runtime.Message.Type

  /** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs`
   *  field. */
  type ViewInputs = Readonly<{
    position: Position
    entryToView: (entry: Entry, handlers: EntryHandlers) => Html
    ariaLabel?: string
    containerClassName?: string
    entryClassName?: string
  }>

  /** Renders a headless toast stack. The `<ol>` container is always present
   *  in the DOM so screen readers can observe its `aria-live` region from
   *  page load. Each entry becomes an `<li>` keyed by its id, with
   *  animation data attributes (`data-enter`, `data-leave`,
   *  `data-transition`, `data-closed`) and `data-variant` reflecting the
   *  entry's variant. */
  const view = defineView<ToastModel, ToastMessage, ViewInputs>(
    (model, viewInputs, h): Html => {
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

        const animationAttributes = Match.value(transitionState).pipe(
          Match.when('EnterStart', () => [
            h.DataAttribute('closed', ''),
            h.DataAttribute('enter', ''),
            h.DataAttribute('transition', ''),
          ]),
          Match.when('EnterAnimating', () => [
            h.DataAttribute('enter', ''),
            h.DataAttribute('transition', ''),
          ]),
          Match.when('LeaveStart', () => [
            h.DataAttribute('leave', ''),
            h.DataAttribute('transition', ''),
          ]),
          Match.when('LeaveAnimating', () => [
            h.DataAttribute('closed', ''),
            h.DataAttribute('leave', ''),
            h.DataAttribute('transition', ''),
          ]),
          Match.orElse(() => []),
        )

        const swipeOffset = runtime.swipeOffsetForEntry(
          model.swipeState,
          entry.id,
        )
        const isSwiping =
          model.swipeState._tag === 'Dragging' &&
          model.swipeState.entryId === entry.id
        const swipeAttributes = isSwiping
          ? [
              h.DataAttribute('swipe', 'move'),
              ...(swipeOffset !== 0
                ? [
                    h.Style({
                      transform: `translateX(${String(swipeOffset)}px)`,
                      '--toast-swipe-move-x': `${String(swipeOffset)}px`,
                    }),
                  ]
                : []),
            ]
          : []

        const handlePointerDown = (
          pointerType: string,
          button: number,
          _screenX: number,
          _screenY: number,
          _timeStamp: number,
          clientX: number,
          _clientY: number,
        ): Option.Option<ToastMessage> => {
          if (
            pointerType === 'mouse' &&
            !Equal.equals(button, LEFT_MOUSE_BUTTON)
          ) {
            return Option.none()
          } else {
            return Option.some(
              runtime.Message.PressedEntryPointer({
                entryId: entry.id,
                clientX,
              }),
            )
          }
        }

        const itemAttributes = [
          h.Id(entry.id),
          h.Role(variantToRole(entry.variant)),
          h.AriaAtomic(true),
          h.DataAttribute('variant', entry.variant),
          h.Style({
            pointerEvents: 'auto',
            touchAction: 'pan-y',
          }),
          h.OnMouseEnter(runtime.Message.HoveredEntry({ entryId: entry.id })),
          h.OnMouseLeave(runtime.Message.LeftEntry({ entryId: entry.id })),
          h.OnPointerDown(handlePointerDown),
          ...animationAttributes,
          ...swipeAttributes,
          ...(entryClassName ? [h.Class(entryClassName)] : []),
        ]

        const handlers: EntryHandlers = {
          dismiss: childAttributes([
            h.OnClick(runtime.Message.Dismissed({ entryId: entry.id })),
          ]),
        }

        return h.keyed('li')(entry.id, itemAttributes, [
          entryToView(entry, handlers),
        ])
      }

      return h.keyed('ol')(
        id,
        containerAttributes,
        entries.map(renderEntryItem),
      )
    },
  )

  return {
    ...runtime,
    view,
  } as const
}
