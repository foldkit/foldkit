import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const OutMessage = defineMessageUnion({ Removed: {} })

const EntryDefinition = Block.makeDefinition('Entry', {
  Model: Schema.Struct({ id: Schema.String }),
  Message: Schema.Never,
  OutMessage,
})

const { makeOutMessageStep } = EntryDefinition

export const reportRemovedStep = makeOutMessageStep(() => OutMessage.Removed())
