import { Context, Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Theme = Schema.Literals(['Light', 'Dark', 'System'])
export type Theme = typeof Theme.Type

export class SettingsStore extends Context.Service<
  SettingsStore,
  Readonly<{
    saveTheme: (theme: Theme) => Effect.Effect<void, Error>
  }>
>()('SettingsStore') {}

const Message = defineMessageUnion({
  ClickedTheme: { theme: Theme },
  RequestedReset: {},
  SucceededSaveTheme: {},
  FailedSaveTheme: { reason: Schema.String },
})

export const SaveTheme = Command.define('SaveTheme', {
  args: { theme: Theme },
  messages: [Message.SucceededSaveTheme, Message.FailedSaveTheme],
})

export class Settings extends Block<
  Settings,
  Readonly<{ initialTheme: Theme }>
>()('Settings', {
  Model: Schema.Struct({
    theme: Theme,
    maybeSaveError: Schema.Option(Schema.String),
  }),
  Message,
  OutMessage: defineMessageUnion({ ChangedTheme: { theme: Theme } }),
  Command: [SaveTheme],
}) {}
