import { defineApplication } from 'foldkit'
import { Option, Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as BoundSettings from './boundSettings'
import * as DirectBoundSettings from './boundSettings'
import * as KeyedBoundSettings from './boundSettings'

const Model = Schema.Struct({
  settings: BoundSettings.Model,
  directSettings: DirectBoundSettings.Model,
  keyedSettings: KeyedBoundSettings.Model,
})
type Model = typeof Model.Type
const Message = defineMessageUnion({
  GotSettingsMessage: { message: BoundSettings.Message },
})
const Application = defineApplication({ Model, Message })
export const SettingsBinding = Application.bindChild(BoundSettings.Settings, {read: (model: Model) => Option.some(model.settings),
write: (model, nextSettings) =>
    modifyFields(model, { settings: () => nextSettings }),
parentMessage: Message.GotSettingsMessage,
fromParentMessage: {
  parentMessage: Message.GotSettingsMessage,
  args: (_model, { message }) => Option.some([message]),
}})
export const DirectSettingsBinding = Application.bindChild(DirectBoundSettings.Settings, {field: 'directSettings',
parentMessage: Message.GotSettingsMessage})
export const KeyedSettingsBinding = Application.bindChild(KeyedBoundSettings.Settings, {readAll: (model: Model) => [model.keyedSettings],
key: () => 'settings',
read: settings => settings,
writeAt: (model, _key, nextSettings) =>
    modifyFields(model, { keyedSettings: () => nextSettings }),
toParentMessage: (_key, message) => Message.GotSettingsMessage({ message }),
fromParentMessage: {
  parentMessage: Message.GotSettingsMessage,
  args: (_model, { message }) => Option.some(['settings', message]),
}})
export const updateBinding = (model: Model) => {
  const settingsTheme = BoundSettings.setTheme(model.settings, 'Light')
  return { model: modifyFields(model, { settings: () => settingsTheme.model }) }
}
export const updateDirectBinding = (model: Model) => {
  const settingsTheme = DirectBoundSettings.setTheme(
    model.directSettings,
    'Light',
  )
  return {
    model: modifyFields(model, { directSettings: () => settingsTheme.model }),
  }
}
export const updateKeyedBinding = (model: Model) => {
  const settingsTheme = KeyedBoundSettings.setTheme(
    model.keyedSettings,
    'Light',
  )
  return {
    model: modifyFields(model, { keyedSettings: () => settingsTheme.model }),
  }
}
