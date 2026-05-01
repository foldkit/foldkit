import { Match as M, Schema as S } from 'effect'

import {
  type Attribute,
  type Html,
  createLazy,
  html,
} from '../../html/index.js'
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

/** Handlers passed to `renderEntry`. Attach `dismiss` to a close button's
 *  `OnClick` to let users dismiss the entry manually. */
export type EntryHandlers<ParentMessage> = Readonly<{
  dismiss: ParentMessage
}>

const DEFAULT_ARIA_LABEL = 'Notifications'

/** Factory that binds `Ui.Toast` to a user-provided payload schema. The
 *  returned module contains everything needed to wire a toast stack into an
 *  app: `Model`, `Message`, `Entry`, `Added`, `init`, `update`, `show` /
 *  `dismiss` / `dismissAll` helpers, and the headless `view`.
 *
 *  The payload is whatever content shape the consumer supplies via Schema.
 *  The component never reads it — it flows through to `renderEntry`. The
 *  component itself owns only lifecycle and a11y fields (id, variant,
 *  animation, dismiss timer, hover state).
 *
 *  Consume the bound module's exports everywhere — `Toast.Model` in your app
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
 *  export const Toast = Ui.Toast.make(ToastPayload)
 *  ```
 */
export const make = <A, I>(payloadSchema: S.Codec<A, I>) => {
  const runtime = makeRuntime(payloadSchema)
  type Entry = typeof runtime.Entry.Type

  /** Configuration for rendering the bound toast container with `view`. */
  type ViewConfig<ParentMessage> = Readonly<{
    model: typeof runtime.Model.Type
    position: Position
    toParentMessage: (
      message: Dismissed | HoveredEntry | LeftEntry,
    ) => ParentMessage
    renderEntry: (entry: Entry, handlers: EntryHandlers<ParentMessage>) => Html
    ariaLabel?: string
    className?: string
    attributes?: ReadonlyArray<Attribute<ParentMessage>>
    entryClassName?: string
    entryAttributes?: ReadonlyArray<Attribute<ParentMessage>>
  }>

  /** Renders a headless toast stack. The `<ol>` container is always present
   *  in the DOM so screen readers can observe its `aria-live` region from
   *  page load. Each entry becomes an `<li>` keyed by its id, with
   *  animation data attributes (`data-enter`, `data-leave`,
   *  `data-transition`, `data-closed`) and `data-variant` reflecting the
   *  entry's variant. */
  const view = <ParentMessage>(config: ViewConfig<ParentMessage>): Html => {
    const {
      AriaAtomic,
      AriaLabel,
      AriaLive,
      Class,
      DataAttribute,
      Id,
      OnMouseEnter,
      OnMouseLeave,
      Role,
      Style,
      keyed,
    } = html<ParentMessage>()

    const {
      model: { id, entries },
      position,
      toParentMessage,
      renderEntry,
      ariaLabel = DEFAULT_ARIA_LABEL,
      className,
      attributes = [],
      entryClassName,
      entryAttributes = [],
    } = config

    const containerAttributes = [
      Id(id),
      Role('region'),
      AriaLabel(ariaLabel),
      AriaLive('polite'),
      Style(positionToContainerStyle(position)),
      ...(className ? [Class(className)] : []),
      ...attributes,
    ]

    const renderEntryItem = (entry: Entry): Html => {
      const { transitionState } = entry.animation

      const animationAttributes: ReadonlyArray<
        ReturnType<typeof DataAttribute>
      > = M.value(transitionState).pipe(
        M.when('EnterStart', () => [
          DataAttribute('closed', ''),
          DataAttribute('enter', ''),
          DataAttribute('transition', ''),
        ]),
        M.when('EnterAnimating', () => [
          DataAttribute('enter', ''),
          DataAttribute('transition', ''),
        ]),
        M.when('LeaveStart', () => [
          DataAttribute('leave', ''),
          DataAttribute('transition', ''),
        ]),
        M.when('LeaveAnimating', () => [
          DataAttribute('closed', ''),
          DataAttribute('leave', ''),
          DataAttribute('transition', ''),
        ]),
        M.orElse(() => []),
      )

      const handlers: EntryHandlers<ParentMessage> = {
        dismiss: toParentMessage(Dismissed({ entryId: entry.id })),
      }

      const itemAttributes = [
        Id(entry.id),
        Role(variantToRole(entry.variant)),
        AriaAtomic(true),
        DataAttribute('variant', entry.variant),
        Style({ pointerEvents: 'auto' }),
        OnMouseEnter(toParentMessage(HoveredEntry({ entryId: entry.id }))),
        OnMouseLeave(toParentMessage(LeftEntry({ entryId: entry.id }))),
        ...animationAttributes,
        ...(entryClassName ? [Class(entryClassName)] : []),
        ...entryAttributes,
      ]

      return keyed('li')(entry.id, itemAttributes, [
        renderEntry(entry, handlers),
      ])
    }

    return keyed('ol')(id, containerAttributes, entries.map(renderEntryItem))
  }

  /** Creates a memoized toast container view. Static config (className,
   *  entryClassName, etc.) is captured in a closure. Dynamic fields —
   *  `model`, `toParentMessage`, and `renderEntry` — are compared by
   *  reference per render via `createLazy`. */
  const lazy = <ParentMessage>(
    staticConfig: Omit<
      ViewConfig<ParentMessage>,
      'model' | 'toParentMessage' | 'renderEntry'
    >,
  ): ((
    model: typeof runtime.Model.Type,
    toParentMessage: ViewConfig<ParentMessage>['toParentMessage'],
    renderEntry: ViewConfig<ParentMessage>['renderEntry'],
  ) => Html) => {
    const lazyView = createLazy()

    return (model, toParentMessage, renderEntry) =>
      lazyView(
        (
          currentModel: typeof runtime.Model.Type,
          currentToMessage: ViewConfig<ParentMessage>['toParentMessage'],
          currentRenderEntry: ViewConfig<ParentMessage>['renderEntry'],
        ) =>
          view({
            ...staticConfig,
            model: currentModel,
            toParentMessage: currentToMessage,
            renderEntry: currentRenderEntry,
          }),
        [model, toParentMessage, renderEntry],
      )
  }

  return {
    ...runtime,
    view,
    lazy,
  } as const
}
