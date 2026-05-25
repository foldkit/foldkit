import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

// MESSAGE

export const ClickedLogout = m('ClickedLogout')
export const Message = S.Union([ClickedLogout])
export type Message = typeof Message.Type

// OUT MESSAGE

export const RequestedLogout = m('RequestedLogout')
export const OutMessage = S.Union([RequestedLogout])
export type OutMessage = typeof OutMessage.Type
