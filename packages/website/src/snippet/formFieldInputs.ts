import { Effect, Option, Schema, SchemaTransformation, String } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'
import { Http } from 'foldkit'
import { Form } from 'foldkit/experimental'
import { makeRules } from 'foldkit/fieldValidation'

const MIN_AGE = 18

const AgeInput = Schema.Trim.check(
  Schema.isNonEmpty({ message: 'Enter your age' }),
).pipe(
  Schema.decodeTo(
    Schema.Finite.annotate({ message: 'Enter a number' }),
    SchemaTransformation.numberFromString,
  ),
)

const OptionalText = Schema.String.pipe(
  Schema.decodeTo(
    Schema.Option(Schema.String),
    SchemaTransformation.transform({
      decode: text =>
        String.isEmpty(text) ? Option.none() : Option.some(text),
      encode: Option.getOrElse(() => ''),
    }),
  ),
)

const saveMember = (
  member: Readonly<{ age: number; nickname: string | null }>,
) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const request = yield* HttpClientRequest.bodyJson(
      HttpClientRequest.post('/api/members'),
      member,
    )
    yield* HttpClient.filterStatusOk(client).execute(request)
  }).pipe(
    Effect.mapError(() => 'Could not save the member'),
    Effect.provide(Http.layer),
  )

const memberForm = Form.define({
  name: 'Member',
  fields: {
    age: Form.field({
      schema: AgeInput,
      initial: '',
      rules: makeRules<number>({
        rules: [[age => age >= MIN_AGE, 'Must be an adult']],
      }),
    }),
    nickname: Form.field({ schema: OptionalText, initial: '' }),
  },
  submit: {
    error: Schema.String,
    execute: ({ age, nickname: maybeNickname }) =>
      saveMember({ age, nickname: Option.getOrNull(maybeNickname) }),
  },
})

const memberModel = memberForm.init({ age: 42, nickname: Option.none() })

const ageChange = memberForm.update(
  memberModel,
  memberForm.changed('age', '12a'),
)

const ageFieldView = memberForm.fieldView(ageChange.model, 'age')
