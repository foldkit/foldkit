import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Model = Schema.Struct({ id: Schema.String, theme: Schema.String })
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  InformedOfThemeChange: { theme: Schema.String },
})

const FunctionReferenceChildDefinition = Block.makeDefinition(
  'FunctionReferenceChild',
  { Model, Message },
)
const FunctionReferenceChildComposition =
  FunctionReferenceChildDefinition.makeComposition()
const init = FunctionReferenceChildComposition.makeInit((id: string) => ({
  model: Model.make({ id, theme: 'System' }),
}))
const update = FunctionReferenceChildComposition.makeUpdate({
  InformedOfThemeChange: (model, { theme }) => ({
    model: modifyFields(model, { theme: () => theme }),
  }),
})

export const revealErrors = (model: Model): Model =>
  modifyFields(model, { theme: () => 'Error' })

export const block = FunctionReferenceChildComposition.prepareBlock({
  init,
  update,
  operations: {
    informThemeChanged: Message.InformedOfThemeChange,
  },
  EffectsLayer: Layer.empty,
})
