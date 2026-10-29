import { Schema } from 'effect'
import { Block } from 'foldkit'

export const ParentDefinition = Block.makeDefinition('MapPolicyParent', {
  Model: Schema.Struct({}),
  Message: Schema.Never,
})
export const { makeMapBinding } = ParentDefinition
