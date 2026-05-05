import type { Attribute } from '../../html/index.js'
import { html } from '../../html/index.js'
import type { Html } from '../../html/index.js'

// VIEW

/** Attribute groups the fieldset component provides to the consumer's `toView` callback. */
export type FieldsetAttributes<ParentMessage> = Readonly<{
  fieldset: ReadonlyArray<Attribute<ParentMessage>>
  legend: ReadonlyArray<Attribute<ParentMessage>>
  description: ReadonlyArray<Attribute<ParentMessage>>
}>

/** Configuration for rendering a fieldset with `view`. */
export type ViewConfig<ParentMessage> = Readonly<{
  id: string
  toView: (attributes: FieldsetAttributes<ParentMessage>) => Html
  isDisabled?: boolean
}>

/** Generates the legend element ID from the fieldset's base ID. */
export const legendId = (id: string): string => `${id}-legend`

/** Generates the description element ID from the fieldset's base ID. */
export const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible fieldset by building ARIA attribute groups and delegating layout to the consumer's `toView` callback. */
export const view = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
): Html => {
  const { AriaDescribedBy, DataAttribute, Disabled, Id } = html<ParentMessage>()

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
