import { Schema } from 'effect'
import { Block } from 'foldkit'

export const ParentDefinition = Block.makeDefinition('MapRoutingParent', {
  Model: Schema.Struct({}),
  Message: Schema.Never,
})
export const { makeMapBinding } = ParentDefinition
