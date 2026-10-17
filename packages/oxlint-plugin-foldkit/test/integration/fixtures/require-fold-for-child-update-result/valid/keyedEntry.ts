import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Model = Schema.Struct({ id: Schema.String, theme: Schema.String })
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  ChangedTheme: { theme: Schema.String },
})
export type Message = typeof Message.Type
const KeyedEntry = Block.define('RequireFoldKeyedEntry', { Model, Message })
export const setTheme = KeyedEntry.step((model, theme: string) => ({
  model: modifyFields(model, { theme: () => theme }),
}))
const KeyedEntryComposition = KeyedEntry.makeComposition()
const init = KeyedEntryComposition.makeInit(() => ({
  model: Model.make({ id: 'initial', theme: 'System' }),
}))
const update = KeyedEntryComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ChangedTheme: ({ theme }) => setTheme(model, theme),
  }),
)
export const Entry = KeyedEntryComposition.makeBlock({
  init,
  update,
  expose: { setTheme },
  EffectsLayer: Layer.empty,
})
