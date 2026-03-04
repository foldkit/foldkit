import { Schema as S } from 'effect'
import { makeField } from 'foldkit/fieldValidation'

const StringField = makeField(S.String)
type StringField = typeof StringField.Union.Type

const Model = S.Struct({
  username: StringField.Union,
  email: StringField.Union,
})
type Model = typeof Model.Type
