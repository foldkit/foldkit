import { Predicate } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

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

/** Returns the description element id, derived from the select's base id. */
export const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible select by building ARIA attribute groups and delegating layout to the consumer's `toView` callback. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>,
): Html => {
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
    ? [h.Disabled(true), h.DataAttribute('disabled', '')]
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
