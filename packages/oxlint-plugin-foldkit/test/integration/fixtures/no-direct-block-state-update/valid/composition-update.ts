import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as BoundSettings from './boundSettings'

const Model = Schema.Struct({ settings: BoundSettings.Model })
const Message = defineMessageUnion({
  ClickedChangeTheme: {},
})
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const SettingsBinding = ApplicationDefinition.makeBinding(
  BoundSettings.BoundSettingsBlock,
  {
    field: 'settings',
    init: true,
  },
)
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [SettingsBinding],
})

export const recordUpdate = ApplicationComposition.makeUpdate({
  ClickedChangeTheme: SettingsBinding.informThemeChanged({ theme: 'Light' }),
})

export const contextualRecordUpdate =
  ApplicationComposition.makeUpdate.withContext((theme: string) => ({
    ClickedChangeTheme: model =>
      SettingsBinding.informThemeChanged({ theme })(model),
  }))

const OtherMessage = defineMessageUnion({ ChangedTheme: {} })
const OtherApplication = Block.makeDefinition('OtherApplication', {
  Model,
  Message: OtherMessage,
})
const OtherApplicationComposition = OtherApplication.makeComposition()

export const update = OtherApplicationComposition.makeUpdate({
  ChangedTheme: model => ({
    model: modifyFields(model, {
      settings: settings =>
        modifyFields(settings, { theme: () => 'Light' }),
    }),
  }),
})

const unrelated = {
  makeUpdate: Object.assign(
    <Update>(update: Update): Update => update,
    {
      withContext: <CreateCases>(createCases: CreateCases): CreateCases =>
        createCases,
    },
  ),
}

unrelated.makeUpdate({
  ChangedTheme: (model: typeof Model.Type) => ({
    model: modifyFields(model, {
      settings: settings =>
        modifyFields(settings, { theme: () => 'Light' }),
    }),
  }),
})

unrelated.makeUpdate.withContext((_context: string) => ({
  ChangedTheme: (model: typeof Model.Type) => ({
    model: modifyFields(model, {
      settings: settings =>
        modifyFields(settings, { theme: () => 'Light' }),
    }),
  }),
}))
