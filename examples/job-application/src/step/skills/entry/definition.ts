import { Schema } from 'effect'
import { Block } from 'foldkit'
import { Field } from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'

import { RadioGroup } from '@foldkit/ui'

import { ProficiencyLevel } from '../../../domain'

export const ProficiencyRadioGroup =
  RadioGroup.create<ProficiencyLevel.ProficiencyLevel>()

export const Model = Schema.Struct({
  id: Schema.String,
  name: Field(Schema.String),
  proficiency: ProficiencyLevel.ProficiencyLevel,
  proficiencyRadioGroup: ProficiencyRadioGroup.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedName: { value: Schema.String },
  GotProficiencyRadioGroupMessage: { message: ProficiencyRadioGroup.Message },
  ClickedRemoveSelf: {},
})

export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  Removed: {},
})

export type OutMessage = typeof OutMessage.Type

export type Removed = typeof OutMessage.Removed.Type

export const SkillsEntry = Block.define('SkillsEntry', {
  Model,
  Message,
  OutMessage,
  Startup: Schema.String,
})
