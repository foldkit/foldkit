import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Settings } from './page'

export const Message = defineMessageUnion({
  GotSettingsMessage: { message: Settings.Message },
})
export type Message = typeof Message.Type
