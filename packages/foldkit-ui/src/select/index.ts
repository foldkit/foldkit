import { Predicate } from 'effect'
import type { Attribute } from 'foldkit/html'
import { html } from 'foldkit/html'
import type { Html } from 'foldkit/html'

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
  const h = html<ParentMessage>()

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
    ? [h.AriaDisabled(true), h.Disabled(true), h.DataAttribute('disabled', '')]
    : []

  const invalidAttributes = isInvalid
    ? [h.AriaInvalid(true), h.DataAttribute('invalid', '')]
    : []

  const changeAttributes =
    Predicate.isNotUndefined(onChange) && !isDisabled
      ? [h.OnChange(onChange)]
      : []

  const valueAttributes = Predicate.isNotUndefined(value)
    ? [h.Value(value)]
    : []

  const autofocusAttributes = isAutofocus ? [h.Autofocus(true)] : []

  const nameAttributes = Predicate.isNotUndefined(name) ? [h.Name(name)] : []

  const allSelectAttributes = [
    h.Id(id),
    h.AriaDescribedBy(descriptionId(id)),
    ...disabledAttributes,
    ...invalidAttributes,
    ...changeAttributes,
    ...valueAttributes,
    ...autofocusAttributes,
    ...nameAttributes,
  ]

  const labelAttributes = [h.For(id)]

  const descriptionAttributes = [h.Id(descriptionId(id))]

  return toView({
    select: allSelectAttributes,
    label: labelAttributes,
    description: descriptionAttributes,
  })
}
