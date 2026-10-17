import { Predicate } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

// VIEW

/** Attribute groups the button component provides to the consumer's `toView` callback. */
export type ButtonAttributes<Message> = Readonly<{
  button: ReadonlyArray<Attribute<Message>>
}>

/** Configuration for rendering a button with `view`. */
export type ViewConfig<Message> = Readonly<{
  toView: (attributes: ButtonAttributes<Message>) => Html
  onClick?: Message
  isDisabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  isAutofocus?: boolean
}>

/**
 * Renders an accessible button by building attribute groups and delegating
 * layout to the consumer's `toView` callback.
 *
 * Takes the consumer's builder, which pins `Message` to the universe of the
 * frame the button is rendered in. `onClick` must come from that same
 * universe, so a Message the consumer's dispatcher cannot route is a compile
 * error here.
 */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>,
): Html => {
  const {
    toView,
    onClick,
    isDisabled = false,
    type = 'button',
    isAutofocus = false,
  } = config

  const disabledAttributes = isDisabled
    ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
    : []

  const clickAttributes =
    Predicate.isNotUndefined(onClick) && !isDisabled ? [h.OnClick(onClick)] : []

  const autofocusAttributes = isAutofocus ? [h.Autofocus(true)] : []

  const buttonAttributes = [
    h.Type(type),
    h.Tabindex(0),
    ...disabledAttributes,
    ...clickAttributes,
    ...autofocusAttributes,
  ]

  return toView({
    button: buttonAttributes,
  })
}
