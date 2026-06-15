import { Match as M, Schema as S } from 'effect'
import {
  type ChildAttribute,
  type Html,
  childAttributes,
  html,
} from 'foldkit/html'
import { defineView } from 'foldkit/submodel'

import {
  Dismissed,
  DismissedAll,
  ElapsedDuration,
  GotAnimationMessage,
  HoveredEntry,
  LeftEntry,
  Position,
  Variant,
} from './schema.js'
import { DismissAfter, makeRuntime } from './update.js'

export type { InitConfig } from './schema.js'
export type { ShowInput } from './update.js'

export {
  Variant,
  Position,
  Dismissed,
  DismissedAll,
  ElapsedDuration,
  HoveredEntry,
  LeftEntry,
  GotAnimationMessage,
  DismissAfter,
}

// VIEW

type VariantRole = 'status' | 'alert'

const variantToRole = (variant: Variant): VariantRole =>
  M.value(variant).pipe(
    M.withReturnType<VariantRole>(),
    M.when('Info', () => 'status'),
    M.when('Success', () => 'status'),
    M.when('Warning', () => 'alert'),
    M.when('Error', () => 'alert'),
    M.exhaustive,
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

  return M.value(position).pipe(
    M.withReturnType<Readonly<Record<string, string>>>(),
    M.when('TopLeft', () => ({
      ...base,
      top: '0',
      left: '0',
      flexDirection: 'column-reverse',
    })),
    M.when('TopCenter', () => ({
      ...base,
      top: '0',
      left: '50%',
      transform: 'translateX(-50%)',
      flexDirection: 'column-reverse',
    })),
    M.when('TopRight', () => ({
      ...base,
      top: '0',
      right: '0',
      flexDirection: 'column-reverse',
    })),
    M.when('BottomLeft', () => ({
      ...base,
      bottom: '0',
      left: '0',
      flexDirection: 'column',
    })),
    M.when('BottomCenter', () => ({
      ...base,
      bottom: '0',
      left: '50%',
      transform: 'translateX(-50%)',
      flexDirection: 'column',
    })),
    M.when('BottomRight', () => ({
      ...base,
      bottom: '0',
      right: '0',
      flexDirection: 'column',
    })),
    M.exhaustive,
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
 *  exports (`Variant`, `Position`, static message tags, `DismissAfter`) are
 *  payload-independent and safe to reference when you need them without a
 *  bound module, but the typical path is through the factory return.
 *
 *  @example
 *  ```ts
 *  const ToastPayload = S.Struct({
 *    bodyText: S.String,
 *    maybeLink: S.Option(S.Struct({
 *      href: S.String,
 *      text: S.String,
 *    })),
 *  })
 *  export const Toast = Toast.make(ToastPayload)
 *  ```
 */
export const make = <A, I>(payloadSchema: S.Codec<A, I>) => {
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
    (model, viewInputs): Html => {
      const h = html<ToastMessage>()

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

        const animationAttributes = M.value(transitionState).pipe(
          M.when('EnterStart', () => [
            h.DataAttribute('closed', ''),
            h.DataAttribute('enter', ''),
            h.DataAttribute('transition', ''),
          ]),
          M.when('EnterAnimating', () => [
            h.DataAttribute('enter', ''),
            h.DataAttribute('transition', ''),
          ]),
          M.when('LeaveStart', () => [
            h.DataAttribute('leave', ''),
            h.DataAttribute('transition', ''),
          ]),
          M.when('LeaveAnimating', () => [
            h.DataAttribute('closed', ''),
            h.DataAttribute('leave', ''),
            h.DataAttribute('transition', ''),
          ]),
          M.orElse(() => []),
        )

        const itemAttributes = [
          h.Id(entry.id),
          h.Role(variantToRole(entry.variant)),
          h.AriaAtomic(true),
          h.DataAttribute('variant', entry.variant),
          h.Style({ pointerEvents: 'auto' }),
          h.OnMouseEnter(HoveredEntry({ entryId: entry.id })),
          h.OnMouseLeave(LeftEntry({ entryId: entry.id })),
          ...animationAttributes,
          ...(entryClassName ? [h.Class(entryClassName)] : []),
        ]

        const handlers: EntryHandlers = {
          dismiss: childAttributes([
            h.OnClick(Dismissed({ entryId: entry.id })),
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
