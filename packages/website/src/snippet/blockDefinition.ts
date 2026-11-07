import { Context, Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

export const Theme = Schema.Literals(['Light', 'Dark', 'System'])
export type Theme = typeof Theme.Type

export const Model = Schema.Struct({ theme: Theme })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ChangedTheme: { theme: Theme },
  CompletedSaveTheme: {},
  FailedSaveTheme: {},
})
export type Message = typeof Message.Type

export const InMessage = defineInMessageUnion({
  RequestedThemeChange: { theme: Theme },
  RequestedReset: {},
})
export type InMessage = typeof InMessage.Type

export const OutMessage = defineMessageUnion({
  ChangedTheme: { theme: Theme },
})
export type OutMessage = typeof OutMessage.Type

export class SettingsStore extends Context.Service<
  SettingsStore,
  Readonly<{
    saveTheme: (theme: Theme) => Effect.Effect<void, Error>
  }>
>()('SettingsStore') {}

export const SettingsKey = Symbol('Settings')
export const SettingsBlock = Block.make('Settings', {
  key: SettingsKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects: { services: [SettingsStore] },
  inMessageOutputs: {
    RequestedThemeChange: { outMessage: OutMessage },
    RequestedReset: { outMessage: OutMessage },
  },

  Model,
  Message,
  InMessage,
  OutMessage,
})

export const { makeStep, makeNoopStep, makeComposition, makeCommand } =
  SettingsBlock

export const SettingsComposition = makeComposition()

export const SaveTheme = makeCommand('SaveTheme', {
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
