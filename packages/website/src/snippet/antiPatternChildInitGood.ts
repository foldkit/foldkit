// ✅ Good: a start Command loads the theme after the instance appears.

import { Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Theme, ThemeStore } from './antiPatternThemeStore'

const Message = defineMessageUnion({
  SucceededLoadTheme: { theme: Theme },
  FailedLoadTheme: {},
})

const LoadTheme = Command.define('LoadTheme', {
  messages: [Message.SucceededLoadTheme, Message.FailedLoadTheme],
})

export class ThemePreference extends Block<ThemePreference>()(
  'ThemePreference',
  {
    Model: Schema.Struct({ theme: Theme }),
    Message,
    OutMessage: defineMessageUnion({ RestoredTheme: { theme: Theme } }),
    Command: [LoadTheme],
  },
) {}

export const ThemePreferenceLive = ThemePreference.make(
  Effect.fn(function* () {
    const themeStore = yield* ThemeStore

    return {
      model: { theme: 'System' },

      start: [LoadTheme()],

      update: {
        SucceededLoadTheme: (model, { theme }) => ({
          model: modifyFields(model, { theme: () => theme }),
          outMessage: ThemePreference.OutMessage.RestoredTheme({ theme }),
        }),
        FailedLoadTheme: model => ({ model }),
      },

      commands: {
        LoadTheme: () =>
          themeStore.load.pipe(
            Effect.map(theme => Message.SucceededLoadTheme({ theme })),
            Effect.catch(() => Effect.succeed(Message.FailedLoadTheme())),
          ),
      },
    }
  }),
)
