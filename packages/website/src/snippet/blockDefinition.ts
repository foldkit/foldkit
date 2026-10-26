import { Context, Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Theme = Schema.Literals(['Light', 'Dark', 'System'])

export const Model = Schema.Struct({ theme: Theme })

export const Message = defineMessageUnion({
  ChangedTheme: { theme: Theme },
  RequestedThemeChange: { theme: Theme },
  RequestedReset: {},
  CompletedSaveTheme: {},
  FailedSaveTheme: {},
})

export const OutMessage = defineMessageUnion({
  ChangedTheme: { theme: Theme },
})

export const SettingsDefinition = Block.makeDefinition('Settings', {
  Model,
  Message,
  OutMessage,
})

export const { makeStep, makeNoopStep } = SettingsDefinition

export const SettingsComposition = SettingsDefinition.makeComposition()

export class SettingsStore extends Context.Service<
  SettingsStore,
  Readonly<{
    saveTheme: (theme: typeof Theme.Type) => Effect.Effect<void, Error>
  }>
>()('SettingsStore') {}

export const SaveTheme = SettingsDefinition.makeCommand('SaveTheme', {
  args: { theme: Theme },
  messages: [Message.CompletedSaveTheme, Message.FailedSaveTheme],
  handler: function* () {
    const settingsStore = yield* SettingsStore

    return ({ theme }) =>
      settingsStore.saveTheme(theme).pipe(
        Effect.as(Message.CompletedSaveTheme()),
        Effect.catch(() => Effect.succeed(Message.FailedSaveTheme())),
      )
  },
})
