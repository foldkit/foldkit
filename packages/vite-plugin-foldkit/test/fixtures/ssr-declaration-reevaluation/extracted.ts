import { Command } from 'foldkit'

import { Message } from './definition'

export const LoadPreferences = Command.define('LoadPreferences', {
  messages: [Message.CompletedLoadPreferences],
})
