import { Predicate } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

import { accessibleNameAttributes } from '../internal/accessibleName.js'
import {
  clamp,
  fractionOfValue,
  normalizeRangeMax,
  percentageFromFraction,
} from '../internal/range.js'

// VIEW

/** Attribute groups provided to a Meter view. */
export type MeterAttributes<Message> = Readonly<{
  meter: ReadonlyArray<Attribute<Message>>
  label: ReadonlyArray<Attribute<Message>>
  fill: ReadonlyArray<Attribute<Message>>
}>

/** Configuration for rendering a Meter with {@link view}. */
export type ViewConfig<Message> = Readonly<{
  id: string
  value: number
  min?: number
  max?: number
  low?: number
  high?: number
  optimum?: number
  valueText?: string | ((value: number, max: number) => string)
  ariaLabel?: string
  ariaLabelledBy?: string
  toView: (attributes: MeterAttributes<Message>) => Html
}>

/** Returns the label element id, derived from the meter's base id. */
export const labelId = (id: string): string => `${id}-label`

/** Renders an accessible meter as a stateless controlled view. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>,
): Html => {
  const min = config.min ?? 0
  const max = normalizeRangeMax(min, config.max ?? 100)
  const clampedValue = clamp(config.value, min, max)
  const fraction = fractionOfValue(clampedValue, min, max)
  const accessibleName = accessibleNameAttributes(
    {
      ariaLabel: config.ariaLabel,
      ariaLabelledBy: config.ariaLabelledBy,
      fallbackLabelId: labelId(config.id),
    },
    h,
  )

  const resolveValueTextAttributes = (): ReadonlyArray<Attribute<Message>> => {
    if (config.valueText === undefined) {
      return []
    } else if (Predicate.isString(config.valueText)) {
      return [h.AriaValuetext(config.valueText)]
    } else {
      return [h.AriaValuetext(config.valueText(clampedValue, max))]
    }
  }

  const thresholdAttributes = [
    ...(config.low !== undefined
      ? [h.DataAttribute('low', String(config.low))]
      : []),
    ...(config.high !== undefined
      ? [h.DataAttribute('high', String(config.high))]
      : []),
    ...(config.optimum !== undefined
      ? [h.DataAttribute('optimum', String(config.optimum))]
      : []),
  ]

  const meterAttributes: ReadonlyArray<Attribute<Message>> = [
    h.Id(config.id),
    h.Role('meter'),
    h.AriaValuemin(min),
    h.AriaValuemax(max),
    h.AriaValuenow(clampedValue),
    ...resolveValueTextAttributes(),
    ...accessibleName,
    h.DataAttribute('value', String(clampedValue)),
    h.DataAttribute('min', String(min)),
    h.DataAttribute('max', String(max)),
    ...thresholdAttributes,
  ]

  const fillAttributes: ReadonlyArray<Attribute<Message>> = [
    h.Style({ width: percentageFromFraction(fraction) }),
    h.DataAttribute('value', String(clampedValue)),
    h.DataAttribute('min', String(min)),
    h.DataAttribute('max', String(max)),
  ]

  const visibleLabelAttributes: ReadonlyArray<Attribute<Message>> = [
    h.Id(labelId(config.id)),
  ]

  return config.toView({
    meter: meterAttributes,
    label: visibleLabelAttributes,
    fill: fillAttributes,
  })
}
