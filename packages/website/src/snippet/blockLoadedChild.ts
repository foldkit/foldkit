import { Context, Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Settings, Theme } from './blockSettingsContract'

export class SavedTheme extends Context.Service<
  SavedTheme,
  Readonly<{ load: Effect.Effect<Theme, Error> }>
>()('SavedTheme') {}

const Message = defineMessageUnion({
  SucceededLoadSavedTheme: { theme: Theme },
  FailedLoadSavedTheme: { reason: Schema.String },
})

const LoadSavedTheme = Command.define('LoadSavedTheme', {
  messages: [Message.SucceededLoadSavedTheme, Message.FailedLoadSavedTheme],
})

const SettingsState = defineTaggedUnion({
  Loading: {},
  Failed: { reason: Schema.String },
  Loaded: { settings: Settings },
})

export class SettingsPage extends Block<SettingsPage>()('SettingsPage', {
  Model: Schema.Struct({ settingsState: SettingsState }),
  Message,
  Command: [LoadSavedTheme],
}) {}

export const SettingsPageLive = SettingsPage.toLayer(
  Effect.gen(function* () {
    const savedTheme = yield* SavedTheme

    return {
      init: () => ({ settingsState: SettingsState.Loading() }),

      start: () => [LoadSavedTheme()],

      update: {
        SucceededLoadSavedTheme: (model, { theme }) => ({
          model: modifyFields(model, {
            settingsState: () =>
              SettingsState.Loaded({
                settings: new Settings('settings', { initialTheme: theme }),
              }),
          }),
        }),
        FailedLoadSavedTheme: (model, { reason }) => ({
          model: modifyFields(model, {
            settingsState: () => SettingsState.Failed({ reason }),
          }),
        }),
      },

      commands: {
        LoadSavedTheme: () =>
          savedTheme.load.pipe(
            Effect.map(theme =>
              SettingsPage.Message.SucceededLoadSavedTheme({ theme }),
            ),
            Effect.catch(error =>
              Effect.succeed(
                SettingsPage.Message.FailedLoadSavedTheme({
                  reason: error.message,
                }),
              ),
            ),
          ),
      },

      view: (model, h) =>
        SettingsState.match(model.settingsState, {
          Loading: () => h.p([], ['Loading your settings…']),
          Failed: ({ reason }) =>
            h.p([h.Role('alert')], [`Could not load settings: ${reason}`]),
          Loaded: ({ settings }) => settings.view(),
        }),
    }
  }),
)
