import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import { Settings } from './page'

export const GotSettingsMessage = m('GotSettingsMessage', {
  message: Settings.Message,
})

export const Message = S.Union(GotSettingsMessage)
export type Message = typeof Message.Type
