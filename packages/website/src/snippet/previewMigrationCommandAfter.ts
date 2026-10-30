import { Context, Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Theme = Schema.Literals(['Light', 'Dark', 'System'])
export type Theme = typeof Theme.Type

export class SettingsStore extends Context.Service<
  SettingsStore,
  Readonly<{
    saveTheme: (theme: Theme) => Effect.Effect<void, Error>
  }>
>()('SettingsStore') {}

const Message = defineMessageUnion({
  ClickedTheme: { theme: Theme },
  RequestedReset: {},
  CompletedSaveTheme: {},
  FailedSaveTheme: {},
})

const OutMessage = defineMessageUnion({
  ChangedTheme: { theme: Theme },
})

// The Command declares its args and result Messages. It has no handler here.
export const SaveTheme = Command.define('SaveTheme', {
  args: { theme: Theme },
  messages: [Message.CompletedSaveTheme, Message.FailedSaveTheme],
})

export class Settings extends Block<Settings>()('Settings', {
  Model: Schema.Struct({ theme: Theme }),
  Message,
  OutMessage,
  Command: [SaveTheme],
}) {}

type Model = typeof Settings.Model.Type

const changeThemeStep = (model: Model, theme: Theme) => ({
  model: modifyFields(model, { theme: () => theme }),
  commands: [SaveTheme({ theme })],
  outMessage: OutMessage.ChangedTheme({ theme }),
})

export const SettingsLive = Settings.make(
  Effect.fn(function* () {
    // Services are yielded once per instance and closed over by the handler.
    const settingsStore = yield* SettingsStore

    return {
      model: { theme: 'System' },

      update: {
        ClickedTheme: (model, { theme }) => changeThemeStep(model, theme),
        RequestedReset: model => changeThemeStep(model, 'System'),
        CompletedSaveTheme: model => ({ model }),
        FailedSaveTheme: model => ({ model }),
      },

      commands: {
        SaveTheme: ({ theme }) =>
          settingsStore.saveTheme(theme).pipe(
            Effect.as(Message.CompletedSaveTheme()),
            Effect.catch(() => Effect.succeed(Message.FailedSaveTheme())),
          ),
      },

      view: (model, h) =>
        h.div(
          [],
          [
            h.p([], [`Theme: ${model.theme}`]),
            h.button(
              [h.OnClick(Message.ClickedTheme({ theme: 'Dark' }))],
              ['Use dark theme'],
            ),
          ],
        ),
    }
  }),
)
