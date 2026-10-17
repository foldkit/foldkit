// settings.ts

import { Settings } from './definition'

export const Theme = Schema.Literals(['Light', 'Dark'])
export type Theme = typeof Theme.Type

export const Message = defineMessageUnion({
  RestoredTheme: { theme: Theme },
  CompletedRefreshAvailableThemes: {},
})

export const OutMessage = defineMessageUnion({
  RestoredTheme: { theme: Theme },
})

const SettingsComposition = Settings.makeComposition()

export const init = SettingsComposition.makeInit(() => ({
  model: Model.make({ theme: 'Light' }),
}))

export const update = SettingsComposition.makeUpdate((model, message) =>
  Message.match(message, {
    RestoredTheme: ({ theme }) => ({
      model: modifyFields(model, { theme: () => theme }),
      commands: [RefreshAvailableThemes()],
      outMessage: OutMessage.RestoredTheme({ theme }),
    }),
    CompletedRefreshAvailableThemes: () => ({ model }),
  }),
)

export const restore = Settings.step((model, theme: Theme) =>
  update(model, Message.RestoredTheme({ theme })),
)

export const block = SettingsComposition.makeBlock({
  init,
  update,
  expose: { restore },
  EffectsLayer,
})
