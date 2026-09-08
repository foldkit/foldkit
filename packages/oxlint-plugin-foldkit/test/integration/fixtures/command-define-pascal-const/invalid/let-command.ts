import { Effect } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedRefreshSession: {},
})

const refreshSessionEffect = Effect.succeed(Message.CompletedRefreshSession())

export let RefreshSession = Command.define('RefreshSession', {
  messages: [Message.CompletedRefreshSession],
  execute: refreshSessionEffect,
})
