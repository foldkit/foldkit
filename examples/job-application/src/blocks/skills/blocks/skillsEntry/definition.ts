import { Schema } from 'effect'
import { Block } from 'foldkit'
import { Field } from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'

import { makeBlock as makeRadioGroupBlock } from '@foldkit/ui/radioGroup'

import { ProficiencyLevel } from '../../../../domain'

export const ProficiencyRadioGroup =
  makeRadioGroupBlock<ProficiencyLevel.ProficiencyLevel>()

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

export const InMessage = defineMessageUnion({
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
  Init: Schema.Tuple([Schema.String]),
  view: { kind: 'Element' },
  Model,
  Message,
  InMessage,
  OutMessage,
  ChildInitContext: Schema.String,
})

export const { makeFieldsStep, makeOutMessageStep } = SkillsEntryBlock
