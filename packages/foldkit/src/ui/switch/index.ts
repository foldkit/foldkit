import { Match as M, Option, Schema as S } from 'effect'

import type { Command } from '../../command/index.js'
import {
  type BoundaryAttribute,
  type Html,
  boundaryAttributes,
  defineView,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'

// MODEL

/** Schema for the switch component's state, tracking the toggle's checked status. */
export const Model = S.Struct({
  id: S.String,
  isChecked: S.Boolean,
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the user toggles the switch via click or Space key. */
export const Toggled = m('Toggled')

/** Schema for all messages the switch component can produce. */
export const Message = Toggled

export type Toggled = typeof Toggled.Type

export type Message = typeof Message.Type

// INIT

/** Configuration for creating a switch model with `init`. */
export type InitConfig = Readonly<{
  id: string
  isChecked?: boolean
}>

/** Creates an initial switch model from a config. Defaults to unchecked. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isChecked: config.isChecked ?? false,
})

// UPDATE

/** Processes a switch message and returns the next model and commands. */
export const update = (
  model: Model,
  _message: Message,
): readonly [Model, ReadonlyArray<Command<Message>>] => [
  evo(model, { isChecked: isChecked => !isChecked }),
  [],
]

// VIEW

/** Attribute groups the switch component provides to the consumer's
 *  `toView` callback. Each group is a `ReadonlyArray<BoundaryAttribute>`
 *  whose event handlers dispatch through the Switch's boundary at
 *  event-fire time. See {@link Checkbox.CheckboxAttributes} for the full
 *  routing model. */
export type SwitchAttributes = Readonly<{
  button: ReadonlyArray<BoundaryAttribute>
  label: ReadonlyArray<BoundaryAttribute>
  description: ReadonlyArray<BoundaryAttribute>
  hiddenInput: ReadonlyArray<BoundaryAttribute>
}>

/** Per-render inputs passed to `view` via `h.submodel`'s `inputs` field. */
export type ViewInputs = Readonly<{
  toView: (attributes: SwitchAttributes) => Html
  isDisabled?: boolean
  name?: string
  value?: string
}>

const labelId = (id: string): string => `${id}-label`
const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible switch toggle by building ARIA attribute groups
 *  and delegating layout to the consumer's `toView` callback. Designed
 *  to be embedded via `h.submodel`. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, inputs): Html => {
    const h = html<Message>()

    const { id, isChecked } = model
    const { isDisabled = false, name, value: formValue = 'on' } = inputs

    const handleKeyUp = (key: string): Option.Option<Toggled> =>
      M.value(key).pipe(
        M.when(' ', () => Option.some(Toggled())),
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
        : [h.OnClick(Toggled()), h.OnKeyUpPreventDefault(handleKeyUp)]),
    ]

    const labelAttributes = [
      h.Id(labelId(id)),
      ...(isDisabled ? [] : [h.OnClick(Toggled())]),
    ]

    const descriptionAttributes = [h.Id(descriptionId(id))]

    const hiddenInputAttributes = name
      ? [h.Type('hidden'), h.Name(name), h.Value(isChecked ? formValue : '')]
      : []

    return inputs.toView({
      button: boundaryAttributes(buttonAttributes),
      label: boundaryAttributes(labelAttributes),
      description: boundaryAttributes(descriptionAttributes),
      hiddenInput: boundaryAttributes(hiddenInputAttributes),
    })
  },
)
