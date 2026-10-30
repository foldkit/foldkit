import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'

import { Settings, SettingsStore } from './blockSettingsContract'

const previewSettingsStore = SettingsStore.of({
  saveTheme: () => Effect.void,
})

export class ThemeEditor extends Block<ThemeEditor>()('ThemeEditor', {
  Model: Schema.Struct({ live: Settings, preview: Settings }),
}) {}

export const ThemeEditorLive = ThemeEditor.make(
  Effect.fn(function* () {
    const live = yield* new Settings('live', { initialTheme: 'System' })
    const preview = yield* new Settings('preview', {
      initialTheme: 'Dark',
    }).pipe(Effect.provideService(SettingsStore, previewSettingsStore))

    return {
      model: { live, preview },

      view: (model, h) => h.div([], [model.live.view(), model.preview.view()]),
    }
  }),
)
