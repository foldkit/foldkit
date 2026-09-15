import { Option } from 'effect'
import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'

type SettingsModel = Readonly<{ theme: string }>
type Model = Readonly<{ settings: SettingsModel; preferences: SettingsModel }>

const readSettings = (model: Model) => Option.some(model.settings)

const writeSettings = (model: Model, nextSettings: SettingsModel): Model =>
  evo(model, { settings: () => nextSettings })

const foldSettings = Update.foldChild({
  update: (settings: SettingsModel, _message: unknown) => ({ model: settings }),
  read: readSettings,
  write: writeSettings,
  toParentMessage: message => message,
})

export const update = (model: Model, message: unknown) => {
  const settingsUpdate = Update.combine(model, [
    stepModel => {
      const foldSettingsUpdate = Update.combine([foldSettings(message)])(
        stepModel,
      )

      return {
        model: evo(stepModel, {
          settings: settings => evo(settings, { theme: () => 'Light' }),
        }),
        commands: foldSettingsUpdate.commands,
      }
    },
  ])

  return {
    model: evo(model, {
      preferences: preferences => evo(preferences, { theme: () => 'Light' }),
    }),
    commands: settingsUpdate.commands,
  }
}

export const updateNamedStep = (model: Model, message: unknown) => {
  const foldSettingsStep = Update.combine([foldSettings(message)])
  const settingsUpdate = foldSettingsStep(model)

  return {
    model: evo(model, {
      settings: settings => evo(settings, { theme: () => 'Light' }),
    }),
    commands: settingsUpdate.commands,
  }
}
