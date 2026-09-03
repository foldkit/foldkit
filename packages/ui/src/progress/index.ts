import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

import { clamp, fractionOfValue, percentString } from '../internal/range.js'

// VIEW

/** Attribute groups the progress component provides to the consumer's
 *  `toView` callback. Each group is a `ReadonlyArray<Attribute<Message>>`
 *  the consumer spreads into its own element attribute arrays. */
export type ProgressAttributes<Message> = Readonly<{
  progress: ReadonlyArray<Attribute<Message>>
  label: ReadonlyArray<Attribute<Message>>
  track: ReadonlyArray<Attribute<Message>>
  indicator: ReadonlyArray<Attribute<Message>>
}>

/** Per-render view configuration for the stateless controlled {@link view}.
 *  Generic over `Message` (the message universe of the frame the progress
 *  indicator is rendered in).
 *
 *  - `id`: base id for the progress element. The label id derives from it via
 *    {@link labelId}.
 *  - `value`: current value in `[min, max]`. `null` or `undefined` renders
 *    an indeterminate progress indicator with no `aria-valuenow`.
 *  - `min`: lower bound of the range. Defaults to `0`.
 *  - `max`: upper bound of the range. Defaults to `100`.
 *  - `valueText`: optional human readable text for `aria-valuetext`.
 *  - `toView`: receives the {@link ProgressAttributes} and lays out the
 *    progress indicator.
 *  - `ariaLabel` / `ariaLabelledBy`: accessible name, at least one is
 *    required. */
export type ViewConfig<Message> = Readonly<
  {
    id: string
    value?: number | null
    min?: number
    max?: number
    valueText?: string | ((value: number, max: number) => string)
    toView: (attributes: ProgressAttributes<Message>) => Html
  } & (
    | { ariaLabel: string }
    | { ariaLabelledBy: string }
    | { ariaLabel: string; ariaLabelledBy: string }
  )
>

/** Returns the label element id, derived from the progress base id. */
export const labelId = (id: string): string => `${id}-label`

/**
 * Renders an accessible progress indicator as a stateless controlled
 * component.
 *
 * Takes the consumer's builder, which pins `Message` to the universe of the
 * frame the progress indicator is rendered in.
 */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>,
): Html => {
  const min = config.min ?? 0
  const max = config.max ?? 100

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

  const labelAttributes: ReadonlyArray<Attribute<Message>> = [
    h.Id(labelId(config.id)),
  ]

  const isIndeterminate = config.value === null || config.value === undefined

  const resolveDeterminateValueText = (
    clampedValue: number,
    max: number,
  ): ReadonlyArray<Attribute<Message>> => {
    if (config.valueText === undefined) {
      return []
    }
    if (typeof config.valueText === 'string') {
      return [h.AriaValuetext(config.valueText)]
    }
    return [h.AriaValuetext(config.valueText(clampedValue, max))]
  }

  const resolveIndeterminateValueText = (): ReadonlyArray<
    Attribute<Message>
  > => {
    if (config.valueText === undefined) {
      return []
    }
    if (typeof config.valueText === 'string') {
      return [h.AriaValuetext(config.valueText)]
    }
    return [h.AriaValuetext(config.valueText(0, max))]
  }

  if (isIndeterminate) {
    const state = 'indeterminate'
    const indeterminateValueText = resolveIndeterminateValueText()

    const progressAttributes: ReadonlyArray<Attribute<Message>> = [
      h.Id(config.id),
      h.Role('progressbar'),
      ...indeterminateValueText,
      ...accessibleAttributes,
      h.DataAttribute('state', state),
      h.DataAttribute('indeterminate', ''),
    ]

    const trackAttributes: ReadonlyArray<Attribute<Message>> = [
      h.DataAttribute('state', state),
    ]

    const indicatorAttributes: ReadonlyArray<Attribute<Message>> = [
      h.DataAttribute('state', state),
      h.DataAttribute('indeterminate', ''),
    ]

    return config.toView({
      progress: progressAttributes,
      label: labelAttributes,
      track: trackAttributes,
      indicator: indicatorAttributes,
    })
  }

  const numericValue = typeof config.value === 'number' ? config.value : 0
  const clampedValue = clamp(numericValue, min, max)
  const fraction = fractionOfValue(clampedValue, min, max)
  const state = clampedValue >= max ? 'complete' : 'loading'
  const determinateValueText = resolveDeterminateValueText(clampedValue, max)

  const progressAttributes: ReadonlyArray<Attribute<Message>> = [
    h.Id(config.id),
    h.Role('progressbar'),
    h.AriaValuemin(min),
    h.AriaValuemax(max),
    h.AriaValuenow(clampedValue),
    ...determinateValueText,
    ...accessibleAttributes,
    h.DataAttribute('value', String(clampedValue)),
    h.DataAttribute('max', String(max)),
    h.DataAttribute('state', state),
  ]

  const trackAttributes: ReadonlyArray<Attribute<Message>> = [
    h.DataAttribute('state', state),
  ]

  const indicatorAttributes: ReadonlyArray<Attribute<Message>> = [
    h.Style({ width: percentString(fraction) }),
    h.DataAttribute('value', String(clampedValue)),
    h.DataAttribute('max', String(max)),
    h.DataAttribute('state', state),
  ]

  return config.toView({
    progress: progressAttributes,
    label: labelAttributes,
    track: trackAttributes,
    indicator: indicatorAttributes,
  })
}
