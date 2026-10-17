import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import * as Entry from './entry/definition'

export const Model = Schema.Struct({
  entries: Schema.Array(Entry.Model),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedAddEntry: {},
  SucceededGenerateSkillsEntryId: { entryId: Schema.String },
  FailedGenerateSkillsEntryId: {},
  RemovedEntry: { entryId: Schema.String },
  GotEntryMessage: {
    entryId: Schema.String,
    message: Entry.Message,
  },
})

export type Message = typeof Message.Type

export const Skills = Block.define('Skills', {
  Model,
  Message,
  Startup: Schema.String,
})
