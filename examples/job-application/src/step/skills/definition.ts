import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import * as Entry from './entry'

export const Model = Schema.Struct({
  entries: Schema.Array(Entry.SkillsEntryBlock.Model),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedAddEntry: {},
  SucceededGenerateSkillsEntryId: { entryId: Schema.String },
  FailedGenerateSkillsEntryId: {},
  RemovedEntry: { entryId: Schema.String },
  RequestedRevealErrors: {},
})
export type Message = typeof Message.Type

export const SkillsDefinition = Block.makeDefinition('Skills', {
  Model,
  Message,
  ChildInitContext: Schema.String,
})

export const { makeFieldsStep, makeCommandsStep, makeNoopStep } =
  SkillsDefinition
