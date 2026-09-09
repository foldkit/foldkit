import { Schema } from 'effect'
import { Message as MessageApi } from 'foldkit'
import { Settings } from './settings'

const Message = MessageApi.defineMessageUnion({
  GotSettingsMessage: {
    message: Settings.Message,
    timestamp: Schema.Number,
  },
})
