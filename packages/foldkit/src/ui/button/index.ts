import { Predicate } from 'effect'

import type { Attribute } from '../../html/index.js'
import { html } from '../../html/index.js'
import type { Html } from '../../html/index.js'

// VIEW

/** Attribute groups the button component provides to the consumer's `toView` callback. */
export type ButtonAttributes<ParentMessage> = Readonly<{
  button: ReadonlyArray<Attribute<ParentMessage>>
}>

/** Configuration for rendering a button with `view`. */
export type ViewConfig<ParentMessage> = Readonly<{
  toView: (attributes: ButtonAttributes<ParentMessage>) => Html
  onClick?: ParentMessage
  isDisabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  isAutofocus?: boolean
}>

/** Renders an accessible button by building attribute groups and delegating layout to the consumer's `toView` callback. */
export const view = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
): Html => {
  const { Autofocus, AriaDisabled, DataAttribute, OnClick, Tabindex, Type } =
    html<ParentMessage>()

  const {
    toView,
    onClick,
    isDisabled = false,
    type = 'button',
    isAutofocus = false,
  } = config

  const disabledAttributes = isDisabled
    ? [AriaDisabled(true), DataAttribute('disabled', '')]
    : []

  const clickAttributes =
    Predicate.isNotUndefined(onClick) && !isDisabled ? [OnClick(onClick)] : []

  const autofocusAttributes = isAutofocus ? [Autofocus(true)] : []

  const buttonAttributes = [
    Type(type),
    Tabindex(0),
    ...disabledAttributes,
    ...clickAttributes,
    ...autofocusAttributes,
  ]

  return toView({
    button: buttonAttributes,
  })
}
