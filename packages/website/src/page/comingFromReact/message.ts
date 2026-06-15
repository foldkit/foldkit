import { Disclosure } from '@foldkit/ui'
import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

export const GotFaqDisclosureMessage = m('GotFaqDisclosureMessage', {
  id: S.String,
  message: Disclosure.Message,
})

export const Message = S.Union([GotFaqDisclosureMessage])
export type Message = typeof Message.Type
