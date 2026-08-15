import { Match as M, Option } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

// VIEW

/** Attribute groups the switch provides to the consumer's `toView` callback.
 *  Each group is a `ReadonlyArray<Attribute<Message>>` the consumer
 *  spreads into its own element attribute arrays. The `button` and `label`
 *  bundles carry the click and Space handlers that dispatch the configured
 *  `onToggle` Message.
 *
 *  The `button` bundle sets `type="button"` so that rendering the switch as a
 *  `button` element inside a `form` element toggles without also submitting the
 *  form. Setting it is harmless on the other elements a switch might use, such
 *  as a `div` or a `span`, because the builder assigns a DOM property rather
 *  than an HTML attribute. Spread a later `h.Type` to override it. */
export type SwitchAttributes<Message> = Readonly<{
  button: ReadonlyArray<Attribute<Message>>
  label: ReadonlyArray<Attribute<Message>>
  description: ReadonlyArray<Attribute<Message>>
  hiddenInput: ReadonlyArray<Attribute<Message>>
}>

/** Per-render view configuration for the stateless controlled {@link view}.
 *  Generic over `Message` (the message `onToggle` dispatches).
 *
 *  - `isChecked`: the current checked state, read straight from the parent
 *    Model. `aria-checked` and the `data-checked` marker derive from it.
 *  - `onToggle`: dispatched with the new checked state when the user clicks
 *    the switch or its label, or presses Space. Handle it in the parent's
 *    `update` by storing the value.
 *  - `toView`: receives the {@link SwitchAttributes} and lays out the
 *    switch.
 *  - `isDisabled`: marks the switch unavailable with `aria-disabled="true"`
 *    and `data-disabled`, keeping it focusable. Use it when the control does
 *    not apply; use `isReadOnly` when its state is still information the user
 *    needs.
 *  - `isReadOnly`: prevents toggling while exposing read-only semantics with
 *    `aria-readonly="true"` and `data-readonly`. The switch remains
 *    focusable. Independent of `isDisabled`: setting both emits both
 *    attribute sets, and either one removes the interaction handlers. */
export type ViewConfig<Message> = Readonly<{
  id: string
  isChecked: boolean
  onToggle: (isChecked: boolean) => Message
  toView: (attributes: SwitchAttributes<Message>) => Html
  isDisabled?: boolean
  isReadOnly?: boolean
  name?: string
  value?: string
}>

/** Returns the label element id, derived from the switch's base id. */
export const labelId = (id: string): string => `${id}-label`

/** Returns the description element id, derived from the switch's base id. */
export const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible switch as a stateless controlled component. The
 *  parent owns the checked state (`isChecked`) and receives the new state via
 *  `onToggle` when the user toggles it.
 *
 *  ```ts
 *  // In view:
 *  Switch.view(
 *    {
 *      id: 'notifications',
 *      isChecked: model.notificationsEnabled,
 *      onToggle: isChecked => ToggledNotifications({ isChecked }),
 *      toView: attributes => ...,
 *    },
 *    h,
 *  )
 *
 *  // In update:
 *  ToggledNotifications: ({ isChecked }) => [
 *    evo(model, { notificationsEnabled: () => isChecked }),
 *    [],
 *  ],
 *  ``` */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>,
): Html => {
  const {
    id,
    isChecked,
    onToggle,
    toView,
    isDisabled = false,
    isReadOnly = false,
    name,
    value: formValue = 'on',
  } = config

  const nextChecked = !isChecked

  const handleKeyUp = (key: string): Option.Option<Message> =>
    M.value(key).pipe(
      M.when(' ', () => Option.some(onToggle(nextChecked))),
      M.orElse(() => Option.none()),
    )

  const checkedAttributes = isChecked ? [h.DataAttribute('checked', '')] : []

  const disabledAttributes = isDisabled
    ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
    : []

  const readOnlyAttributes = isReadOnly
    ? [h.AriaReadonly(true), h.DataAttribute('readonly', '')]
    : []

  const isInteractive = !isDisabled && !isReadOnly

  const buttonAttributes = [
    h.Type('button'),
    h.Role('switch'),
    h.AriaChecked(isChecked),
    h.AriaLabelledBy(labelId(id)),
    h.AriaDescribedBy(descriptionId(id)),
    h.Tabindex(0),
    ...checkedAttributes,
    ...disabledAttributes,
    ...readOnlyAttributes,
    ...(isInteractive
      ? [h.OnClick(onToggle(nextChecked)), h.OnKeyUpPreventDefault(handleKeyUp)]
      : []),
  ]

  const labelAttributes = [
    h.Id(labelId(id)),
    ...(isInteractive ? [h.OnClick(onToggle(nextChecked))] : []),
  ]

  const descriptionAttributes = [h.Id(descriptionId(id))]

  const hiddenInputAttributes = name
    ? [h.Type('hidden'), h.Name(name), h.Value(isChecked ? formValue : '')]
    : []

  return toView({
    button: buttonAttributes,
    label: labelAttributes,
    description: descriptionAttributes,
    hiddenInput: hiddenInputAttributes,
  })
}
