import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const ApplicationKey = Symbol('UnifiedClock')
export const ApplicationBlock = Block.make('UnifiedClock', {
  key: ApplicationKey,
  Model: Schema.Struct({ stamp: Schema.Number }),
  Message: defineMessageUnion({ UpdatedStamp: { value: Schema.Number } }),
  InitArgs: Schema.Tuple([]),
})
export const { makeFieldsStep, makeCommand, makeMount, makeMountStream, makeSubscriptions, makeManagedResources } = ApplicationBlock
export const ApplicationComposition = ApplicationBlock.makeComposition()
