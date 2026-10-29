import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({ title: Schema.String })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  RequestedRename: { title: Schema.String },
})
type Message = typeof Message.Type

const EntryComposition = Block.makeDefinition('Entry', {
  Model,
  Message,
}).makeComposition()
const prepare = () =>
  EntryComposition.prepareBlock({
    init: EntryComposition.makeInit((title: string) => ({ model: { title } })),
    update: EntryComposition.makeUpdate({
      RequestedRename: (model, { title }) => ({
        model: modifyFields(model, { title: () => title }),
      }),
    }),
    operations: { requestRename: Message.RequestedRename },
  })
export const EntryBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
