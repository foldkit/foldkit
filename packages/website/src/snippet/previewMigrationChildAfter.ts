import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Settings, SettingsLive, Theme } from './previewMigrationCommandAfter'

const Message = defineMessageUnion({
  ClickedResetSettings: {},
})

export class Application extends Block<Application>()('Application', {
  // The child class is the field's Schema.
  Model: Schema.Struct({ settings: Settings, previewTheme: Theme }),
  Message,
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const settings = yield* new Settings('settings')

    return {
      model: { settings, previewTheme: 'System' },

      update: {
        // The parent changes the child by sending it a Message.
        ClickedResetSettings: model => ({
          model,
          messages: [model.settings.send(Settings.Message.RequestedReset())],
        }),
        // The parent learns about the child through its OutMessages.
        ...settings.on({
          ChangedTheme: (model, { theme }) => ({
            model: modifyFields(model, { previewTheme: () => theme }),
          }),
        }),
      },

      view: (model, h) => ({
        title: `Theme: ${model.previewTheme}`,
        body: h.main(
          [],
          [
            model.settings.view(),
            h.button(
              [h.OnClick(Message.ClickedResetSettings())],
              ['Reset settings'],
            ),
          ],
        ),
      }),
    }
  }),
).pipe(Layer.provide(SettingsLive))
