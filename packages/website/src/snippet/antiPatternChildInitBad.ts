// ❌ Bad: the Layer constructor reads storage once for every instance.

import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'

import { Theme, ThemeStore } from './antiPatternThemeStore'

export class ThemePreference extends Block<ThemePreference>()(
  'ThemePreference',
  { Model: Schema.Struct({ theme: Theme }) },
) {}

export const ThemePreferenceLive = ThemePreference.toLayer(
  Effect.gen(function* () {
    const themeStore = yield* ThemeStore
    const theme = yield* themeStore.load.pipe(
      Effect.orElseSucceed((): Theme => 'System'),
    )

    return {
      init: () => ({ theme }),
    }
  }),
)
