import { Option } from 'effect'
import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'

type SettingsModel = Readonly<{ theme: string }>
type ParentModel = Readonly<{ settings: SettingsModel }>
type OtherModel = Readonly<{ settings: SettingsModel }>
type OuterModel = Readonly<{ settings: SettingsModel; other: OtherModel }>

const readSettings = (model: ParentModel) => Option.some(model.settings)

const writeSettings = (
  model: ParentModel,
  nextSettings: SettingsModel,
): ParentModel => evo(model, { settings: () => nextSettings })

const foldSettings = Update.foldChild({
  update: (settings: SettingsModel, _message: unknown) => ({ model: settings }),
  read: readSettings,
  write: writeSettings,
  toParentMessage: message => message,
})

const readOtherSettings = (model: OtherModel) => Option.some(model.settings)

const writeOtherSettings = (
  model: OtherModel,
  nextSettings: SettingsModel,
): OtherModel => evo(model, { settings: () => nextSettings })

const foldOtherSettings = Update.foldChild({
  update: (settings: SettingsModel, _message: unknown) => ({ model: settings }),
  read: readOtherSettings,
  write: writeOtherSettings,
  toParentMessage: message => message,
})

export const updateParent = (model: ParentModel, message: unknown) =>
  foldSettings(model, message)

export const updateOther = (model: OtherModel) => ({
  model: evo(model, {
    settings: settings => evo(settings, { theme: () => 'Light' }),
  }),
})

export const updateParentWithOtherFold = (
  model: OuterModel,
  message: unknown,
) => {
  const update = Update.combine(model, [
    stepModel => {
      const otherUpdate = foldOtherSettings(message)(stepModel.other)

      return { model: stepModel, commands: otherUpdate.commands }
    },
    stepModel => ({ model: stepModel }),
  ])

  return {
    model: evo(model, {
      settings: settings => evo(settings, { theme: () => 'Light' }),
    }),
    commands: update.commands,
  }
}
