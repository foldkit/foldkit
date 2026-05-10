import { Match as M, Option, Schema as S } from 'effect'

import type { Command } from '../../command/index.js'
import {
  type Attribute,
  type Html,
  createLazy,
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

/** Attribute groups the checkbox component provides to the consumer's `toView` callback. */
export type CheckboxAttributes<ParentMessage> = Readonly<{
  checkbox: ReadonlyArray<Attribute<ParentMessage>>
  label: ReadonlyArray<Attribute<ParentMessage>>
  description: ReadonlyArray<Attribute<ParentMessage>>
  hiddenInput: ReadonlyArray<Attribute<ParentMessage>>
}>

/** Configuration for rendering a checkbox with `view`. */
export type ViewConfig<ParentMessage> = Readonly<{
  model: Model
  toParentMessage: (message: Toggled) => ParentMessage
  toView: (attributes: CheckboxAttributes<ParentMessage>) => Html
  isDisabled?: boolean
  isIndeterminate?: boolean
  name?: string
  value?: string
}>

const labelId = (id: string): string => `${id}-label`
const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible checkbox by building ARIA attribute groups and delegating layout to the consumer's `toView` callback. */
export const view = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
): Html => {
  const h = html<ParentMessage>()

  const {
    model: { id, isChecked },
    toParentMessage,
    isDisabled = false,
    isIndeterminate = false,
    name,
    value: formValue = 'on',
  } = config

  const handleKeyUp = (key: string): Option.Option<ParentMessage> =>
    M.value(key).pipe(
      M.when(' ', () => Option.some(toParentMessage(Toggled()))),
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
      : [
          h.OnClick(toParentMessage(Toggled())),
          h.OnKeyUpPreventDefault(handleKeyUp),
        ]),
  ]

  const labelAttributes = [
    h.Id(labelId(id)),
    ...(isDisabled ? [] : [h.OnClick(toParentMessage(Toggled()))]),
  ]

  const descriptionAttributes = [h.Id(descriptionId(id))]

  const hiddenInputAttributes = name
    ? [h.Type('hidden'), h.Name(name), h.Value(isChecked ? formValue : '')]
    : []

  return config.toView({
    checkbox: checkboxAttributes,
    label: labelAttributes,
    description: descriptionAttributes,
    hiddenInput: hiddenInputAttributes,
  })
}

/** Creates a memoized checkbox view. Static config is captured in a closure;
 *  only `model` and `toParentMessage` are compared per render via `createLazy`. */
export const lazy = <ParentMessage>(
  staticConfig: Omit<ViewConfig<ParentMessage>, 'model' | 'toParentMessage'>,
): ((
  model: Model,
  toParentMessage: ViewConfig<ParentMessage>['toParentMessage'],
) => Html) => {
  const lazyView = createLazy()

  return (model, toParentMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToParentMessage: ViewConfig<ParentMessage>['toParentMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toParentMessage: currentToParentMessage,
        }),
      [model, toParentMessage],
    )
}
