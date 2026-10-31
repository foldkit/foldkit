// ❌ Bad: the constructor waits for storage before returning.

import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'

import { Theme, ThemeStore } from './antiPatternThemeStore'

export class ThemePreference extends Block<ThemePreference>()(
  'ThemePreference',
  { Model: Schema.Struct({ theme: Theme }) },
) {}

export const ThemePreferenceLive = ThemePreference.make(
  Effect.fn(function* () {
    const themeStore = yield* ThemeStore
    const theme = yield* themeStore.load.pipe(
      Effect.orElseSucceed((): Theme => 'System'),
    )

    return {
      model: { theme },
    }
  }),
)
