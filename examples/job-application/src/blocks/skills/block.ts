import { Schema } from 'effect'
import { SecureRandom } from 'effect/crypto'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

import { SkillsEntry as Entry } from './blocks'

export const Model = Schema.Struct({
  entries: Schema.Array(Entry.SkillsEntryBlock.Model),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedAddEntry: {},
  CompletedGenerateSkillsEntryId: { entryId: Schema.String },
  RemovedEntry: { entryId: Schema.String },
})
export type Message = typeof Message.Type

export const InMessage = defineInMessageUnion({
  RequestedRevealErrors: {},
})
export type InMessage = typeof InMessage.Type

export const SkillsKey = Symbol('Skills')
export const SkillsBlock = Block.make('Skills', {
  key: SkillsKey,
  InitArgs: Schema.Tuple([Schema.String]),
  view: { kind: 'Element' },
  effects: { services: [SecureRandom.SecureRandom] },
  Model,
  Message,
  InMessage,
  ChildInitContext: Schema.String,
})

export const {
  makeKeyedArrayBinding,
  makeCommand,
  makeCommandsStep,
  makeComposition,
  makeFieldsStep,
  makeOutMessageFold,
} = SkillsBlock
