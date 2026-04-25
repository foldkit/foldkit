import type { Attribute } from '../../html/index.js'
import { html } from '../../html/index.js'
import type { Html } from '../../html/index.js'

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

/** Generates the legend element ID from the fieldset's base ID. */
export const legendId = (id: string): string => `${id}-legend`

/** Generates the description element ID from the fieldset's base ID. */
export const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible fieldset by building ARIA attribute groups and delegating layout to the consumer's `toView` callback. */
export const view = <Message>(config: ViewConfig<Message>): Html => {
  const { AriaDescribedBy, DataAttribute, Disabled, Id } = html<Message>()

  const { toView, id, isDisabled = false } = config

  const disabledAttributes = isDisabled
    ? [Disabled(true), DataAttribute('disabled', '')]
    : []

  const allFieldsetAttributes = [
    Id(id),
    AriaDescribedBy(descriptionId(id)),
    ...disabledAttributes,
  ]

  const legendAttributes = [Id(legendId(id))]

  const descriptionAttributes = [Id(descriptionId(id))]

  return toView({
    fieldset: allFieldsetAttributes,
    legend: legendAttributes,
    description: descriptionAttributes,
  })
}
