import { Match as M, Option, Schema as S } from 'effect'

import type { Command } from '../../command/index.js'
import {
  type Attribute,
  type Html,
  defineSubmodelView,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'

// MODEL

/** Schema for the checkbox component's state, tracking the checked status. */
export const Model = S.Struct({
  id: S.String,
  isChecked: S.Boolean,
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the user toggles the checkbox via click or Space key. */
export const Toggled = m('Toggled')

/** Schema for all messages the checkbox component can produce. */
export const Message = Toggled

export type Toggled = typeof Toggled.Type

export type Message = typeof Message.Type

// INIT

/** Configuration for creating a checkbox model with `init`. */
export type InitConfig = Readonly<{
  id: string
  isChecked?: boolean
}>

/** Creates an initial checkbox model from a config. Defaults to unchecked. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isChecked: config.isChecked ?? false,
})

// UPDATE

/** Processes a checkbox message and returns the next model and commands. */
export const update = (
  model: Model,
  _message: Message,
): readonly [Model, ReadonlyArray<Command<Message>>] => [
  evo(model, { isChecked: isChecked => !isChecked }),
  [],
]

// VIEW

/** Attribute groups the checkbox component provides to the consumer's
 *  `toView` callback. Typed as `Attribute<never>` so the consumer can
 *  spread the arrays directly into their own scope's elements:
 *
 *  ```ts
 *  toView: attributes =>
 *    h.div(
 *      [...attributes.checkbox, h.Class('my-class'), h.OnClick(MyOwnMsg())],
 *      [...],
 *    )
 *  ```
 *
 *  Because `h.submodel` runs the `toView` callback in the consumer's
 *  outer scope (not Checkbox's child scope), `h.OnClick(MyOwnMsg())`
 *  inside `toView` dispatches the consumer's Message directly through
 *  the parent's wrapping chain, NOT wrapped as Checkbox's Toggled. The
 *  Checkbox's own OnClick handlers (carried inside `attributes.checkbox`
 *  etc.) still dispatch `Toggled`, translated via Checkbox's wrap at
 *  event-fire time.
 *
 *  The `never` typing on the attribute arrays is what makes the spread
 *  type-check against any consumer Message type. At runtime each event
 *  handler routes to the correct dispatcher via its captured scope id;
 *  the `never` is purely a compile-time accommodation. */
export type CheckboxAttributes = Readonly<{
  checkbox: ReadonlyArray<Attribute<never>>
  label: ReadonlyArray<Attribute<never>>
  description: ReadonlyArray<Attribute<never>>
  hiddenInput: ReadonlyArray<Attribute<never>>
}>

/** Per-render inputs passed to `view` via `h.submodel`'s `inputs` field.
 *  Slot content (`toView`) and behavioral flags live here; the parent
 *  declares them at the embed site rather than threading them through the
 *  Submodel as a generic-parameterized callback. */
export type ViewInputs = Readonly<{
  toView: (attributes: CheckboxAttributes) => Html
  isDisabled?: boolean
  isIndeterminate?: boolean
  name?: string
  value?: string
}>

const labelId = (id: string): string => `${id}-label`
const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible checkbox by building ARIA attribute groups and
 *  delegating layout to the consumer's `toView` callback. Designed to be
 *  embedded via `h.submodel`: the parent declares the wrapping
 *  (`wrapWith: GotCheckboxMessage`) at the embed site, and this view
 *  dispatches its own `Toggled` Messages directly through the html
 *  factory. No `ParentMessage` callback: the wrapping is data, applied
 *  at event-fire time by the runtime's scope chain.
 *
 *  Branded via `defineSubmodelView<Model, Message, ViewInputs>` so
 *  `h.submodel` infers `Toggled` as the child's Message type at the
 *  embed site, which makes `wrapWith`'s `{ message }` destructure
 *  correctly typed without manual annotation. */
export const view = defineSubmodelView<Model, Message, ViewInputs>(
  (model, inputs): Html => {
    const h = html<Message>()

    const { id, isChecked } = model
    const {
      isDisabled = false,
      isIndeterminate = false,
      name,
      value: formValue = 'on',
    } = inputs

    const handleKeyUp = (key: string): Option.Option<Toggled> =>
      M.value(key).pipe(
        M.when(' ', () => Option.some(Toggled())),
        M.orElse(() => Option.none()),
      )

    const stateAttributes = isIndeterminate
      ? [h.DataAttribute('indeterminate', '')]
      : isChecked
        ? [h.DataAttribute('checked', '')]
        : []

    const disabledAttributes = isDisabled
      ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
      : []

    const checkboxAttributes = [
      h.Role('checkbox'),
      h.AriaChecked(isIndeterminate ? 'mixed' : isChecked),
      h.AriaLabelledBy(labelId(id)),
      h.AriaDescribedBy(descriptionId(id)),
      h.Tabindex(0),
      ...stateAttributes,
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

    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    return inputs.toView({
      checkbox: checkboxAttributes as ReadonlyArray<Attribute<never>>,
      label: labelAttributes as ReadonlyArray<Attribute<never>>,
      description: descriptionAttributes as ReadonlyArray<Attribute<never>>,
      hiddenInput: hiddenInputAttributes as ReadonlyArray<Attribute<never>>,
    })
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
  },
)
