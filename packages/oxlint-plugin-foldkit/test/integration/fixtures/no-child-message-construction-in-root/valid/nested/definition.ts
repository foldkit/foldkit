import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ value: Schema.String })
export const Message = defineMessageUnion({ ClickedSave: {} })
export const NestedDefinition = Block.makeDefinition('Nested', {
  Model,
  Message,
})

export const { makeMapBinding } = NestedDefinition
