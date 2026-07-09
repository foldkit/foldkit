import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

export const ToggledFaqDisclosure = m('ToggledFaqDisclosure', {
  id: S.String,
  isOpen: S.Boolean,
})

export const Message = S.Union([ToggledFaqDisclosure])
export type Message = typeof Message.Type
