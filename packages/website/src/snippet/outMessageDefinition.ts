import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

// MESSAGE

export const SubmittedLoginForm = m('SubmittedLoginForm')

export const Message = S.Union(SubmittedLoginForm)
export type Message = typeof Message.Type

// OUT MESSAGE

export const SucceededLogin = m('SucceededLogin', {
  sessionId: S.String,
})

export const OutMessage = S.Union(SucceededLogin)
export type OutMessage = typeof OutMessage.Type
