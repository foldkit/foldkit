import { Schema } from 'effect'
import { Command } from 'foldkit'

import { Message } from './informingBlocksMessage'

export const FetchPeople = Command.define('FetchPeople', {
  args: { searchText: Schema.String },
  messages: [Message.CompletedFetchPeople],
})
