import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ child: Schema.Unknown })
export const Message = defineMessageUnion({ ClickedSave: {} })

export const ParentDefinition = Block.makeDefinition('Parent', {
  Model,
  Message,
})

export const { makeMapBinding } = ParentDefinition
