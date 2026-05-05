import { Predicate } from 'effect'

import type { Attribute } from '../../html/index.js'
import { html } from '../../html/index.js'
import type { Html } from '../../html/index.js'

// VIEW

/** Attribute groups the textarea component provides to the consumer's `toView` callback. */
export type TextareaAttributes<ParentMessage> = Readonly<{
  textarea: ReadonlyArray<Attribute<ParentMessage>>
  label: ReadonlyArray<Attribute<ParentMessage>>
  description: ReadonlyArray<Attribute<ParentMessage>>
}>

/** Configuration for rendering a textarea with `view`. */
export type ViewConfig<ParentMessage> = Readonly<{
  id: string
  toView: (attributes: TextareaAttributes<ParentMessage>) => Html
  onInput?: (value: string) => ParentMessage
  value?: string
  isDisabled?: boolean
  isInvalid?: boolean
  isAutofocus?: boolean
  name?: string
  rows?: number
  placeholder?: string
}>

/** Generates the description element ID from the textarea's base ID. */
export const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible textarea by building ARIA attribute groups and delegating layout to the consumer's `toView` callback. */
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
    OnInput,
    Placeholder,
    Rows,
    Value,
  } = html<ParentMessage>()

  const {
    toView,
    id,
    onInput,
    value,
    isDisabled = false,
    isInvalid = false,
    isAutofocus = false,
    name,
    rows,
    placeholder,
  } = config

  const disabledAttributes = isDisabled
    ? [AriaDisabled(true), Disabled(true), DataAttribute('disabled', '')]
    : []

  const invalidAttributes = isInvalid
    ? [AriaInvalid(true), DataAttribute('invalid', '')]
    : []

  const inputAttributes =
    Predicate.isNotUndefined(onInput) && !isDisabled ? [OnInput(onInput)] : []

  const valueAttributes = Predicate.isNotUndefined(value) ? [Value(value)] : []

  const autofocusAttributes = isAutofocus ? [Autofocus(true)] : []

  const nameAttributes = Predicate.isNotUndefined(name) ? [Name(name)] : []

  const rowsAttributes = Predicate.isNotUndefined(rows) ? [Rows(rows)] : []

  const placeholderAttributes = Predicate.isNotUndefined(placeholder)
    ? [Placeholder(placeholder)]
    : []

  const allTextareaAttributes = [
    Id(id),
    AriaDescribedBy(descriptionId(id)),
    ...disabledAttributes,
    ...invalidAttributes,
    ...inputAttributes,
    ...valueAttributes,
    ...autofocusAttributes,
    ...nameAttributes,
    ...rowsAttributes,
    ...placeholderAttributes,
  ]

  const labelAttributes = [For(id)]

  const descriptionAttributes = [Id(descriptionId(id))]

  return toView({
    textarea: allTextareaAttributes,
    label: labelAttributes,
    description: descriptionAttributes,
  })
}
