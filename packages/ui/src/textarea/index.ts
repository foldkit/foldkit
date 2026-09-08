import { Predicate } from 'effect'
import type {
  Attribute,
  Html,
  HtmlBuilder,
  TextareaAttribute,
} from 'foldkit/html'

// VIEW

/** Attribute groups the textarea component provides to the consumer's `toView` callback. */
export type TextareaAttributes<Message> = Readonly<{
  textarea: ReadonlyArray<TextareaAttribute<Message>>
  label: ReadonlyArray<Attribute<Message>>
  description: ReadonlyArray<Attribute<Message>>
}>

/** Configuration for rendering a textarea with `view`. */
export type ViewConfig<Message> = Readonly<{
  id: string
  toView: (attributes: TextareaAttributes<Message>) => Html
  onInput?: (value: string) => Message
  value?: string
  isDisabled?: boolean
  isReadOnly?: boolean
  isInvalid?: boolean
  isAutofocus?: boolean
  name?: string
  rows?: number
  placeholder?: string
}>

/** Returns the description element id, derived from the textarea's base id. */
export const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible textarea by building ARIA attribute groups and delegating layout to the consumer's `toView` callback. */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>,
): Html => {
  const {
    toView,
    id,
    onInput,
    value,
    isDisabled = false,
    isReadOnly = false,
    isInvalid = false,
    isAutofocus = false,
    name,
    rows,
    placeholder,
  } = config

  const disabledAttributes = isDisabled
    ? [h.Disabled(true), h.DataAttribute('disabled', '')]
    : []

  const readOnlyAttributes = isReadOnly
    ? [h.Readonly(true), h.DataAttribute('readonly', '')]
    : []

  const invalidAttributes = isInvalid
    ? [h.AriaInvalid(true), h.DataAttribute('invalid', '')]
    : []

  const isInteractive = !isDisabled && !isReadOnly

  const inputAttributes =
    Predicate.isNotUndefined(onInput) && isInteractive
      ? [h.OnInput(onInput)]
      : []

  const valueAttributes = Predicate.isNotUndefined(value)
    ? [h.Value(value)]
    : []

  const autofocusAttributes = isAutofocus ? [h.Autofocus(true)] : []

  const nameAttributes = Predicate.isNotUndefined(name) ? [h.Name(name)] : []

  const rowsAttributes = Predicate.isNotUndefined(rows) ? [h.Rows(rows)] : []

  const placeholderAttributes = Predicate.isNotUndefined(placeholder)
    ? [h.Placeholder(placeholder)]
    : []

  const allTextareaAttributes = [
    h.Id(id),
    h.AriaDescribedBy(descriptionId(id)),
    ...disabledAttributes,
    ...readOnlyAttributes,
    ...invalidAttributes,
    ...inputAttributes,
    ...valueAttributes,
    ...autofocusAttributes,
    ...nameAttributes,
    ...rowsAttributes,
    ...placeholderAttributes,
  ]

  const labelAttributes = [h.For(id)]

  const descriptionAttributes = [h.Id(descriptionId(id))]

  return toView({
    textarea: allTextareaAttributes,
    label: labelAttributes,
    description: descriptionAttributes,
  })
}
