import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const OutMessage = defineMessageUnion({ Removed: {} })
type OutMessage = typeof OutMessage.Type

const EntryKey = Symbol('Entry')

const EntryDefinition = Block.makeDefinition('Entry', {
  key: EntryKey,
  Init: Schema.Tuple([]),
  isMessageFree: true,

  Model: Schema.Struct({ id: Schema.String }),
  Message: Schema.Never,
  OutMessage,
})

const { makeOutMessageStep } = EntryDefinition

export const reportRemoved = makeOutMessageStep(() => OutMessage.Removed())
