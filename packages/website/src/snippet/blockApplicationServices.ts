import { Effect, Layer } from 'effect'

import { SettingsStore } from './blockDefinition'

export const ApplicationLayer = Layer.succeed(SettingsStore, {
  saveTheme: theme =>
    Effect.try({
      try: () => localStorage.setItem('theme', theme),
      catch: cause => new Error('Unable to save theme', { cause }),
    }),
})
