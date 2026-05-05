import { Predicate } from 'effect'

import type { Attribute } from '../../html/index.js'
import { html } from '../../html/index.js'
import type { Html } from '../../html/index.js'

// VIEW

/** Attribute groups the select component provides to the consumer's `toView` callback. */
export type SelectAttributes<ParentMessage> = Readonly<{
  select: ReadonlyArray<Attribute<ParentMessage>>
  label: ReadonlyArray<Attribute<ParentMessage>>
  description: ReadonlyArray<Attribute<ParentMessage>>
}>

/** Configuration for rendering a select with `view`. */
export type ViewConfig<ParentMessage> = Readonly<{
  id: string
  toView: (attributes: SelectAttributes<ParentMessage>) => Html
  onChange?: (value: string) => ParentMessage
  value?: string
  isDisabled?: boolean
  isInvalid?: boolean
  isAutofocus?: boolean
  name?: string
}>

/** Generates the description element ID from the select's base ID. */
export const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible select by building ARIA attribute groups and delegating layout to the consumer's `toView` callback. */
export const view = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
): Html => {
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
  } = html<ParentMessage>()

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
