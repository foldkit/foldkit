import { Match as M, Option, Schema as S } from 'effect'

import type { Command } from '../../command'
import { type Attribute, type Html, createLazy, html } from '../../html'
import { m } from '../../message'
import { evo } from '../../struct'

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

/** Attribute groups the switch component provides to the consumer's `toView` callback. */
export type SwitchAttributes<Message> = Readonly<{
  button: ReadonlyArray<Attribute<Message>>
  label: ReadonlyArray<Attribute<Message>>
  description: ReadonlyArray<Attribute<Message>>
  hiddenInput: ReadonlyArray<Attribute<Message>>
}>

/** Configuration for rendering a switch with `view`. */
export type ViewConfig<Message> = Readonly<{
  model: Model
  toParentMessage: (message: Toggled) => Message
  toView: (attributes: SwitchAttributes<Message>) => Html
  isDisabled?: boolean
  name?: string
  value?: string
}>

const labelId = (id: string): string => `${id}-label`
const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible switch toggle by building ARIA attribute groups and delegating layout to the consumer's `toView` callback. */
export const view = <Message>(config: ViewConfig<Message>): Html => {
  const {
    AriaChecked,
    AriaDescribedBy,
    AriaDisabled,
    AriaLabelledBy,
    DataAttribute,
    Id,
    Name,
    OnClick,
    OnKeyUpPreventDefault,
    Role,
    Tabindex,
    Type,
    Value,
  } = html<Message>()

  const {
    model: { id, isChecked },
    toParentMessage,
    isDisabled = false,
    name,
    value: formValue = 'on',
  } = config

  const handleKeyUp = (key: string): Option.Option<Message> =>
    M.value(key).pipe(
      M.when(' ', () => Option.some(toParentMessage(Toggled()))),
      M.orElse(() => Option.none()),
    )

  const checkedAttributes = isChecked ? [DataAttribute('checked', '')] : []

  const disabledAttributes = isDisabled
    ? [AriaDisabled(true), DataAttribute('disabled', '')]
    : []

  const buttonAttributes = [
    Role('switch'),
    AriaChecked(isChecked),
    AriaLabelledBy(labelId(id)),
    AriaDescribedBy(descriptionId(id)),
    Tabindex(0),
    ...checkedAttributes,
    ...disabledAttributes,
    ...(isDisabled
      ? []
      : [
          OnClick(toParentMessage(Toggled())),
          OnKeyUpPreventDefault(handleKeyUp),
        ]),
  ]

  const labelAttributes = [
    Id(labelId(id)),
    ...(isDisabled ? [] : [OnClick(toParentMessage(Toggled()))]),
  ]

  const descriptionAttributes = [Id(descriptionId(id))]

  const hiddenInputAttributes = name
    ? [Type('hidden'), Name(name), Value(isChecked ? formValue : '')]
    : []

  return config.toView({
    button: buttonAttributes,
    label: labelAttributes,
    description: descriptionAttributes,
    hiddenInput: hiddenInputAttributes,
  })
}

/** Creates a memoized switch view. Static config is captured in a closure;
 *  only `model` and `toParentMessage` are compared per render via `createLazy`. */
export const lazy = <Message>(
  staticConfig: Omit<ViewConfig<Message>, 'model' | 'toParentMessage'>,
): ((
  model: Model,
  toParentMessage: ViewConfig<Message>['toParentMessage'],
) => Html) => {
  const lazyView = createLazy()

  return (model, toParentMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToMessage: ViewConfig<Message>['toParentMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toParentMessage: currentToMessage,
        }),
      [model, toParentMessage],
    )
}
