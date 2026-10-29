import { Schema } from 'effect'
import { Field } from 'foldkit/fieldValidation'
import { defineTaggedUnion } from 'foldkit/schema'

export const Submission = defineTaggedUnion({
  NotSubmitted: {},
  Submitting: {},
  SubmitSuccess: { confirmationText: Schema.String },
  SubmitError: { error: Schema.String },
})
export type Submission = typeof Submission.Type

export const Model = Schema.Struct({
  name: Field(Schema.String),
  email: Field(Schema.String),
  messageText: Field(Schema.String),
  submission: Submission,
})
export type Model = typeof Model.Type
