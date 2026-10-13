import { Effect, Schema } from 'effect'
import { Form } from 'foldkit/experimental'
import * as DirectForm from 'foldkit/experimental/form'
import { defineMessageUnion } from 'foldkit/message'

const registration = Form.define({
  name: 'Registration',
  fields: { email: Form.field({ schema: Schema.String, initial: { value: '' } }) },
  submit: { execute: () => Effect.void },
})
const profile = DirectForm.define({
  name: 'Profile',
  fields: { email: DirectForm.field({ schema: Schema.String, initial: { value: '' } }) },
  submit: { execute: () => Effect.void },
})
const Message = defineMessageUnion({
  UpdatedRegistration: { message: registration.Message },
  UpdatedProfile: { message: profile.Message },
})
