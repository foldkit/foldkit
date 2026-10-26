import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Model = Schema.Struct({ id: Schema.String, theme: Schema.String })
export const Message = defineMessageUnion({
  InformedOfThemeChange: { theme: Schema.String },
})
const NoDirectStateKeyedEntryDefinition = Block.makeDefinition(
  'NoDirectStateKeyedEntry',
  { Model, Message },
)
const KeyedEntryComposition =
  NoDirectStateKeyedEntryDefinition.makeComposition()
const init = KeyedEntryComposition.makeInit(() => ({
  model: Model.make({ id: 'initial', theme: 'System' }),
}))
const update = KeyedEntryComposition.makeUpdate({
  InformedOfThemeChange: (model, { theme }) => ({
    model: modifyFields(model, { theme: () => theme }),
  }),
})
const prepare = () =>
  KeyedEntryComposition.prepareBlock({
  init,
  update,
  operations: {
    informThemeChanged: Message.InformedOfThemeChange,
  },
  EffectsLayer: Layer.empty,
})
export const KeyedEntryBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
