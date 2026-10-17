import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ child: Schema.Unknown })
export const Message = defineMessageUnion({ ClickedSave: {} })

export const Parent = Block.define('Parent', { Model, Message })
