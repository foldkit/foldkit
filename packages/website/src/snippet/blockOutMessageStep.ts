import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const OutMessage = defineMessageUnion({ Removed: {} })
type OutMessage = typeof OutMessage.Type

export const EntryKey = Symbol('Entry')
const EntryBlock = Block.make('Entry', {
  key: EntryKey,
  InitArgs: Schema.Tuple([]),
  isMessageFree: true,

  Model: Schema.Struct({ id: Schema.String }),
  Message: Schema.Never,
  OutMessage,
})

const { makeOutMessageStep } = EntryBlock

export const reportRemoved = makeOutMessageStep(() => OutMessage.Removed())
