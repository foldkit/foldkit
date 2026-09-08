import { Command } from 'foldkit'
import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const mapMessages = (messages: ReadonlyArray<unknown>) =>
  Command.mapMessages(messages, message => Message.GotChildMessage({ message }))

const Message = defineMessageUnion({
  GotChildMessage: { message: S.Unknown },
})
