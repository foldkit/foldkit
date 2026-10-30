import { Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import * as Child from './child'

type SettingsModel = Readonly<{ theme: string }>
type Model = Readonly<{
  settings: SettingsModel
  child: Child.Model
  keyedSettings: SettingsModel
  preferences: SettingsModel
}>

const readSettings = (model: Model) => Option.some(model.settings)

const writeSettings = (model: Model, nextSettings: SettingsModel): Model =>
  modifyFields(model, { settings: () => nextSettings })

const foldSettings = Update.foldChild({
  update: (settings: SettingsModel, _message: unknown) => ({ model: settings }),
  read: readSettings,
  write: writeSettings,
  toParentMessage: message => message,
})

const foldSettingsWithoutMessage = Update.foldChildStep({
  update: (settings: SettingsModel) => ({ model: settings }),
  read: readSettings,
  write: writeSettings,
  toParentMessage: message => message,
})

const foldKeyedSettings = Update.foldChildAt({
  update: (settings: SettingsModel, _message: unknown) => ({ model: settings }),
  readAt: (model: Model, _key: string) => Option.some(model.keyedSettings),
  writeAt: (model, _key, nextSettings) =>
    modifyFields(model, { keyedSettings: () => nextSettings }),
  toParentMessage: (_key, message) => message,
})

const foldChild = Update.foldChild({
  update: Child.update,
  read: (model: Model) => Option.some(model.child),
  write: (model, nextChild) =>
    modifyFields(model, { child: () => nextChild }),
  toParentMessage: message => message,
})

const Settings = {
  reflectTheme: (theme: string) => (settings: SettingsModel) =>
    modifyFields(settings, { theme: () => theme }),
}

export const update = (model: Model, message: unknown) => {
  const settingsUpdate = Update.combineSteps(model, [
    stepModel => {
      const foldSettingsUpdate = Update.combineSteps([foldSettings(message)])(
        stepModel,
      )

      return {
        ...foldSettingsUpdate,
        model: modifyFields(stepModel, {
          settings: settings => modifyFields(settings, { theme: () => 'Light' }),
        }),
      }
    },
  ])

  return {
    model: modifyFields(model, {
      preferences: preferences => modifyFields(preferences, { theme: () => 'Light' }),
    }),
    commands: settingsUpdate.commands,
  }
}

export const updateNamed = (model: Model, message: unknown) => {
  const foldSettingsMessage = Update.combineSteps([foldSettings(message)])
  const settingsUpdate = foldSettingsMessage(model)

  return {
    model: modifyFields(model, {
      settings: settings => modifyFields(settings, { theme: () => 'Light' }),
    }),
    commands: settingsUpdate.commands,
  }
}

export const updateFoldChild = (model: Model) => {
  const settingsUpdate = foldSettingsWithoutMessage(model)

  return {
    model: modifyFields(model, {
      settings: settings => modifyFields(settings, { theme: () => 'Light' }),
    }),
    commands: settingsUpdate.commands,
  }
}

export const updateCombineFoldChild = (model: Model) => {
  const settingsUpdate = Update.combineSteps(model, [
    foldSettingsWithoutMessage,
    stepModel => ({ model: stepModel }),
  ])

  return {
    model: modifyFields(model, {
      settings: settings => modifyFields(settings, { theme: () => 'Light' }),
    }),
    commands: settingsUpdate.commands,
  }
}

export const updateConditionally = (model: Model, message: unknown) => {
  const settingsUpdate = foldSettings(model, message)

  return {
    model: modifyFields(model, {
      settings: settings => {
        if (settings.theme === 'Dark') {
          return modifyFields(settings, { theme: () => 'Light' })
        }
        return settings
      },
    }),
    commands: settingsUpdate.commands,
  }
}

export const updateKeyedSettings = (
  model: Model,
  key: string,
  message: unknown,
) => {
  const keyedSettingsUpdate = foldKeyedSettings(model, key, message)

  return {
    model: modifyFields(model, {
      keyedSettings: keyedSettings =>
        modifyFields(keyedSettings, { theme: () => 'Light' }),
    }),
    commands: keyedSettingsUpdate.commands,
  }
}

export const reflectSettings = (model: Model, message: unknown) => {
  const settingsUpdate = foldSettings(model, message)

  return {
    model: modifyFields(model, {
      settings: Settings.reflectTheme('Light'),
    }),
    commands: settingsUpdate.commands,
  }
}

export const copyChildUpdateModel = (
  model: Model,
  message: Child.Message,
) => {
  const childFold = foldChild(model, message)
  const childUpdate = Child.update(model.child, message)

  return {
    model: modifyFields(model, { child: () => childUpdate.model }),
    commands: childFold.commands,
  }
}

export const copyChildOperationModel = (
  model: Model,
  message: Child.Message,
) => {
  const childFold = foldChild(model, message)
  const childClose = Child.close(model.child)

  return {
    model: modifyFields(model, { child: () => childClose.model }),
    commands: childFold.commands,
  }
}

export const folds = { foldChild }
