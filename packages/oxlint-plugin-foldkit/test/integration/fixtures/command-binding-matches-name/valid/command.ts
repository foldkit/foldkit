import { Effect } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedFetchUser: {},
})


export const FetchUser = Command.define('FetchUser', {
  messages: [Message.CompletedFetchUser],
  execute: Effect.succeed(Message.CompletedFetchUser()),
})

export const defineLocal = (Command: { define: (name: string) => string }) => {
  const LocalCommand = Command.define('DifferentName')

  return LocalCommand
}
