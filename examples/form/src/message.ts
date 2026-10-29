import { Schema } from 'effect'
import { Field } from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  UpdatedName: { value: Schema.String },
  UpdatedEmail: { value: Schema.String },
  CompletedValidateEmail: { field: Field(Schema.String) },
  UpdatedMessageText: { value: Schema.String },
  ClickedFormSubmit: {},
  SucceededSubmitForm: { name: Schema.String },
  FailedSubmitForm: {},
})
export type Message = typeof Message.Type
