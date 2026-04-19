import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import * as Settings from './page/settings'

// MESSAGE

export const GotSettingsMessage = m('GotSettingsMessage', {
  message: Settings.Message,
})
export const Message = S.Union(GotSettingsMessage)
export type Message = typeof Message.Type

// OUT MESSAGE

export const RequestedLogout = m('RequestedLogout')
export const OutMessage = S.Union(RequestedLogout)
export type OutMessage = typeof OutMessage.Type
