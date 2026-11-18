import { Effect, Schema } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'
import { Http } from 'foldkit'
import { Form } from 'foldkit/experimental'
import { Rule, makeRules } from 'foldkit/fieldValidation'

const emailField = Form.field({
  schema: Schema.String,
  initial: '',
  validateOn: 'Blur',
  rules: makeRules({
    required: 'Enter an email',
    rules: [Rule.email('Enter a valid email')],
  }),
})
const saveAccount = (path: string, account: Readonly<{ email: string }>) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const request = yield* HttpClientRequest.bodyJson(
      HttpClientRequest.post(path),
      account,
    )
    yield* HttpClient.filterStatusOk(client).execute(request)
  }).pipe(
    Effect.mapError(() => 'Could not save your account'),
    Effect.provide(Http.layer),
  )
const registrationForm = Form.define({
  name: 'Registration',
  fields: {
    email: emailField,
    displayName: Form.field({
      schema: Schema.String,
      initial: '',
      rules: makeRules({ required: 'Enter a display name' }),
    }),
  },
  submit: {
    error: Schema.String,
    execute: values => saveAccount('/api/register', values),
  },
})
const profileForm = Form.define({
  name: 'Profile',
  fields: { email: emailField },
  submit: {
    error: Schema.String,
    execute: values => saveAccount('/api/profile', values),
  },
})
type RegistrationValues = Form.Values<typeof registrationForm>
const profileModel = profileForm.init({ email: 'reader@example.com' })
