import { defineApplication } from 'foldkit'
import { Option, Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import * as BoundSettings from './boundSettings'

const Model = Schema.Struct({ settings: BoundSettings.Model })
type Model = typeof Model.Type
const Message = defineMessageUnion({ GotSettingsMessage: { message: BoundSettings.Message } })
const Application = defineApplication({ Model, Message })
const SettingsBinding = Application.bindChild(BoundSettings.Settings, {read: (model: Model) => Option.some(model.settings),
write: (model, nextSettings) => modifyFields(model, { settings: () => nextSettings }),
parentMessage: Message.GotSettingsMessage,
fromParentMessage: false})
const ApplicationComposition = Application.makeComposition({ childBindings: [SettingsBinding] })
export const updateBinding = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    GotSettingsMessage: ({ message }) => {
      const nextModel = modifyFields(model, {
        settings: currentSettings => modifyFields(currentSettings, { theme: () => 'Light' }),
      })
      void nextModel

      return SettingsBinding.fold(model, message)
    },
  }),
)
