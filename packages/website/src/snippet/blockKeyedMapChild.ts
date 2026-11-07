import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({ title: Schema.String })
type Model = typeof Model.Type

const InMessage = defineInMessageUnion({
  RequestedRename: { title: Schema.String },
})
type InMessage = typeof InMessage.Type

export const EntryKey = Symbol('Entry')
export const EntryBlock = Block.make('Entry', {
  key: EntryKey,
  InitArgs: Schema.Tuple([Schema.String]),
  InMessage,
  isMessageFree: true,

  Model,
  Message: Schema.Never,
})

const { makeComposition } = EntryBlock

const EntryComposition = makeComposition()

export const layer = EntryBlock.makeLayer({
  init: EntryComposition.makeInit((title: string) => ({
    model: { title },
  })),
  update: EntryComposition.makeUpdate({}),
  inMessageUpdate: EntryComposition.makeInMessageUpdate({
    RequestedRename: (model, { title }) => ({
      model: modifyFields(model, { title: () => title }),
    }),
  }),
})
