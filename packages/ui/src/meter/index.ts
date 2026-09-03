import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

import { clamp, fractionOfValue, percentString } from '../internal/range.js'

// VIEW

/** Attribute groups the meter provides to the consumer's `toView` callback.
 *  Each group is a `ReadonlyArray<Attribute<Message>>` the consumer spreads
 *  into its own element attribute arrays. */
export type MeterAttributes<Message> = Readonly<{
  meter: ReadonlyArray<Attribute<Message>>
  label: ReadonlyArray<Attribute<Message>>
  fill: ReadonlyArray<Attribute<Message>>
}>

/** Per-render view configuration for the stateless controlled {@link view}.
 *  Generic over `Message` (the message universe of the frame the meter is
 *  rendered in).
 *
 *  - `id`: base id for the meter element. The label id derives from it via
 *    {@link labelId}.
 *  - `value`: current scalar value. Clamped into `[min, max]` for
 *    `aria-valuenow` and the fill width.
 *  - `min`: lower bound of the range. Defaults to `0`.
 *  - `max`: upper bound of the range. Defaults to `100`.
 *  - `low` / `high` / `optimum`: optional thresholds for styling via
 *    `data-low`, `data-high`, and `data-optimum` on the meter element.
 *  - `valueText`: optional human readable text for `aria-valuetext`.
 *  - `toView`: receives the {@link MeterAttributes} and lays out the meter.
 *  - `ariaLabel` / `ariaLabelledBy`: accessible name, at least one is
 *    required. */
export type ViewConfig<Message> = Readonly<
  {
    id: string
    value: number
    min?: number
    max?: number
    low?: number
    high?: number
    optimum?: number
    valueText?: string | ((value: number, max: number) => string)
    toView: (attributes: MeterAttributes<Message>) => Html
  } & (
    | { ariaLabel: string }
    | { ariaLabelledBy: string }
    | { ariaLabel: string; ariaLabelledBy: string }
  )
>

/** Returns the label element id, derived from the meter's base id. */
export const labelId = (id: string): string => `${id}-label`

/**
 * Renders an accessible meter as a stateless controlled component.
 *
 * Takes the consumer's builder, which pins `Message` to the universe of the
 * frame the meter is rendered in.
 */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>,
): Html => {
  const min = config.min ?? 0
  const max = config.max ?? 100
  const clampedValue = clamp(config.value, min, max)
  const fraction = fractionOfValue(clampedValue, min, max)

  const resolveValueText = (): ReadonlyArray<Attribute<Message>> => {
    if (config.valueText === undefined) {
      return []
    }
    if (typeof config.valueText === 'string') {
      return [h.AriaValuetext(config.valueText)]
    }
    return [h.AriaValuetext(config.valueText(clampedValue, max))]
  }

  const maybeValueText = resolveValueText()

  const accessibleAttributes: Array<Attribute<Message>> = []

  if ('ariaLabel' in config && config.ariaLabel !== undefined) {
    accessibleAttributes.push(h.AriaLabel(config.ariaLabel))
  }

  if ('ariaLabelledBy' in config && config.ariaLabelledBy !== undefined) {
    accessibleAttributes.push(h.AriaLabelledBy(config.ariaLabelledBy))
  }

  if (accessibleAttributes.length === 0) {
    accessibleAttributes.push(h.AriaLabelledBy(labelId(config.id)))
  }

  const thresholdAttributes: Array<Attribute<Message>> = []

  if (config.low !== undefined) {
    thresholdAttributes.push(h.DataAttribute('low', String(config.low)))
  }

  if (config.high !== undefined) {
    thresholdAttributes.push(h.DataAttribute('high', String(config.high)))
  }

  if (config.optimum !== undefined) {
    thresholdAttributes.push(h.DataAttribute('optimum', String(config.optimum)))
  }

  const meterAttributes: ReadonlyArray<Attribute<Message>> = [
    h.Id(config.id),
    h.Role('meter'),
    h.AriaValuemin(min),
    h.AriaValuemax(max),
    h.AriaValuenow(clampedValue),
    ...maybeValueText,
    ...accessibleAttributes,
    h.DataAttribute('value', String(clampedValue)),
    h.DataAttribute('min', String(min)),
    h.DataAttribute('max', String(max)),
    ...thresholdAttributes,
  ]

  const fillAttributes: ReadonlyArray<Attribute<Message>> = [
    h.Style({ width: percentString(fraction) }),
    h.DataAttribute('value', String(clampedValue)),
    h.DataAttribute('max', String(max)),
    h.DataAttribute('state', fraction >= 1 ? 'complete' : 'loading'),
  ]

  const labelAttributes: ReadonlyArray<Attribute<Message>> = [
    h.Id(labelId(config.id)),
  ]

  return config.toView({
    meter: meterAttributes,
    label: labelAttributes,
    fill: fillAttributes,
  })
}
