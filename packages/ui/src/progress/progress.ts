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

/** Attribute groups provided to a Progress view. */
export type ProgressAttributes<Message> = Readonly<{
  progress: ReadonlyArray<Attribute<Message>>
  label: ReadonlyArray<Attribute<Message>>
  track: ReadonlyArray<Attribute<Message>>
  indicator: ReadonlyArray<Attribute<Message>>
}>

/** Configuration for rendering Progress with {@link view}. */
export type ViewConfig<Message> = Readonly<{
  id: string
  value?: number
  min?: number
  max?: number
  valueText?: string | ((value: number, max: number) => string)
  ariaLabel?: string
  ariaLabelledBy?: string
  toView: (attributes: ProgressAttributes<Message>) => Html
}>

/** Returns the label element id, derived from the progress base id. */
export const labelId = (id: string): string => `${id}-label`

/** Renders an accessible progress indicator as a stateless controlled view. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>,
): Html => {
  const min = config.min ?? 0
  const max = normalizeRangeMax(min, config.max ?? 100)
  const accessibleName = accessibleNameAttributes(
    {
      ariaLabel: config.ariaLabel,
      ariaLabelledBy: config.ariaLabelledBy,
      fallbackLabelId: labelId(config.id),
    },
    h,
  )

  const visibleLabelAttributes: ReadonlyArray<Attribute<Message>> = [
    h.Id(labelId(config.id)),
  ]

  const resolveDeterminateValueTextAttributes = (
    clampedValue: number,
  ): ReadonlyArray<Attribute<Message>> => {
    if (config.valueText === undefined) {
      return []
    } else if (Predicate.isString(config.valueText)) {
      return [h.AriaValuetext(config.valueText)]
    } else {
      return [h.AriaValuetext(config.valueText(clampedValue, max))]
    }
  }

  if (config.value === undefined) {
    const stateAttributes = [
      h.DataAttribute('state', 'indeterminate'),
      h.DataAttribute('indeterminate', ''),
    ]
    const valueTextAttributes = Predicate.isString(config.valueText)
      ? [h.AriaValuetext(config.valueText)]
      : []

    const progressAttributes: ReadonlyArray<Attribute<Message>> = [
      h.Id(config.id),
      h.Role('progressbar'),
      ...valueTextAttributes,
      ...accessibleName,
      ...stateAttributes,
    ]

    return config.toView({
      progress: progressAttributes,
      label: visibleLabelAttributes,
      track: stateAttributes,
      indicator: stateAttributes,
    })
  } else {
    const clampedValue = clamp(config.value, min, max)
    const fraction = fractionOfValue(clampedValue, min, max)
    const state = clampedValue >= max ? 'complete' : 'loading'
    const stateAttributes = [h.DataAttribute('state', state)]
    const valueAttributes = [
      h.DataAttribute('value', String(clampedValue)),
      h.DataAttribute('min', String(min)),
      h.DataAttribute('max', String(max)),
    ]

    const progressAttributes: ReadonlyArray<Attribute<Message>> = [
      h.Id(config.id),
      h.Role('progressbar'),
      h.AriaValuemin(min),
      h.AriaValuemax(max),
      h.AriaValuenow(clampedValue),
      ...resolveDeterminateValueTextAttributes(clampedValue),
      ...accessibleName,
      ...valueAttributes,
      ...stateAttributes,
    ]

    const indicatorAttributes: ReadonlyArray<Attribute<Message>> = [
      h.Style({ width: percentageFromFraction(fraction) }),
      ...valueAttributes,
      ...stateAttributes,
    ]

    return config.toView({
      progress: progressAttributes,
      label: visibleLabelAttributes,
      track: stateAttributes,
      indicator: indicatorAttributes,
    })
  }
}
