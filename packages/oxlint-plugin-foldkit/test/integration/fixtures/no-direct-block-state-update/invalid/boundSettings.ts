import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Model = Schema.Struct({ theme: Schema.String })
export const Message = defineMessageUnion({
  InformedOfThemeChange: { theme: Schema.String },
})
const BoundSettingsDefinition = Block.makeDefinition('BoundSettings', {
  Model,
  Message,
})
const BoundSettingsComposition = BoundSettingsDefinition.makeComposition()
const init = BoundSettingsComposition.makeInit(() => ({
  model: Model.make({ theme: 'System' }),
}))
const update = BoundSettingsComposition.makeUpdate({
  InformedOfThemeChange: (model, { theme }) => ({
    model: modifyFields(model, { theme: () => theme }),
  }),
})
export const Settings = BoundSettingsComposition.prepareBlock({
  init,
  update,
  operations: {
    informThemeChanged: Message.InformedOfThemeChange,
  },
  EffectsLayer: Layer.empty,
})
