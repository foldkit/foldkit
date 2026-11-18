import { Effect, Option, Schema } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'
import { Http } from 'foldkit'
import { Form } from 'foldkit/experimental'
import { makeRules } from 'foldkit/fieldValidation'
import { defineTaggedUnion } from 'foldkit/schema'

const MeetupLocation = defineTaggedUnion({
  Unspecified: {},
  Coordinates: { latitude: Schema.Number, longitude: Schema.Number },
})

const ExperienceLevel = Schema.Literals(['Beginner', 'Intermediate', 'Expert'])

const savePreferences = (
  preferences: Readonly<{
    experienceLevel: typeof ExperienceLevel.Type
    topics: ReadonlyArray<string>
    favoriteTopic: string | null
    meetupLocation: typeof MeetupLocation.Type
  }>,
) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const request = yield* HttpClientRequest.bodyJson(
      HttpClientRequest.post('/api/preferences'),
      preferences,
    )
    yield* HttpClient.filterStatusOk(client).execute(request)
  }).pipe(
    Effect.mapError(() => 'Could not save your preferences'),
    Effect.provide(Http.layer),
  )

const preferencesForm = Form.define({
  name: 'Preferences',
  fields: {
    experienceLevel: Form.field({
      schema: Form.picked(ExperienceLevel, 'Choose your experience level'),
      initial: null,
    }),
    topics: Form.field({
      schema: Schema.Array(Schema.String),
      initial: [],
      rules: makeRules<ReadonlyArray<string>>({
        required: 'Choose a topic',
      }),
    }),
    favoriteTopic: Form.field({
      schema: Schema.OptionFromNullOr(Schema.String),
      initial: null,
      rules: makeRules<Option.Option<string>>({
        required: 'Choose a favorite topic',
        isEmpty: Option.isNone,
      }),
    }),
    meetupLocation: Form.field({
      schema: MeetupLocation,
      initial: MeetupLocation.Unspecified(),
    }),
  },
  submit: {
    error: Schema.String,
    execute: ({ experienceLevel, topics, favoriteTopic, meetupLocation }) =>
      savePreferences({
        experienceLevel,
        topics,
        favoriteTopic: Option.getOrNull(favoriteTopic),
        meetupLocation,
      }),
  },
})

const preferencesModel = preferencesForm.init({ topics: ['Foldkit'] })

const topicsChange = preferencesForm.update(
  preferencesModel,
  preferencesForm.changed('topics', ['Foldkit', 'Effect']),
)

const favoriteTopicChange = preferencesForm.update(
  topicsChange.model,
  preferencesForm.changed('favoriteTopic', 'Effect'),
)
