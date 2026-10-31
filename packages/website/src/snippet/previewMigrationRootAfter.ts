import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Settings, SettingsLive, Theme } from './previewMigrationCommandAfter'

export const Flags = Schema.Struct({ savedTheme: Theme })
export type Flags = typeof Flags.Type

const Message = defineMessageUnion({
  ClickedResetSettings: {},
})

// The root's args say what the Program must supply: `{ flags }` here.
export class Application extends Block<
  Application,
  Readonly<{ flags: Flags }>
>()('Application', {
  Model: Schema.Struct({ settings: Settings, previewTheme: Theme }),
  Message,
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { flags }) {
    const settings = yield* new Settings('settings')

    return {
      model: { settings, previewTheme: flags.savedTheme },

      update: {
        ClickedResetSettings: model => ({
          model,
          messages: [model.settings.send(Settings.Message.RequestedReset())],
        }),
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
