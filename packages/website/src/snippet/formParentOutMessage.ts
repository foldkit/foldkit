import { Effect, Schema } from 'effect'
import { HttpClient, HttpClientRequest, HttpClientResponse } from 'effect/http'
import { Http, Update } from 'foldkit'
import { Form } from 'foldkit/experimental'
import { defineMessageUnion } from 'foldkit/message'

const SignedUpUser = Schema.Struct({ userId: Schema.String })

const requestSignUp = (email: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const request = yield* HttpClientRequest.bodyJson(
      HttpClientRequest.post('/api/sign-up'),
      { email },
    )
    const response = yield* HttpClient.filterStatusOk(client).execute(request)
    return yield* HttpClientResponse.schemaBodyJson(SignedUpUser)(response)
  }).pipe(
    Effect.mapError(() => 'Sign-up failed'),
    Effect.provide(Http.layer),
  )

const signUpForm = Form.define({
  name: 'SignUp',
  fields: {
    email: Form.field({ schema: Schema.String, initial: '' }),
  },
  submit: {
    data: SignedUpUser,
    error: Schema.String,
    execute: ({ email }) => requestSignUp(email),
  },
})

export const Model = Schema.Struct({ form: signUpForm.Model })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotFormMessage: { message: signUpForm.Message },
  SubmittedSignUpForm: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  SignedUp: { userId: Schema.String },
})
export type OutMessage = typeof OutMessage.Type

const foldSignUpOutMessage = signUpForm.OutMessage.match<
  Update.StepWithOutMessage<Model, Message, OutMessage>
>({
  SucceededSubmit:
    ({ data }) =>
    stepModel => ({
      model: stepModel,
      outMessage: OutMessage.SignedUp({ userId: data.userId }),
    }),
  FailedSubmit: () => stepModel => ({ model: stepModel }),
})

// The third type argument is this Submodel's own OutMessage
const signUp = signUpForm.lift<Model, Message, OutMessage>({
  parentField: 'form',
  toParentMessage: message => Message.GotFormMessage({ message }),
  foldOutMessage: foldSignUpOutMessage,
})

export const update = (model: Model, message: Message) =>
  Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
    message,
    {
      GotFormMessage: ({ message }) => signUp.fold(model, message),
      SubmittedSignUpForm: () => signUp.submit()(model),
    },
  )
