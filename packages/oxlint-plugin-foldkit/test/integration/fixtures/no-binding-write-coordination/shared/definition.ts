import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const ChildModel = Schema.Struct({ label: Schema.String })
const Message = defineMessageUnion({ InformedOfLabel: { label: Schema.String } })
const ChildComposition = Block.makeDefinition('WriterChild', { Model: ChildModel, Message }).makeComposition()
const init = ChildComposition.makeInit(() => ({ model: { label: '' } }))
const update = ChildComposition.makeUpdate({
  InformedOfLabel: (model, { label }) => ({
    model: modifyFields(model, { label: () => label }),
  }),
})
const prepare = () => ChildComposition.prepareBlock({ init, update })
export const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepare
> = Block.assemble(prepare)

export const ParentDefinition = Block.makeDefinition('WriterParent', {
  Model: Schema.Struct({ child: ChildModel, announcement: Schema.String }),
  Message: Schema.Never,
})
