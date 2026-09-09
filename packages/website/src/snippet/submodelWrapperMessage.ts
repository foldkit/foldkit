import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import * as Settings from './page/settings'

export const Message = defineMessageUnion({
  GotSettingsMessage: { message: Settings.Message },
})
export type Message = typeof Message.Type
