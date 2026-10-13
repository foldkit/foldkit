import { Array, Effect, Option, Schema } from 'effect'
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
      initial: { value: [] },
      rules: makeRules<ReadonlyArray<string>>({
        required: 'Choose a topic',
        isEmpty: Array.isReadonlyArrayEmpty,
      }),
    }),
    selected: Form.field({
      schema: Schema.OptionFromNullOr(Schema.String),
      initial: { value: Option.none() },
      rules: makeRules<Option.Option<string>>({
        required: 'Choose an item',
        isEmpty: Option.isNone,
      }),
    }),
    location: Form.field({
      schema: Location,
      initial: { value: Location.Unspecified() },
    }),
    nickname: Form.field({
      schema: Schema.OptionFromOptionalKey(Schema.String),
      initial: { value: Option.none() },
    }),
  },
  submit: {
    error: Schema.String,
    execute: ({ topics, selected, location, nickname }) =>
      Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient
        const request = yield* HttpClientRequest.bodyJson(
          HttpClientRequest.post('/api/preferences'),
          {
            topics,
            selected: Option.getOrNull(selected),
            location,
            nickname: Option.getOrNull(nickname),
          },
        )
        yield* HttpClient.filterStatusOk(client).execute(request)
      }).pipe(
        Effect.mapError(() => 'Could not save your preferences'),
        Effect.provide(Http.layer),
      ),
  },
})
const preferencesModel = preferencesForm.init({
  topics: { value: ['Foldkit'] },
})
const topicsChange = preferencesForm.update(
  preferencesModel,
  preferencesForm.changed('topics', { value: ['Foldkit', 'Effect'] }),
)
const selectedChange = preferencesForm.update(
  topicsChange.model,
  preferencesForm.changed('selected', { value: Option.some('Effect') }),
)
const nicknameChange = preferencesForm.update(
  selectedChange.model,
  preferencesForm.changed('nickname', { value: Option.some('Reader') }),
)
const nicknameClear = preferencesForm.update(
  nicknameChange.model,
  preferencesForm.changed('nickname', { value: Option.none() }),
)
