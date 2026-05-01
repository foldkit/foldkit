import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

export const GotFaqDisclosureMessage = m('GotFaqDisclosureMessage', {
  id: S.String,
  message: Ui.Disclosure.Message,
})

export const Message = S.Union([GotFaqDisclosureMessage])
export type Message = typeof Message.Type
