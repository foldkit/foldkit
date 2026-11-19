import { Effect, Schema } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'
import { Http } from 'foldkit'
import { Form } from 'foldkit/experimental'

const accountFields = {
  username: Form.field({ schema: Schema.String, initial: '' }),
  displayName: Form.field({ schema: Schema.String, initial: '' }),
}

const toAccountBody = (values: Form.FieldValues<typeof accountFields>) => ({
  username: values.username.toLowerCase(),
  display_name: values.displayName,
})

const createAccount = (values: Form.FieldValues<typeof accountFields>) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const request = yield* HttpClientRequest.bodyJson(
      HttpClientRequest.post('/api/accounts'),
      toAccountBody(values),
    )
    yield* HttpClient.filterStatusOk(client).execute(request)
  }).pipe(
    Effect.mapError(() => 'Could not create the account'),
    Effect.provide(Http.layer),
  )

const accountForm = Form.define({
  name: 'Account',
  fields: accountFields,
  submit: {
    error: Schema.String,
    execute: createAccount,
  },
})
