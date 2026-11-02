// Before: a Definition-owned Command with a handler constructor and a Layer.
import { Effect } from 'effect'
import { Block } from 'foldkit'

import { Message, Model, OutMessage, Theme } from './model'
import { SettingsStore } from './settingsStore'

export const SettingsDefinition = Block.makeDefinition('Settings', {
  Model,
  Message,
  OutMessage,
})

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

// Later, at completion: EffectsLayer: SaveTheme.layer
