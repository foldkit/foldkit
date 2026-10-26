import { Schema } from 'effect'
import { Block } from 'foldkit'
import { Field } from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'

import { Session } from '../../../../domain/session'

export const Model = Schema.Struct({
  email: Field(Schema.String),
  password: Field(Schema.String),
  isSubmitting: Schema.Boolean,
})

export const Message = defineMessageUnion({
  ChangedEmail: { value: Schema.String },
  ChangedPassword: { value: Schema.String },
  SubmittedForm: {},
  SucceededSimulateAuthRequest: { session: Session },
  FailedSimulateAuthRequest: { error: Schema.String },
})

export const OutMessage = defineMessageUnion({
  SucceededLogin: { session: Session },
})

export const LoginDefinition = Block.makeDefinition('Login', {
  Model,
  Message,
  OutMessage,
})

export const { makeFieldsStep, makeOutMessageStep } = LoginDefinition
