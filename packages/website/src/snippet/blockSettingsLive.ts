import { Effect, Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { SaveTheme, Settings, SettingsStore } from './blockSettingsContract'

export const SettingsLive = Settings.make(
  Effect.fn(function* (_id, { initialTheme }) {
    const settingsStore = yield* SettingsStore

    return {
      model: { theme: initialTheme, maybeSaveError: Option.none() },

      update: {
        ClickedTheme: (model, { theme }) => ({
          model: modifyFields(model, { theme: () => theme }),
          commands: [SaveTheme({ theme })],
          outMessage: Settings.OutMessage.ChangedTheme({ theme }),
        }),
        RequestedReset: model => ({
          model: modifyFields(model, { theme: () => 'System' }),
          commands: [SaveTheme({ theme: 'System' })],
          outMessage: Settings.OutMessage.ChangedTheme({ theme: 'System' }),
        }),
        SucceededSaveTheme: model => ({
          model: modifyFields(model, { maybeSaveError: () => Option.none() }),
        }),
        FailedSaveTheme: (model, { reason }) => ({
          model: modifyFields(model, {
            maybeSaveError: () => Option.some(reason),
          }),
        }),
      },

      commands: {
        SaveTheme: ({ theme }) =>
          settingsStore.saveTheme(theme).pipe(
            Effect.as(Settings.Message.SucceededSaveTheme()),
            Effect.catch(error =>
              Effect.succeed(
                Settings.Message.FailedSaveTheme({ reason: error.message }),
              ),
            ),
          ),
      },

      view: (model, h) =>
        h.div(
          [],
          [
            h.p([], [`Theme: ${model.theme}`]),
            h.button(
              [h.OnClick(Settings.Message.ClickedTheme({ theme: 'Dark' }))],
              ['Use dark theme'],
            ),
            ...Option.toArray(
              Option.map(model.maybeSaveError, reason =>
                h.p([h.Role('alert')], [`Could not save: ${reason}`]),
              ),
            ),
          ],
        ),
    }
  }),
)
