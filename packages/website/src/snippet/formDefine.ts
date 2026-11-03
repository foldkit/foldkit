import { Effect, Schema } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'
import { Http } from 'foldkit'
import { Form } from 'foldkit/experimental'
import { Rule, makeRules } from 'foldkit/fieldValidation'

const emailField = Form.field({
  schema: Schema.String,
  initial: { value: '' },
  validateOn: 'Blur',
  rules: makeRules({
    required: 'Enter an email',
    rules: [Rule.email('Enter a valid email')],
  }),
})
const saveEmail = (path: string, email: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const request = yield* HttpClientRequest.bodyJson(
      HttpClientRequest.post(path),
      { email },
    )
    yield* HttpClient.filterStatusOk(client).execute(request)
  }).pipe(
    Effect.mapError(() => 'Could not save your email'),
    Effect.provide(Http.layer),
  )
const registrationForm = Form.define({
  name: 'Registration',
  fields: {
    email: emailField,
    age: Form.field({
      schema: Schema.Number,
      initial: { value: 18 },
      rules: makeRules<number>({
        rules: [[age => age >= 18, 'Must be an adult']],
      }),
    }),
  },
  submit: {
    error: Schema.String,
    execute: ({ email }) => saveEmail('/api/register', email),
  },
})
const profileForm = Form.define({
  name: 'Profile',
  fields: { email: emailField },
  submit: {
    error: Schema.String,
    execute: ({ email }) => saveEmail('/api/profile', email),
  },
})
type RegistrationValues = Form.Values<typeof registrationForm>
const profileModel = profileForm.init({
  email: { value: 'reader@example.com' },
})
