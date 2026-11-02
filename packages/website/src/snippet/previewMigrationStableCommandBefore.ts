// Stable before: the Command owns the Effect that runs each invocation.
import { Effect } from 'effect'
import { Command } from 'foldkit'

import { Message, Theme } from './message'
import { SettingsStore } from './settingsStore'

export const SaveTheme = Command.define('SaveTheme', {
  args: { theme: Theme },
  messages: [Message.CompletedSaveTheme, Message.FailedSaveTheme],
  execute: ({ theme }) =>
    Effect.gen(function* () {
      const settingsStore = yield* SettingsStore
      yield* settingsStore.saveTheme(theme)

      return Message.CompletedSaveTheme()
    }).pipe(Effect.catch(() => Effect.succeed(Message.FailedSaveTheme()))),
})
