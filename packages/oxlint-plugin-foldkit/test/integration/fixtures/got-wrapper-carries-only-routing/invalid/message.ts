import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { Settings } from './settings'

// MESSAGE

const Message = defineMessageUnion({
  GotSettingsMessage: {
  message: Settings.Message,
  timestamp: Schema.Number,
},
})
