import { Schema } from 'effect'
import { Block } from 'foldkit'
import { Field } from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'

import { Listbox } from '@foldkit/ui'

export const GraduationYearListboxBlock = Listbox.makeBlock()

export const Model = Schema.Struct({
  id: Schema.String,
  school: Field(Schema.String),
  degree: Field(Schema.String),
  fieldOfStudy: Field(Schema.String),
  maybeGraduationYear: Schema.Option(Schema.String),
  graduationYearListbox: GraduationYearListboxBlock.Model,
  isCurrentlyEnrolled: Schema.Boolean,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedSchool: { value: Schema.String },
  UpdatedDegree: { value: Schema.String },
  UpdatedFieldOfStudy: { value: Schema.String },
  ToggledCurrentlyEnrolled: { isChecked: Schema.Boolean },
  RequestedRevealErrors: {},
  ClickedRemoveSelf: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  Removed: {},
})
export type OutMessage = typeof OutMessage.Type

export const EducationEntryDefinition = Block.makeDefinition('EducationEntry', {
  Model,
  Message,
  OutMessage,
  ChildInitContext: Schema.String,
})

export const { makeFieldsStep, makeOutMessageStep } = EducationEntryDefinition
