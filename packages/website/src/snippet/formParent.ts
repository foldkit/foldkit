import { Effect, Schema } from 'effect'
import { HttpClient, HttpClientRequest, HttpClientResponse } from 'effect/http'
import { Http, Update } from 'foldkit'
import { Form } from 'foldkit/experimental'
import { defineMessageUnion } from 'foldkit/message'

const RegisteredUser = Schema.Struct({ userId: Schema.String })

export const registrationForm = Form.define({
  name: 'Registration',
  fields: {
    email: Form.field({ schema: Schema.String, initial: { value: '' } }),
  },
  submit: {
    data: RegisteredUser,
    error: Schema.String,
    execute: ({ email }) =>
      Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient
        const request = yield* HttpClientRequest.bodyJson(
          HttpClientRequest.post('/api/register'),
          { email },
        )
        const response =
          yield* HttpClient.filterStatusOk(client).execute(request)
        return yield* HttpClientResponse.schemaBodyJson(RegisteredUser)(
          response,
        )
      }).pipe(
        Effect.mapError(() => 'Registration request failed'),
        Effect.provide(Http.layer),
      ),
  },
})
export const Model = Schema.Struct({ registration: registrationForm.Model })
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  GotRegistrationMessage: { message: registrationForm.Message },
  SubmittedRegistration: {},
  ClickedReset: {},
})
export type Message = typeof Message.Type
const registration = registrationForm.lift<Model, Message>({
  parentField: 'registration',
  toParentMessage: message => Message.GotRegistrationMessage({ message }),
})
const init = () => ({
  model: Model.make({ registration: registrationForm.init() }),
})
const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotRegistrationMessage: ({ message }) => registration.fold(model, message),
    SubmittedRegistration: () => registration.submit(model),
    ClickedReset: () => registration.reset(model),
  })
