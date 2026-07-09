import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

export const ToggledFaq = m('ToggledFaq', {
  id: S.String,
  isOpen: S.Boolean,
})

export const Message = S.Union([ToggledFaq])
export type Message = typeof Message.Type
