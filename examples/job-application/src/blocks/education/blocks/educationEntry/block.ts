import { Schema } from 'effect'
import { Block } from 'foldkit'
import { Field } from 'foldkit/fieldValidation'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

import { Listbox } from '@foldkit/ui'

import type { ViewInputs } from './view'

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

export const EducationEntryKey = Symbol('EducationEntry')
export const EducationEntryBlock = Block.make('EducationEntry', {
  key: EducationEntryKey,
  InitArgs: Schema.Tuple([Schema.String]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
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
} = EducationEntryBlock
