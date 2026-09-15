import { Option } from 'effect'
import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'

type SettingsModel = Readonly<{ theme: string }>
type ParentModel = Readonly<{ settings: SettingsModel }>
type OtherModel = Readonly<{ settings: SettingsModel }>

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

export const updateParent = (model: ParentModel, message: unknown) =>
  foldSettings(model, message)

export const updateOther = (model: OtherModel) => ({
  model: evo(model, {
    settings: settings => evo(settings, { theme: () => 'Light' }),
  }),
})
