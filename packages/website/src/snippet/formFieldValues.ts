import { Effect, Schema } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'
import { Http } from 'foldkit'
import { Form } from 'foldkit/experimental'

const accountFields = {
  username: Form.field({ schema: Schema.String, initial: '' }),
  displayName: Form.field({ schema: Schema.String, initial: '' }),
}

const toAccountChanges = (values: Form.FieldValues<typeof accountFields>) => ({
  username: values.username.toLowerCase(),
  display_name: values.displayName,
})

const saveAccount = (
  accountId: string,
  values: Form.FieldValues<typeof accountFields>,
) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const request = yield* HttpClientRequest.bodyJson(
      HttpClientRequest.patch(`/api/accounts/${accountId}`),
      toAccountChanges(values),
    )
    yield* HttpClient.filterStatusOk(client).execute(request)
  }).pipe(
    Effect.mapError(() => 'Could not save the account'),
    Effect.provide(Http.layer),
  )

const accountForm = Form.define({
  name: 'Account',
  fields: accountFields,
  submit: {
    error: Schema.String,
    context: Schema.Struct({ accountId: Schema.String }),
    execute: (values, { accountId }) => saveAccount(accountId, values),
  },
})
