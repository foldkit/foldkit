import { Schema } from 'effect'
import { Block } from 'foldkit'
import { Field } from 'foldkit/fieldValidation'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

import { RadioGroup } from '@foldkit/ui'

import { ProficiencyLevel } from '../../../../domain'

export const ProficiencyRadioGroup =
  RadioGroup.makeBlock<ProficiencyLevel.ProficiencyLevel>()

export const Model = Schema.Struct({
  id: Schema.String,
  name: Field(Schema.String),
  proficiency: ProficiencyLevel.ProficiencyLevel,
  proficiencyRadioGroup: ProficiencyRadioGroup.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedName: { value: Schema.String },
  ClickedRemoveSelf: {},
})
export type Message = typeof Message.Type

export const InMessage = defineInMessageUnion({
  RequestedRevealErrors: {},
})
export type InMessage = typeof InMessage.Type

export const OutMessage = defineMessageUnion({
  Removed: {},
})
export type OutMessage = typeof OutMessage.Type

export const SkillsEntryKey = Symbol('SkillsEntry')
export const SkillsEntryBlock = Block.make('SkillsEntry', {
  key: SkillsEntryKey,
  InitArgs: Schema.Tuple([Schema.String]),
  view: { kind: 'Element' },
  Model,
  Message,
  InMessage,
  OutMessage,
  ChildInitContext: Schema.String,
})

export const {
  makeRequiredFieldBinding,
  makeComposition,
  makeFieldsStep,
  makeOutMessageFold,
  makeOutMessageStep,
} = SkillsEntryBlock
