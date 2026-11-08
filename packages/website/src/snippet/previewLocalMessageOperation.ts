import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ name: Schema.String })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  RequestedRename: { name: Schema.String },
})
type Message = typeof Message.Type

const ProfileKey = Symbol('Profile')
export const ProfileBlock = Block.make('Profile', {
  key: ProfileKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: false,
  operations: {
    rename: Message.RequestedRename,
  },
})

const { makeComposition, makeFieldsStep } = ProfileBlock
const ProfileComposition = makeComposition()

export const layer = ProfileBlock.makeLayer({
  init: ProfileComposition.makeInit(() => ({
    model: Model.make({ name: '' }),
  })),
  update: ProfileComposition.makeUpdate({
    RequestedRename: makeFieldsStep.fromMessage(({ name }) => ({
      name: () => name,
    })),
  }),
})
