import { Schema } from 'effect'
import { Block } from 'foldkit'
import { Field } from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'

import { RadioGroup } from '@foldkit/ui'

import { ProficiencyLevel } from '../../../domain'

export const ProficiencyRadioGroup =
  RadioGroup.create<typeof ProficiencyLevel.ProficiencyLevel.Type>()

export const Model = Schema.Struct({
  id: Schema.String,
  name: Field(Schema.String),
  proficiency: ProficiencyLevel.ProficiencyLevel,
  proficiencyRadioGroup: ProficiencyRadioGroup.Model,
})

export const Message = defineMessageUnion({
  UpdatedName: { value: Schema.String },
  RequestedRevealErrors: {},
  ClickedRemoveSelf: {},
})

export const OutMessage = defineMessageUnion({
  Removed: {},
})

export const SkillsEntryDefinition = Block.makeDefinition('SkillsEntry', {
  Model,
  Message,
  OutMessage,
  ChildInitContext: Schema.String,
})

export const { makeFieldsStep, makeOutMessageStep } = SkillsEntryDefinition
