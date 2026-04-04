import { Predicate } from 'effect'

import type { Attribute } from '../../html'
import { html } from '../../html'
import type { Html } from '../../html'

// VIEW

/** Attribute groups the select component provides to the consumer's `toView` callback. */
export type SelectAttributes<Message> = Readonly<{
  select: ReadonlyArray<Attribute<Message>>
  label: ReadonlyArray<Attribute<Message>>
  description: ReadonlyArray<Attribute<Message>>
}>

/** Configuration for rendering a select with `view`. */
export type ViewConfig<Message> = Readonly<{
  id: string
  toView: (attributes: SelectAttributes<Message>) => Html
  onChange?: (value: string) => Message
  value?: string
  isDisabled?: boolean
  isInvalid?: boolean
  isAutofocus?: boolean
  name?: string
}>

/** Generates the description element ID from the select's base ID. */
export const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible select by building ARIA attribute groups and delegating layout to the consumer's `toView` callback. */
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
    OnChange,
    Value,
  } = html<Message>()

  const {
    toView,
    id,
    onChange,
    value,
    isDisabled = false,
    isInvalid = false,
    isAutofocus = false,
    name,
  } = config

  const disabledAttributes = isDisabled
    ? [AriaDisabled(true), Disabled(true), DataAttribute('disabled', '')]
    : []

  const invalidAttributes = isInvalid
    ? [AriaInvalid(true), DataAttribute('invalid', '')]
    : []

  const changeAttributes =
    Predicate.isNotUndefined(onChange) && !isDisabled
      ? [OnChange(onChange)]
      : []

  const valueAttributes = Predicate.isNotUndefined(value) ? [Value(value)] : []

  const autofocusAttributes = isAutofocus ? [Autofocus(true)] : []

  const nameAttributes = Predicate.isNotUndefined(name) ? [Name(name)] : []

  const allSelectAttributes = [
    Id(id),
    AriaDescribedBy(descriptionId(id)),
    ...disabledAttributes,
    ...invalidAttributes,
    ...changeAttributes,
    ...valueAttributes,
    ...autofocusAttributes,
    ...nameAttributes,
  ]

  const labelAttributes = [For(id)]

  const descriptionAttributes = [Id(descriptionId(id))]

  return toView({
    select: allSelectAttributes,
    label: labelAttributes,
    description: descriptionAttributes,
  })
}
