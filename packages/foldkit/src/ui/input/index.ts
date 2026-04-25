import { Predicate } from 'effect'

import type { Attribute } from '../../html/index.js'
import { html } from '../../html/index.js'
import type { Html } from '../../html/index.js'

// VIEW

/** Attribute groups the input component provides to the consumer's `toView` callback. */
export type InputAttributes<Message> = Readonly<{
  input: ReadonlyArray<Attribute<Message>>
  label: ReadonlyArray<Attribute<Message>>
  description: ReadonlyArray<Attribute<Message>>
}>

/** Configuration for rendering an input with `view`. */
export type ViewConfig<Message> = Readonly<{
  id: string
  toView: (attributes: InputAttributes<Message>) => Html
  onInput?: (value: string) => Message
  value?: string
  isDisabled?: boolean
  isInvalid?: boolean
  isAutofocus?: boolean
  name?: string
  type?: string
  placeholder?: string
}>

/** Generates the description element ID from the input's base ID. */
export const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible input by building ARIA attribute groups and delegating layout to the consumer's `toView` callback. */
export const view = <Message>(config: ViewConfig<Message>): Html => {
  const {
    AriaDescribedBy,
    AriaDisabled,
    AriaInvalid,
    Autofocus,
    DataAttribute,
    Disabled,
    For,
    Id,
    Name,
    OnInput,
    Placeholder,
    Type,
    Value,
  } = html<Message>()

  const {
    toView,
    id,
    onInput,
    value,
    isDisabled = false,
    isInvalid = false,
    isAutofocus = false,
    name,
    type = 'text',
    placeholder,
  } = config

  const disabledAttributes = isDisabled
    ? [AriaDisabled(true), Disabled(true), DataAttribute('disabled', '')]
    : []

  const invalidAttributes = isInvalid
    ? [AriaInvalid(true), DataAttribute('invalid', '')]
    : []

  const inputAttributes =
    Predicate.isNotUndefined(onInput) && !isDisabled ? [OnInput(onInput)] : []

  const valueAttributes = Predicate.isNotUndefined(value) ? [Value(value)] : []

  const autofocusAttributes = isAutofocus ? [Autofocus(true)] : []

  const nameAttributes = Predicate.isNotUndefined(name) ? [Name(name)] : []

  const placeholderAttributes = Predicate.isNotUndefined(placeholder)
    ? [Placeholder(placeholder)]
    : []

  const allInputAttributes = [
    Id(id),
    Type(type),
    AriaDescribedBy(descriptionId(id)),
    ...disabledAttributes,
    ...invalidAttributes,
    ...inputAttributes,
    ...valueAttributes,
    ...autofocusAttributes,
    ...nameAttributes,
    ...placeholderAttributes,
  ]

  const labelAttributes = [For(id)]

  const descriptionAttributes = [Id(descriptionId(id))]

  return toView({
    input: allInputAttributes,
    label: labelAttributes,
    description: descriptionAttributes,
  })
}
