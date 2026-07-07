import { Schema as S } from 'effect'
import { m } from 'foldkit/message'
import { Settings } from './settings'

// MESSAGE

export const GotSettingsMessage = m('GotSettingsMessage', {
  message: Settings.Message,
  timestamp: S.Number,
})
