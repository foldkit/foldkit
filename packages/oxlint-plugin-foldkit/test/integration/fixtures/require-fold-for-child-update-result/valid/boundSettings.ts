import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Model = Schema.Struct({ theme: Schema.String })
export type Model = typeof Model.Type
export const Message = defineMessageUnion({ ChangedTheme: { theme: Schema.String } })
export type Message = typeof Message.Type
const BoundSettings = Block.define('BoundSettings', { Model, Message })
export const setTheme = BoundSettings.step((model, theme: string) => ({
  model: modifyFields(model, { theme: () => theme }),
}))
const BoundSettingsComposition = BoundSettings.makeComposition()
const init = BoundSettingsComposition.makeInit(() => ({
  model: Model.make({ theme: 'System' }),
}))
const update = BoundSettingsComposition.makeUpdate((model, message) =>
  Message.match(message, { ChangedTheme: ({ theme }) => setTheme(model, theme) }),
)
export const Settings = BoundSettingsComposition.makeBlock({
  init,
  update,
  expose: { setTheme },
  EffectsLayer: Layer.empty,
})
