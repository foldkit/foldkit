import { html } from 'foldkit/html'

import type { Message } from './message'

export const {
  button,
  div,
  empty,
  form,
  h1,
  h2,
  input,
  keyed,
  span,
  ul,
  AriaHidden,
  AriaLive,
  Class,
  OnKeyDownPreventDefault,
  OnSubmit,
  Style,
} = html<Message>()
