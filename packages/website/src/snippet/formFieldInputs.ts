import { Effect, Option, Schema, SchemaTransformation } from 'effect'
import { Form } from 'foldkit/experimental'
import { makeRules } from 'foldkit/fieldValidation'

const AgeInput = Schema.String.check(
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
      decode: text => (text === '' ? Option.none() : Option.some(text)),
      encode: Option.getOrElse(() => ''),
    }),
  ),
)
const memberForm = Form.define({
  name: 'Member',
  fields: {
    age: Form.field({
      schema: AgeInput,
      initial: '',
      rules: makeRules<number>({
        rules: [[age => age >= 18, 'Must be an adult']],
      }),
    }),
    nickname: Form.field({ schema: OptionalText, initial: '' }),
  },
  submit: {
    execute: ({ age, nickname }) =>
      Effect.log(
        `Age ${age}, nickname ${Option.getOrElse(nickname, () => '')}`,
      ),
  },
})
const memberModel = memberForm.init({ age: 42, nickname: Option.none() })
const ageChange = memberForm.update(
  memberModel,
  memberForm.changed('age', '12a'),
)
const age = memberForm.field(ageChange.model, 'age')
