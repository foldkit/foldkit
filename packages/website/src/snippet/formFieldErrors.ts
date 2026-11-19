import { Effect, Match, Schema } from 'effect'
import { HttpClient, HttpClientRequest, HttpClientResponse } from 'effect/http'
import { Http } from 'foldkit'
import { Form } from 'foldkit/experimental'

class EmailTaken extends Schema.TaggedError<EmailTaken>()('EmailTaken', {
  email: Schema.String,
}) {}

class InviteExpired extends Schema.TaggedError<InviteExpired>()(
  'InviteExpired',
  {},
) {}

class SignupUnavailable extends Schema.TaggedError<SignupUnavailable>()(
  'SignupUnavailable',
  {},
) {}

const CONFLICT_STATUS = 409

const SignupError = Schema.Union([EmailTaken, InviteExpired, SignupUnavailable])

const isSignupError = Schema.is(SignupError)

const signupFields = Form.defineFields({
  email: Form.field({ schema: Schema.String, initial: '' }),
  invite: Form.field({ schema: Schema.String, initial: '' }),
})

const signUp = (values: Form.FieldValues<typeof signupFields>) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const request = yield* HttpClientRequest.bodyJson(
      HttpClientRequest.post('/api/signup'),
      values,
    )
    const response = yield* client.execute(request)

    if (response.status === CONFLICT_STATUS) {
      const rejection =
        yield* HttpClientResponse.schemaBodyJson(SignupError)(response)
      return yield* Effect.fail(rejection)
    }

    yield* HttpClientResponse.filterStatusOk(response)
  }).pipe(
    Effect.mapError(error =>
      isSignupError(error) ? error : new SignupUnavailable(),
    ),
    Effect.provide(Http.layer),
  )

const signupForm = Form.define({
  name: 'Signup',
  fields: signupFields,
  submit: {
    error: SignupError,
    execute: signUp,
    toFieldErrors: error =>
      Match.value(error).pipe(
        Match.tagsExhaustive({
          EmailTaken: ({ email }) => ({
            email: `${email} is already registered`,
          }),
          InviteExpired: () => ({ invite: 'This invite has expired' }),
          SignupUnavailable: () => ({}),
        }),
      ),
  },
})
