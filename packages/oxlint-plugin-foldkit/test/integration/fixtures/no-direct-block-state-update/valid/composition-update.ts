import { Schema } from 'effect'
import { defineApplication } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as BoundSettings from './boundSettings'

const Model = Schema.Struct({ settings: BoundSettings.Model })
const Message = defineMessageUnion({
  ChangedTheme: {},
  GotSettingsMessage: { message: BoundSettings.Message },
})
const Application = defineApplication({ Model, Message })
const SettingsBinding = Application.bindChild(BoundSettings.Settings, {
  field: 'settings',
  parentMessage: Message.GotSettingsMessage,
  init: true,
})
Application.makeComposition({ childBindings: [SettingsBinding] })
const ApplicationComposition = Application.makeComposition()

export const update = ApplicationComposition.makeUpdate(model => ({
  model: modifyFields(model, {
    settings: settings =>
      modifyFields(settings, { theme: () => 'Light' }),
  }),
}))
