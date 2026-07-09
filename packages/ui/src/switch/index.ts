import { Match as M, Option } from 'effect'
import { type Attribute, type Html, html } from 'foldkit/html'

// VIEW

/** Attribute groups the switch provides to the consumer's `toView` callback.
 *  Each group is a `ReadonlyArray<Attribute<Message>>` the consumer
 *  spreads into its own element attribute arrays. The `button` and `label`
 *  bundles carry the click and Space handlers that dispatch the configured
 *  `onToggle` Message. */
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
 *    switch. */
export type ViewConfig<Message> = Readonly<{
  id: string
  isChecked: boolean
  onToggle: (isChecked: boolean) => Message
  toView: (attributes: SwitchAttributes<Message>) => Html
  isDisabled?: boolean
  name?: string
  value?: string
}>

const labelId = (id: string): string => `${id}-label`
const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible switch as a stateless controlled component. The
 *  parent owns the checked state (`isChecked`) and receives the new state via
 *  `onToggle` when the user toggles it.
 *
 *  ```ts
 *  // In view:
 *  Switch.view<Message>({
 *    id: 'notifications',
 *    isChecked: model.notificationsEnabled,
 *    onToggle: isChecked => ToggledNotifications({ isChecked }),
 *    toView: attributes => ...,
 *  })
 *
 *  // In update:
 *  ToggledNotifications: ({ isChecked }) => [
 *    evo(model, { notificationsEnabled: () => isChecked }),
 *    [],
 *  ],
 *  ``` */
export const view = <Message>(config: ViewConfig<Message>): Html => {
  const h = html<Message>()

  const {
    id,
    isChecked,
    onToggle,
    toView,
    isDisabled = false,
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

  const buttonAttributes = [
    h.Role('switch'),
    h.AriaChecked(isChecked),
    h.AriaLabelledBy(labelId(id)),
    h.AriaDescribedBy(descriptionId(id)),
    h.Tabindex(0),
    ...checkedAttributes,
    ...disabledAttributes,
    ...(isDisabled
      ? []
      : [
          h.OnClick(onToggle(nextChecked)),
          h.OnKeyUpPreventDefault(handleKeyUp),
        ]),
  ]

  const labelAttributes = [
    h.Id(labelId(id)),
    ...(isDisabled ? [] : [h.OnClick(onToggle(nextChecked))]),
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
