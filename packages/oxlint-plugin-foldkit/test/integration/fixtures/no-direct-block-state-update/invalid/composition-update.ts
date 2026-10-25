import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as BoundSettings from './boundSettings'

const Model = Schema.Struct({ settings: BoundSettings.Model })
const Message = defineMessageUnion({
  ChangedTheme: {},
  GotSettingsMessage: { message: BoundSettings.Message },
})
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const SettingsBinding = ApplicationDefinition.makeBinding(BoundSettings.Settings, {
  field: 'settings',
  parentMessage: Message.GotSettingsMessage,
  init: true,
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [SettingsBinding],
})

export const update = ApplicationComposition.makeUpdate({
  ChangedTheme: model => {
    const settingsChange = BoundSettings.setTheme(model.settings, 'Light')

    return {
      model: modifyFields(model, {
        settings: () => settingsChange.model,
      }),
    }
  },
})

export const updateDirectly = ApplicationComposition.makeUpdate({
  ChangedTheme: model => ({
    model: modifyFields(model, {
      settings: settings =>
        modifyFields(settings, { theme: () => 'Light' }),
    }),
  }),
})

const recordCases = {
  ChangedTheme: (model: typeof Model.Type) => ({
    model: modifyFields(model, {
      settings: settings =>
        modifyFields(settings, { theme: () => 'Light' }),
    }),
  }),
}

export const recordUpdate = ApplicationComposition.makeUpdate(recordCases)

const makeRecordCases = (theme: string) => ({
  ChangedTheme: (model: typeof Model.Type) => ({
    model: modifyFields(model, {
      settings: settings =>
        modifyFields(settings, { theme: () => theme }),
    }),
  }),
})

export const contextualRecordUpdate =
  ApplicationComposition.makeUpdate.withContext(makeRecordCases)
