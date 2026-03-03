import { Match as M, Option, Schema as S } from 'effect'

import type { Command } from '../../command'
import { html } from '../../html'
import type { Html } from '../../html'
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
/** Placeholder message used when no action is needed. */
export const NoOp = m('NoOp')

/** Union of all messages the switch component can produce. */
export const Message = S.Union(Toggled, NoOp)

export type Toggled = typeof Toggled.Type
export type NoOp = typeof NoOp.Type

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
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      Toggled: () => [evo(model, { isChecked: isChecked => !isChecked }), []],
      NoOp: () => [model, []],
    }),
  )

// VIEW

/** Configuration for rendering a switch with `view`. */
export type ViewConfig<Message> = Readonly<{
  model: Model
  toMessage: (message: Toggled | NoOp) => Message
  label: string
  description?: string
  isDisabled?: boolean
  buttonContent?: Html
  name?: string
  value?: string
  className?: string
  buttonClassName?: string
  labelClassName?: string
}>

const labelId = (id: string): string => `${id}-label`
const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible switch toggle with label, optional description, and optional hidden form input. */
export const view = <Message>(config: ViewConfig<Message>): Html => {
  const {
    button,
    div,
    input,
    label,
    p,
    AriaChecked,
    AriaDescribedBy,
    AriaDisabled,
    AriaLabelledBy,
    Class,
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
    toMessage,
    label: labelText,
    description,
    isDisabled = false,
    buttonContent,
    name,
    value: formValue = 'on',
    className,
    buttonClassName,
    labelClassName,
  } = config

  const handleKeyUp = (key: string): Option.Option<Message> =>
    M.value(key).pipe(
      M.when(' ', () => Option.some(toMessage(Toggled()))),
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
    Tabindex(0),
    ...checkedAttributes,
    ...disabledAttributes,
    ...(description ? [AriaDescribedBy(descriptionId(id))] : []),
    ...(buttonClassName ? [Class(buttonClassName)] : []),
    ...(isDisabled
      ? []
      : [OnClick(toMessage(Toggled())), OnKeyUpPreventDefault(handleKeyUp)]),
  ]

  const labelElement = label(
    [
      Id(labelId(id)),
      ...(labelClassName ? [Class(labelClassName)] : []),
      ...(isDisabled ? [] : [OnClick(toMessage(Toggled()))]),
    ],
    [labelText],
  )

  const descriptionElement = description
    ? [p([Id(descriptionId(id))], [description])]
    : []

  const hiddenInput = name
    ? [input([Type('hidden'), Name(name), Value(isChecked ? formValue : '')])]
    : []

  const wrapperAttributes = [
    ...checkedAttributes,
    ...(isDisabled ? [DataAttribute('disabled', '')] : []),
    ...(className ? [Class(className)] : []),
  ]

  return div(wrapperAttributes, [
    button(buttonAttributes, buttonContent ? [buttonContent] : []),
    labelElement,
    ...descriptionElement,
    ...hiddenInput,
  ])
}
