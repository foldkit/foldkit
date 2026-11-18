import { Effect, Option, Schema } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'
import { Http } from 'foldkit'
import { Form } from 'foldkit/experimental'
import { makeRules } from 'foldkit/fieldValidation'
import { defineTaggedUnion } from 'foldkit/schema'

const Location = defineTaggedUnion({
  Unspecified: {},
  Coordinates: { latitude: Schema.Number, longitude: Schema.Number },
})
const preferencesForm = Form.define({
  name: 'Preferences',
  fields: {
    topics: Form.field({
      schema: Schema.Array(Schema.String),
      initial: [],
      rules: makeRules<ReadonlyArray<string>>({
        required: 'Choose a topic',
      }),
    }),
    selected: Form.field({
      schema: Schema.OptionFromNullOr(Schema.String),
      initial: null,
      rules: makeRules<Option.Option<string>>({
        required: 'Choose an item',
        isEmpty: Option.isNone,
      }),
    }),
    location: Form.field({
      schema: Location,
      initial: Location.Unspecified(),
    }),
  },
  submit: {
    error: Schema.String,
    execute: ({ topics, selected, location }) =>
      Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient
        const request = yield* HttpClientRequest.bodyJson(
          HttpClientRequest.post('/api/preferences'),
          { topics, selected: Option.getOrNull(selected), location },
        )
        yield* HttpClient.filterStatusOk(client).execute(request)
      }).pipe(
        Effect.mapError(() => 'Could not save your preferences'),
        Effect.provide(Http.layer),
      ),
  },
})
const preferencesModel = preferencesForm.init({ topics: ['Foldkit'] })
const topicsChange = preferencesForm.update(
  preferencesModel,
  preferencesForm.changed('topics', ['Foldkit', 'Effect']),
)
const selectedChange = preferencesForm.update(
  topicsChange.model,
  preferencesForm.changed('selected', 'Effect'),
)
