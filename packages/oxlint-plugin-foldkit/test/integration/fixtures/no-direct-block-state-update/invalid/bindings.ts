import { Block } from 'foldkit'
import { Option, Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import * as BoundSettings from './boundSettings'

const Model = Schema.Struct({ settings: BoundSettings.Model })
type Model = typeof Model.Type
const Message = defineMessageUnion({ GotSettingsMessage: { message: BoundSettings.Message } })
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const SettingsBinding = ApplicationDefinition.makeBinding(BoundSettings.Settings, {read: (model: Model) => Option.some(model.settings),
write: (model, nextSettings) => modifyFields(model, { settings: () => nextSettings }),
parentMessage: Message.GotSettingsMessage,
fromParentMessage: false})
const ApplicationComposition = ApplicationDefinition.makeComposition({ bindings: [SettingsBinding] })
export const updateBinding = ApplicationComposition.makeUpdate({
  GotSettingsMessage: (model, { message }) => {
    const nextModel = modifyFields(model, {
      settings: currentSettings =>
        modifyFields(currentSettings, { theme: () => 'Light' }),
    })
    void nextModel

    return SettingsBinding.fold(model, message)
  },
})
