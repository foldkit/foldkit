import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

// VIEW

/** Attribute groups the fieldset component provides to the consumer's `toView` callback. */
export type FieldsetAttributes<Message> = Readonly<{
  fieldset: ReadonlyArray<Attribute<Message>>
  legend: ReadonlyArray<Attribute<Message>>
  description: ReadonlyArray<Attribute<Message>>
}>

/** Configuration for rendering a fieldset with `view`. */
export type ViewConfig<Message> = Readonly<{
  id: string
  toView: (attributes: FieldsetAttributes<Message>) => Html
  isDisabled?: boolean
}>

/** Returns the legend element id, derived from the fieldset's base id. */
export const legendId = (id: string): string => `${id}-legend`

/** Returns the description element id, derived from the fieldset's base id. */
export const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible fieldset by building ARIA attribute groups and delegating layout to the consumer's `toView` callback. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>,
): Html => {
  const { toView, id, isDisabled = false } = config

  const disabledAttributes = isDisabled
    ? [h.Disabled(true), h.DataAttribute('disabled', '')]
    : []

  const allFieldsetAttributes = [
    h.Id(id),
    h.AriaDescribedBy(descriptionId(id)),
    ...disabledAttributes,
  ]

  const legendAttributes = [h.Id(legendId(id))]

  const descriptionAttributes = [h.Id(descriptionId(id))]

  return toView({
    fieldset: allFieldsetAttributes,
    legend: legendAttributes,
    description: descriptionAttributes,
  })
}
